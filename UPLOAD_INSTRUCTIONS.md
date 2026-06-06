# Upload Instructions

This directory is a clean upload package for `LuHz123/AI-reading`.

It intentionally excludes local runtime and secret-bearing files:

- `.env`
- `projects/`
- `projects/.arcreel.db`
- `logs/`
- `vertex_keys/`
- `frontend/node_modules/`
- `frontend/dist/`
- local agent configuration directories

## Upload With Git

If the target repository already exists and you have access:

```bash
git clone https://github.com/LuHz123/AI-reading.git
cd AI-reading

# Copy this package contents into the repo root, then:
git add .
git commit -m "feat: add AI Novel novel-to-screenplay tool"
git push origin main
```

If the repository is empty, the same commands work after copying the files.

## Upload Without Git

This package also includes a REST API uploader that does not require Git.

1. Create a GitHub token with `repo` permission.
2. Set the token in the terminal.
3. Run the upload script from this directory.

PowerShell:

```powershell
$env:GH_TOKEN="github_pat_your_token_here"
python scripts/upload_to_github.py
```

The script targets:

```text
https://github.com/LuHz123/AI-reading
```

It creates the repository if it does not exist and commits all package files to
the `main` branch.

## Upload With GitHub Web UI

1. Open `https://github.com/LuHz123/AI-reading`.
2. Create the repository first if it does not exist.
3. Upload the files from this directory.
4. Commit with:

```text
feat: add AI Novel novel-to-screenplay tool
```

## Before Production

Rotate any API key that has been pasted into chat or logs, then configure a fresh
key in the app settings. Do not commit API keys.
