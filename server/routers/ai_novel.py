from __future__ import annotations

import asyncio
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, field_validator

from lib.project_change_hints import project_change_source
from server.ai_novel import (
    MAX_NOVEL_CHARS,
    ConversionResult,
    NovelScreenplay,
    convert_novel_to_screenplay_ai_first,
    parse_novel_chapters,
    screenplay_assets,
    screenplay_to_arcreel_script,
)
from server.auth import CurrentUser
from server.routers import projects as projects_router

router = APIRouter()


class NovelTextRequest(BaseModel):
    source_text: str = Field(min_length=1, max_length=MAX_NOVEL_CHARS)

    @field_validator("source_text")
    @classmethod
    def source_text_must_not_be_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("小说正文不能为空")
        return value


class NovelConvertRequest(NovelTextRequest):
    title: str = Field(default="未命名剧本", max_length=160)
    target_format: str = Field(default="电影剧本", min_length=1, max_length=40)
    language: str = Field(default="zh-CN", min_length=2, max_length=20)


class NovelProjectRequest(NovelConvertRequest):
    name: str | None = Field(default=None, max_length=80)


class NovelConvertResponse(BaseModel):
    success: bool
    screenplay: NovelScreenplay
    yaml_text: str
    chapter_count: int


def get_project_manager():
    return projects_router.get_project_manager()


@router.post("/ai-novel/validate-chapters")
async def validate_chapters(req: NovelTextRequest, _user: CurrentUser):
    try:
        chapters = await asyncio.to_thread(parse_novel_chapters, req.source_text)
        return {
            "valid": True,
            "chapter_count": len(chapters),
            "chapters": [
                {
                    "number": chapter.number,
                    "title": chapter.title,
                    "summary": chapter.summary,
                }
                for chapter in chapters
            ],
        }
    except ValueError as exc:
        return {"valid": False, "chapter_count": 0, "error": str(exc), "chapters": []}


@router.post("/ai-novel/convert", response_model=NovelConvertResponse)
async def convert(req: NovelConvertRequest, _user: CurrentUser):
    try:
        result = await convert_novel_to_screenplay_ai_first(
            title=req.title,
            source_text=req.source_text,
            target_format=req.target_format,
            language=req.language,
        )
        return NovelConvertResponse(
            success=True,
            screenplay=result.screenplay,
            yaml_text=result.yaml_text,
            chapter_count=result.chapter_count,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.post("/ai-novel/projects")
async def create_novel_project(req: NovelProjectRequest, _user: CurrentUser):
    try:
        result = await convert_novel_to_screenplay_ai_first(
            title=req.title,
            source_text=req.source_text,
            target_format=req.target_format,
            language=req.language,
            project_name=req.name,
        )

        def _sync(result: ConversionResult):
            manager = get_project_manager()
            title = (req.title or result.screenplay.title).strip() or "未命名剧本"
            project_name = (req.name or "").strip() or manager.generate_project_name(title)

            try:
                manager.create_project(project_name, content_mode="drama")
            except FileExistsError as exc:
                raise HTTPException(status_code=400, detail=f"项目已存在: {project_name}") from exc

            with project_change_source("ai-novel"):
                project = manager.create_project_metadata(
                    project_name,
                    title,
                    "AI Novel YAML screenplay workflow",
                    "drama",
                    aspect_ratio="16:9",
                    extras={
                        "generation_mode": "storyboard",
                    },
                )

            characters, scenes = screenplay_assets(result.screenplay)
            project["characters"] = characters
            project["scenes"] = scenes
            metadata = dict(project.get("metadata") or {})
            metadata["tool"] = "AI Novel"
            metadata["ai_novel"] = {
                "chapter_count": result.chapter_count,
                "target_format": req.target_format,
                "language": req.language,
                "yaml_file": "source/ai_novel_screenplay.yaml",
            }
            project["metadata"] = metadata
            project["episodes"] = [
                {
                    "episode": 1,
                    "title": result.screenplay.title,
                    "script_file": "scripts/ai_novel_episode_1.json",
                    "generation_mode": "storyboard",
                }
            ]
            manager.save_project(project_name, project)

            project_dir = Path(manager.get_project_path(project_name))
            source_dir = project_dir / "source"
            source_dir.mkdir(parents=True, exist_ok=True)
            (source_dir / "novel_source.txt").write_text(req.source_text, encoding="utf-8")
            (source_dir / "ai_novel_screenplay.yaml").write_text(result.yaml_text, encoding="utf-8")

            script = screenplay_to_arcreel_script(result.screenplay)
            manager.save_script(project_name, script, "ai_novel_episode_1.json", validate=False)

            return {
                "success": True,
                "name": project_name,
                "project": project,
                "screenplay": result.screenplay.model_dump(),
                "yaml_text": result.yaml_text,
                "yaml_filename": "ai_novel_screenplay.yaml",
                "script_filename": "ai_novel_episode_1.json",
                "chapter_count": result.chapter_count,
            }

        return await asyncio.to_thread(_sync, result)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except HTTPException:
        raise
