"""Upload this clean package to a GitHub repository via the GitHub REST API.

Usage:
    set GH_TOKEN=github_pat_xxx
    python scripts/upload_to_github.py

The script creates the repository when it does not exist and commits all files
in this directory to the default branch. It does not require git.
"""

from __future__ import annotations

import base64
import json
import os
import sys
import time
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

OWNER = "LuHz123"
REPO = "AI-reading"
BRANCH = "main"
COMMIT_MESSAGE = "feat: add AI Novel novel-to-screenplay tool"

ROOT = Path(__file__).resolve().parents[1]
API = "https://api.github.com"

SKIP_PARTS = {
    ".git",
    ".venv",
    ".pytest_cache",
    ".ruff_cache",
    "node_modules",
    "dist",
    ".vite",
    "projects",
    "logs",
    "vertex_keys",
    ".codex",
    ".worktrees",
    ".claude",
    ".agents",
}
SKIP_FILES = {".env", ".env.local"}


def token() -> str:
    value = os.environ.get("GH_TOKEN") or os.environ.get("GITHUB_TOKEN")
    if not value:
        raise SystemExit("Set GH_TOKEN or GITHUB_TOKEN first.")
    return value.strip()


def request(method: str, path: str, body: dict | None = None) -> dict:
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = Request(
        f"{API}{path}",
        data=data,
        method=method,
        headers={
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {token()}",
            "X-GitHub-Api-Version": "2022-11-28",
            "Content-Type": "application/json",
            "User-Agent": "AI-Novel-upload-script",
        },
    )
    last_error: Exception | None = None
    for attempt in range(1, 6):
        try:
            with urlopen(req, timeout=90) as resp:
                raw = resp.read().decode("utf-8")
                return json.loads(raw) if raw else {}
        except HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            if exc.code not in {429, 500, 502, 503, 504}:
                raise RuntimeError(
                    f"{method} {path} failed: {exc.code} {detail}"
                ) from exc
            last_error = RuntimeError(
                f"{method} {path} failed: {exc.code} {detail}"
            )
        except URLError as exc:
            last_error = exc
        if attempt < 5:
            time.sleep(2**attempt)
    raise RuntimeError(f"{method} {path} failed after retries: {last_error}")


def request_or_none(method: str, path: str, body: dict | None = None) -> dict | None:
    try:
        return request(method, path, body)
    except RuntimeError as exc:
        if "failed: 404 " in str(exc):
            return None
        raise


def ensure_repo() -> dict:
    repo = request_or_none("GET", f"/repos/{OWNER}/{REPO}")
    if repo:
        return repo
    return request(
        "POST",
        "/user/repos",
        {
            "name": REPO,
            "private": False,
            "description": "AI Novel novel-to-screenplay YAML workspace",
            "auto_init": False,
        },
    )


def iter_files() -> list[Path]:
    files: list[Path] = []
    for path in ROOT.rglob("*"):
        if not path.is_file():
            continue
        rel = path.relative_to(ROOT)
        if any(part in SKIP_PARTS for part in rel.parts):
            continue
        if path.name in SKIP_FILES:
            continue
        files.append(rel)
    return sorted(files, key=lambda p: str(p).replace("\\", "/"))


def current_branch_sha() -> tuple[str | None, str | None]:
    ref = request_or_none("GET", f"/repos/{OWNER}/{REPO}/git/ref/heads/{BRANCH}")
    if not ref:
        return None, None
    commit_sha = ref["object"]["sha"]
    commit = request("GET", f"/repos/{OWNER}/{REPO}/git/commits/{commit_sha}")
    return commit_sha, commit["tree"]["sha"]


def create_blob(path: Path) -> str:
    data = (ROOT / path).read_bytes()
    blob = request(
        "POST",
        f"/repos/{OWNER}/{REPO}/git/blobs",
        {
            "content": base64.b64encode(data).decode("ascii"),
            "encoding": "base64",
        },
    )
    return blob["sha"]


def upload() -> None:
    ensure_repo()
    parent_sha, base_tree = current_branch_sha()
    tree_items = []
    files = iter_files()
    for index, rel in enumerate(files, start=1):
        blob_sha = create_blob(rel)
        tree_items.append(
            {
                "path": str(rel).replace("\\", "/"),
                "mode": "100644",
                "type": "blob",
                "sha": blob_sha,
            }
        )
        if index % 100 == 0:
            print(f"Uploaded blobs: {index}/{len(files)}")

    tree_body: dict = {"tree": tree_items}
    if base_tree:
        tree_body["base_tree"] = base_tree
    tree = request("POST", f"/repos/{OWNER}/{REPO}/git/trees", tree_body)

    commit_body: dict = {"message": COMMIT_MESSAGE, "tree": tree["sha"]}
    if parent_sha:
        commit_body["parents"] = [parent_sha]
    commit = request("POST", f"/repos/{OWNER}/{REPO}/git/commits", commit_body)

    if parent_sha:
        request(
            "PATCH",
            f"/repos/{OWNER}/{REPO}/git/refs/heads/{BRANCH}",
            {"sha": commit["sha"], "force": False},
        )
    else:
        request(
            "POST",
            f"/repos/{OWNER}/{REPO}/git/refs",
            {"ref": f"refs/heads/{BRANCH}", "sha": commit["sha"]},
        )
    print(f"Uploaded to https://github.com/{OWNER}/{REPO}/commit/{commit['sha']}")


if __name__ == "__main__":
    try:
        upload()
    except Exception as exc:
        print(str(exc), file=sys.stderr)
        raise SystemExit(1) from exc
