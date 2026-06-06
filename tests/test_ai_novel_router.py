from pathlib import Path

from fastapi import FastAPI
from fastapi.testclient import TestClient

from server.auth import CurrentUserInfo, get_current_user
from server.routers import ai_novel

SAMPLE_NOVEL = """
第 1 章 雨夜钥匙
林澈在老街尽头收到一封没有署名的信。信封里只有一张旧剧票和一把铜钥匙。

第 2 章 旧剧院
许岚陪他推开海棠剧院的大门。舞台深处传来仍在运转的钟声。

第 3 章 舞台对峙
顾衣站在追光灯下，要求林澈交出钥匙，并说那些记忆不该回来。
""".strip()


class _FakePM:
    def __init__(self, base: Path):
        self.base = base
        self.projects = {}
        self.scripts = {}

    def generate_project_name(self, title):
        return "novel-aa11bb22"

    def create_project(self, name, content_mode="drama"):
        (self.base / name / "source").mkdir(parents=True, exist_ok=True)
        (self.base / name / "scripts").mkdir(parents=True, exist_ok=True)

    def create_project_metadata(
        self,
        name,
        title,
        style,
        content_mode,
        aspect_ratio="16:9",
        default_duration=None,
        style_template_id=None,
        extras=None,
    ):
        payload = {
            "title": title,
            "style": style,
            "content_mode": content_mode,
            "aspect_ratio": aspect_ratio,
            "episodes": [],
            "characters": {},
            "scenes": {},
            "props": {},
        }
        if extras:
            payload.update(extras)
        self.projects[name] = payload
        return payload

    def get_project_path(self, name):
        return self.base / name

    def save_script(self, name, payload, filename=None, validate=True):
        self.scripts[(name, filename)] = payload
        self.projects[name]["episodes"] = [{"episode": 1, "title": payload["title"], "script_file": f"scripts/{filename}"}]
        return self.base / name / "scripts" / filename

    def save_project(self, name, payload):
        self.projects[name] = payload


def _client(monkeypatch, fake_pm):
    monkeypatch.setattr(ai_novel, "get_project_manager", lambda: fake_pm)
    app = FastAPI()
    app.dependency_overrides[get_current_user] = lambda: CurrentUserInfo(id="default", sub="testuser", role="admin")
    app.include_router(ai_novel.router, prefix="/api/v1")
    return TestClient(app)


def test_validate_chapters_endpoint_reports_detected_chapters(tmp_path, monkeypatch):
    client = _client(monkeypatch, _FakePM(tmp_path))

    response = client.post("/api/v1/ai-novel/validate-chapters", json={"source_text": SAMPLE_NOVEL})

    assert response.status_code == 200
    assert response.json()["valid"] is True
    assert response.json()["chapter_count"] == 3


def test_convert_endpoint_returns_yaml_and_schema_payload(tmp_path, monkeypatch):
    client = _client(monkeypatch, _FakePM(tmp_path))

    response = client.post(
        "/api/v1/ai-novel/convert",
        json={"title": "雨夜旧剧院", "source_text": SAMPLE_NOVEL},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["chapter_count"] == 3
    assert body["screenplay"]["title"] == "雨夜旧剧院"
    assert "source_chapters:" in body["yaml_text"]


def test_create_project_endpoint_persists_yaml_and_arcreel_script(tmp_path, monkeypatch):
    fake_pm = _FakePM(tmp_path)
    client = _client(monkeypatch, fake_pm)

    response = client.post(
        "/api/v1/ai-novel/projects",
        json={"title": "雨夜旧剧院", "source_text": SAMPLE_NOVEL},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["name"] == "novel-aa11bb22"
    assert body["yaml_filename"] == "ai_novel_screenplay.yaml"
    assert (tmp_path / "novel-aa11bb22" / "source" / "ai_novel_screenplay.yaml").exists()
    assert fake_pm.scripts[("novel-aa11bb22", "ai_novel_episode_1.json")]["content_mode"] == "drama"
    assert fake_pm.projects["novel-aa11bb22"]["metadata"]["tool"] == "AI Novel"
