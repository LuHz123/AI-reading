from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass
from typing import Any

import yaml
from pydantic import BaseModel, Field, model_validator

from lib.text_backends.base import TextGenerationRequest, TextTaskType
from lib.text_generator import TextGenerator

MAX_NOVEL_CHARS = 500_000
MIN_CHAPTERS = 3

logger = logging.getLogger(__name__)


class SourceChapter(BaseModel):
    number: int = Field(ge=1)
    title: str = Field(min_length=1, max_length=120)
    summary: str = Field(min_length=1, max_length=500)


class ScreenplayCharacter(BaseModel):
    id: str = Field(pattern=r"^char_[a-z0-9_]+$")
    name: str = Field(min_length=1, max_length=80)
    role: str = Field(min_length=1, max_length=80)
    description: str = Field(min_length=1, max_length=300)


class DialogueLine(BaseModel):
    character: str = Field(pattern=r"^char_[a-z0-9_]+$")
    emotion: str = Field(min_length=1, max_length=80)
    line: str = Field(min_length=1, max_length=500)


class ScreenplayScene(BaseModel):
    id: str = Field(pattern=r"^scene_[0-9]{3}$")
    source_chapter: int = Field(ge=1)
    title: str = Field(min_length=1, max_length=120)
    location: str = Field(min_length=1, max_length=120)
    time: str = Field(min_length=1, max_length=80)
    summary: str = Field(min_length=1, max_length=500)
    characters: list[str] = Field(min_length=1)
    dialogues: list[DialogueLine] = Field(min_length=1)
    actions: list[str] = Field(min_length=1)


class NovelScreenplay(BaseModel):
    title: str = Field(min_length=1, max_length=160)
    logline: str = Field(min_length=1, max_length=300)
    language: str = Field(min_length=2, max_length=20)
    target_format: str = Field(min_length=1, max_length=40)
    source_chapters: list[SourceChapter] = Field(min_length=MIN_CHAPTERS)
    characters: list[ScreenplayCharacter] = Field(min_length=1)
    scenes: list[ScreenplayScene] = Field(min_length=1)

    @model_validator(mode="after")
    def validate_references(self) -> NovelScreenplay:
        chapter_numbers = {chapter.number for chapter in self.source_chapters}
        character_ids = {character.id for character in self.characters}
        for scene in self.scenes:
            if scene.source_chapter not in chapter_numbers:
                raise ValueError(f"scene {scene.id} references an unknown source chapter")
            missing_scene_characters = set(scene.characters) - character_ids
            if missing_scene_characters:
                raise ValueError(f"scene {scene.id} references unknown characters: {sorted(missing_scene_characters)}")
            for dialogue in scene.dialogues:
                if dialogue.character not in character_ids:
                    raise ValueError(f"scene {scene.id} dialogue references unknown character: {dialogue.character}")
        return self


@dataclass(frozen=True)
class ParsedChapter:
    number: int
    title: str
    content: str
    summary: str


@dataclass(frozen=True)
class ConversionResult:
    screenplay: NovelScreenplay
    yaml_text: str
    chapter_count: int


def _dump_screenplay_yaml(screenplay: NovelScreenplay) -> str:
    return yaml.safe_dump(
        screenplay.model_dump(),
        allow_unicode=True,
        sort_keys=False,
        width=1000,
    )


_CHAPTER_RE = re.compile(
    r"(?m)^\s*(?:#{1,6}\s*)?(?P<label>(?:第\s*(?P<cn_number>[0-9一二三四五六七八九十百千]+)\s*[章节回幕卷])|(?:Chapter\s+(?P<en_number>\d+)))\s*[:：.-]?\s*(?P<title>[^\n]*)$",
    re.IGNORECASE,
)
_SENTENCE_RE = re.compile(r"[^。！？!?；;\n]+[。！？!?；;]?")
_NAME_BEFORE_VERB_RE = re.compile(
    r"([\u4e00-\u9fff]{2,4})(?=在|收到|陪|推开|站在|要求|说|问|回答|递|拿|发现|进入|离开|看见|走向|回头|交出)"
)
_NAME_AFTER_WITH_RE = re.compile(r"(?:和|与|陪)([\u4e00-\u9fff]{2,4})")


def _parse_number(value: str | None, fallback: int) -> int:
    if not value:
        return fallback
    value = value.strip()
    if value.isdigit():
        return int(value)
    digits = {"一": 1, "二": 2, "三": 3, "四": 4, "五": 5, "六": 6, "七": 7, "八": 8, "九": 9}
    if value == "十":
        return 10
    if value.startswith("十"):
        return 10 + digits.get(value[1:], 0)
    if value.endswith("十"):
        return digits.get(value[:-1], 1) * 10
    if "十" in value:
        left, right = value.split("十", 1)
        return digits.get(left, 1) * 10 + digits.get(right, 0)
    return digits.get(value, fallback)


def _clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def _summarize(content: str, limit: int = 120) -> str:
    cleaned = _clean_text(content)
    if not cleaned:
        return "本章需要作者补充正文内容。"
    return cleaned if len(cleaned) <= limit else cleaned[: limit - 1].rstrip() + "…"


def parse_novel_chapters(source_text: str) -> list[ParsedChapter]:
    if len(source_text) > MAX_NOVEL_CHARS:
        raise ValueError(f"小说正文不能超过 {MAX_NOVEL_CHARS} 字")

    matches = list(_CHAPTER_RE.finditer(source_text))
    chapters: list[ParsedChapter] = []
    for index, match in enumerate(matches):
        content_start = match.end()
        content_end = matches[index + 1].start() if index + 1 < len(matches) else len(source_text)
        raw_content = source_text[content_start:content_end].strip()
        title = match.group("title").strip() or match.group("label").strip()
        number = _parse_number(match.group("cn_number") or match.group("en_number"), index + 1)
        chapters.append(
            ParsedChapter(
                number=number,
                title=title,
                content=raw_content,
                summary=_summarize(raw_content),
            )
        )

    if len(chapters) < MIN_CHAPTERS:
        raise ValueError("请提供至少 3 章小说文本，并使用“第 1 章”或“Chapter 1”这类章节标题。")
    return chapters


def _extract_names(chapters: list[ParsedChapter]) -> list[str]:
    names: list[str] = []
    seen: set[str] = set()
    blocked = {"一个", "一封", "没有", "只有", "那些", "记忆", "舞台", "剧院", "深处", "老街", "钥匙"}
    for chapter in chapters:
        for pattern in (_NAME_BEFORE_VERB_RE, _NAME_AFTER_WITH_RE):
            for match in pattern.finditer(chapter.content):
                name = match.group(1).strip()
                if name in blocked or name in seen:
                    continue
                seen.add(name)
                names.append(name)
                if len(names) >= 6:
                    return names
    return names or ["主角"]


def _first_sentence(content: str) -> str:
    for match in _SENTENCE_RE.finditer(content):
        sentence = _clean_text(match.group(0))
        if sentence:
            return sentence
    return _summarize(content, 80)


def _scene_location(title: str, content: str) -> str:
    for marker in ("剧院", "舞台", "老街", "房间", "街", "门", "桥", "城", "学校", "办公室"):
        if marker in title or marker in content:
            return f"{marker}附近"
    return "未定场景"


def convert_novel_to_screenplay(
    *,
    title: str,
    source_text: str,
    target_format: str = "电影剧本",
    language: str = "zh-CN",
) -> ConversionResult:
    chapters = parse_novel_chapters(source_text)
    names = _extract_names(chapters)
    characters = [
        ScreenplayCharacter(
            id=f"char_{index:03d}",
            name=name,
            role="主角" if index == 1 else "配角",
            description=f"从小说章节中抽取的角色：{name}。后续可继续补充人物小传、动机和表演提示。",
        )
        for index, name in enumerate(names, start=1)
    ]
    default_character = characters[0].id

    scenes: list[ScreenplayScene] = []
    for index, chapter in enumerate(chapters, start=1):
        scene_character_ids = [character.id for character in characters[: min(3, len(characters))]]
        first_line = _first_sentence(chapter.content)
        scenes.append(
            ScreenplayScene(
                id=f"scene_{index:03d}",
                source_chapter=chapter.number,
                title=chapter.title,
                location=_scene_location(chapter.title, chapter.content),
                time="未定",
                summary=chapter.summary,
                characters=scene_character_ids or [default_character],
                dialogues=[
                    DialogueLine(
                        character=scene_character_ids[0] if scene_character_ids else default_character,
                        emotion="克制",
                        line=first_line,
                    )
                ],
                actions=[chapter.summary],
            )
        )

    screenplay = NovelScreenplay(
        title=title.strip() or "未命名剧本",
        logline=f"根据 {len(chapters)} 章小说自动生成的 {target_format} YAML 剧本初稿。",
        language=language,
        target_format=target_format,
        source_chapters=[
            SourceChapter(number=chapter.number, title=chapter.title, summary=chapter.summary)
            for chapter in chapters
        ],
        characters=characters,
        scenes=scenes,
    )
    yaml_text = _dump_screenplay_yaml(screenplay)
    return ConversionResult(screenplay=screenplay, yaml_text=yaml_text, chapter_count=len(chapters))


def _strip_ai_payload(text: str) -> str:
    cleaned = text.strip()
    fence = re.search(r"```(?:json|ya?ml)?\s*(?P<body>.*?)```", cleaned, re.IGNORECASE | re.DOTALL)
    if fence:
        return fence.group("body").strip()
    if cleaned.startswith("{") and cleaned.endswith("}"):
        return cleaned
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start >= 0 and end > start:
        return cleaned[start : end + 1]
    return cleaned


def _load_screenplay_payload(text: str) -> dict[str, Any]:
    payload_text = _strip_ai_payload(text)
    try:
        loaded = json.loads(payload_text)
    except json.JSONDecodeError:
        loaded = yaml.safe_load(payload_text)
    if not isinstance(loaded, dict):
        raise ValueError("AI model did not return an object payload")
    return loaded


def _chapters_for_prompt(chapters: list[ParsedChapter]) -> str:
    return "\n".join(
        f"Chapter {chapter.number}: {chapter.title}\n"
        f"Summary: {chapter.summary}\n"
        f"Content: {chapter.content}"
        for chapter in chapters
    )


def _build_ai_conversion_prompt(
    *,
    title: str,
    source_text: str,
    target_format: str,
    language: str,
    chapters: list[ParsedChapter],
) -> str:
    return (
        "Convert the following novel chapters into an editable structured screenplay draft.\n"
        "Return only JSON that matches the provided schema. Do not include markdown.\n"
        "Requirements:\n"
        f"- Title: {title.strip() or 'Untitled'}\n"
        f"- Target format: {target_format}\n"
        f"- Language: {language}\n"
        f"- Preserve all {len(chapters)} detected source chapters in source_chapters.\n"
        "- Create cinematic scenes with location, time, summary, character ids, dialogue, and actions.\n"
        "- Character ids must use char_lowercase_name format.\n"
        "- Scene ids must use scene_001, scene_002, and so on.\n"
        "- Keep the result concise enough for an author to edit further.\n\n"
        "Detected chapters:\n"
        f"{_chapters_for_prompt(chapters)}\n\n"
        "Full source text:\n"
        f"{source_text}"
    )


async def convert_novel_to_screenplay_ai_first(
    *,
    title: str,
    source_text: str,
    target_format: str = "screenplay",
    language: str = "zh-CN",
    project_name: str | None = None,
) -> ConversionResult:
    chapters = parse_novel_chapters(source_text)
    try:
        generator = await TextGenerator.create(TextTaskType.SCRIPT, project_name=project_name)
        result = await generator.generate(
            TextGenerationRequest(
                prompt=_build_ai_conversion_prompt(
                    title=title,
                    source_text=source_text,
                    target_format=target_format,
                    language=language,
                    chapters=chapters,
                ),
                response_schema=NovelScreenplay,
                system_prompt=(
                    "You are AI Novel, a screenplay adaptation assistant. "
                    "Produce schema-valid structured screenplay drafts for authors."
                ),
                max_output_tokens=12000,
            ),
            project_name=project_name,
        )
        screenplay = NovelScreenplay.model_validate(_load_screenplay_payload(result.text))
        if len(screenplay.source_chapters) < len(chapters):
            raise ValueError("AI model omitted one or more source chapters")
        return ConversionResult(
            screenplay=screenplay,
            yaml_text=_dump_screenplay_yaml(screenplay),
            chapter_count=len(chapters),
        )
    except Exception:
        logger.warning("AI Novel text model conversion failed; falling back to local screenplay draft rules.")
        return convert_novel_to_screenplay(
            title=title,
            source_text=source_text,
            target_format=target_format,
            language=language,
        )


def screenplay_to_arcreel_script(screenplay: NovelScreenplay) -> dict:
    total_duration = max(6 * len(screenplay.scenes), 6)
    character_names = {character.id: character.name for character in screenplay.characters}
    return {
        "episode": 1,
        "title": screenplay.title,
        "content_mode": "drama",
        "duration_seconds": total_duration,
        "schema_version": 1,
        "novel": {
            "title": screenplay.title,
            "chapter": f"{len(screenplay.source_chapters)} chapters",
        },
        "scenes": [
            {
                "scene_id": scene.id,
                "duration_seconds": 6,
                "segment_break": True,
                "characters_in_scene": [character_names.get(character_id, character_id) for character_id in scene.characters],
                "scenes": [scene.location],
                "props": [],
                "image_prompt": f"{scene.location}，{scene.summary}",
                "video_prompt": "；".join(scene.actions),
                "transition_to_next": "cut",
                "note": scene.summary,
            }
            for scene in screenplay.scenes
        ],
    }


def screenplay_assets(screenplay: NovelScreenplay) -> tuple[dict[str, dict[str, str]], dict[str, dict[str, str]]]:
    characters = {
        character.name: {"description": character.description}
        for character in screenplay.characters
    }
    scenes = {
        scene.location: {"description": scene.summary}
        for scene in screenplay.scenes
    }
    return characters, scenes
