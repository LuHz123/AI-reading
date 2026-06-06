import json
from types import SimpleNamespace

import pytest
from pydantic import ValidationError

import server.ai_novel as ai_novel
from lib.text_backends.base import TextTaskType
from server.ai_novel import (
    NovelScreenplay,
    convert_novel_to_screenplay,
    convert_novel_to_screenplay_ai_first,
    parse_novel_chapters,
    screenplay_to_arcreel_script,
)

SAMPLE_NOVEL = """
第 1 章 雨夜钥匙
林澈在老街尽头收到一封没有署名的信。信封里只有一张旧剧票和一把铜钥匙。

第 2 章 旧剧院
许岚陪他推开海棠剧院的大门。舞台深处传来仍在运转的钟声。

第 3 章 舞台对峙
顾衣站在追光灯下，要求林澈交出钥匙，并说那些记忆不该回来。
""".strip()


def test_parse_novel_chapters_requires_at_least_three_chapters():
    with pytest.raises(ValueError, match="至少 3 章"):
        parse_novel_chapters("第 1 章 开端\n只有一章")


def test_convert_novel_to_screenplay_returns_schema_valid_yaml_payload():
    result = convert_novel_to_screenplay(
        title="雨夜旧剧院",
        source_text=SAMPLE_NOVEL,
        target_format="电影剧本",
        language="zh-CN",
    )

    assert result.screenplay.title == "雨夜旧剧院"
    assert result.chapter_count == 3
    assert len(result.screenplay.source_chapters) == 3
    assert len(result.screenplay.scenes) == 3
    assert "source_chapters:" in result.yaml_text
    assert "scenes:" in result.yaml_text


def test_screenplay_rejects_scene_character_references_not_in_character_table():
    result = convert_novel_to_screenplay(
        title="雨夜旧剧院",
        source_text=SAMPLE_NOVEL,
        target_format="电影剧本",
        language="zh-CN",
    )
    payload = result.screenplay.model_dump()
    payload["scenes"][0]["characters"] = ["missing_character"]

    with pytest.raises(ValidationError):
        type(result.screenplay).model_validate(payload)


def test_screenplay_to_arcreel_script_creates_drama_scene_payload():
    result = convert_novel_to_screenplay(
        title="雨夜旧剧院",
        source_text=SAMPLE_NOVEL,
        target_format="短剧",
        language="zh-CN",
    )

    script = screenplay_to_arcreel_script(result.screenplay)

    assert script["content_mode"] == "drama"
    assert script["episode"] == 1
    assert len(script["scenes"]) == 3
    assert script["scenes"][0]["scene_id"] == "scene_001"
    assert script["scenes"][0]["transition_to_next"] == "cut"


ASCII_SAMPLE_NOVEL = """
Chapter 1: The Letter
Mira receives a letter and hides it under the lamp.
Chapter 2: The Theater
Jon walks into the empty theater and hears the clock.
Chapter 3: The Choice
Mira asks Jon to choose between the key and the truth.
""".strip()


@pytest.mark.asyncio
async def test_ai_first_conversion_uses_configured_text_generator(monkeypatch):
    ai_payload = {
        "title": "AI Draft",
        "logline": "A generated screenplay draft.",
        "language": "zh-CN",
        "target_format": "short drama",
        "source_chapters": [
            {"number": 1, "title": "One", "summary": "Chapter one."},
            {"number": 2, "title": "Two", "summary": "Chapter two."},
            {"number": 3, "title": "Three", "summary": "Chapter three."},
        ],
        "characters": [
            {
                "id": "char_main",
                "name": "Main",
                "role": "lead",
                "description": "The lead character.",
            }
        ],
        "scenes": [
            {
                "id": "scene_001",
                "source_chapter": 1,
                "title": "Opening",
                "location": "Theater",
                "time": "Night",
                "summary": "The story opens.",
                "characters": ["char_main"],
                "dialogues": [
                    {"character": "char_main", "emotion": "calm", "line": "We begin."}
                ],
                "actions": ["Main enters."],
            }
        ],
    }
    calls = []

    class FakeTextGenerator:
        @classmethod
        async def create(cls, task_type, project_name=None):
            calls.append(("create", task_type, project_name))
            return cls()

        async def generate(self, request, project_name=None):
            calls.append(("generate", request, project_name))
            return SimpleNamespace(text=json.dumps(ai_payload))

    monkeypatch.setattr(ai_novel, "TextGenerator", FakeTextGenerator)

    result = await convert_novel_to_screenplay_ai_first(
        title="Input Title",
        source_text=ASCII_SAMPLE_NOVEL,
        target_format="short drama",
        language="zh-CN",
        project_name="proj-ai",
    )

    assert calls[0] == ("create", TextTaskType.SCRIPT, "proj-ai")
    assert calls[1][1].response_schema is NovelScreenplay
    assert result.screenplay.title == "AI Draft"
    assert result.chapter_count == 3
    assert "AI Draft" in result.yaml_text


@pytest.mark.asyncio
async def test_ai_first_conversion_falls_back_to_local_rules_when_model_fails(monkeypatch):
    class FailingTextGenerator:
        @classmethod
        async def create(cls, task_type, project_name=None):
            return cls()

        async def generate(self, request, project_name=None):
            raise RuntimeError("model unavailable")

    monkeypatch.setattr(ai_novel, "TextGenerator", FailingTextGenerator)

    result = await convert_novel_to_screenplay_ai_first(
        title="Fallback Title",
        source_text=ASCII_SAMPLE_NOVEL,
        target_format="short drama",
        language="zh-CN",
    )

    assert result.screenplay.title == "Fallback Title"
    assert result.chapter_count == 3
    assert "source_chapters:" in result.yaml_text
