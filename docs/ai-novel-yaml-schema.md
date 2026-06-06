# AI Novel Screenplay YAML Schema

## Purpose

AI Novel converts novel input containing at least three chapters into a structured screenplay draft. The YAML output is designed for authors: it should be readable, editable, traceable to the source chapters, and suitable for later ArcReel workflows such as character assets, storyboards, video generation, and version history.

The schema is intentionally smaller than a full production script format. It captures the minimum structure needed for a useful first draft, then leaves room for optional production fields.

## Top-Level Shape

```yaml
title: "Rain Over Haitang Theater"
logline: "A son follows a key and an old ticket into a theater built around erased memories."
source_chapters: []
story_bible: {}
characters: []
scenes: []
revision_notes: []
```

| Field | Type | Required | Reason |
|---|---|---:|---|
| `title` | string | yes | Gives the draft a stable human-facing title. |
| `logline` | string | no | Helps authors judge the dramatic promise of the adaptation quickly. |
| `source_chapters` | array | yes | Preserves chapter coverage and traceability for long-form input. |
| `story_bible` | object | yes | Stores global continuity facts before scenes are generated. |
| `characters` | array | yes | Provides one canonical character table for scene and dialogue references. |
| `scenes` | array | yes | Holds the actual screenplay draft as editable scene units. |
| `revision_notes` | array | no | Captures known weak spots and next editing tasks. |

## SourceChapter

```yaml
source_chapters:
  - number: 1
    title: "The Rain Key"
    summary: "Lin Che receives a copper key and an old theater ticket."
    adaptation_focus:
      - "Inciting incident"
      - "Mystery object"
```

| Field | Type | Required | Reason |
|---|---|---:|---|
| `number` | integer | yes | Maintains the original chapter order. |
| `title` | string | yes | Keeps the source chapter recognizable to the author. |
| `summary` | string | yes | Explains what the chapter contributes to the script. |
| `adaptation_focus` | array[string] | no | Shows what the model chose to preserve or compress. |

Design reason: novel inputs are long, so the script must remain auditable. This object lets an author ask, "Which chapter did this scene come from?"

## StoryBible

```yaml
story_bible:
  genre: "悬疑短剧"
  themes:
    - "记忆与真相"
  core_conflict: "林澈想恢复真相，顾衡想阻止记忆装置重启。"
  timeline:
    - "雨夜收到钥匙"
    - "深夜进入剧院"
    - "黎明前舞台对峙"
```

| Field | Type | Required | Reason |
|---|---|---:|---|
| `genre` | string | no | Guides tone and pacing. |
| `themes` | array[string] | no | Keeps the adaptation from becoming only plot extraction. |
| `core_conflict` | string | yes | Gives every scene a dramatic center. |
| `timeline` | array[string] | no | Helps maintain event order across chapters. |

Design reason: ArcReel already benefits from global project context. A compact story bible gives downstream scene, asset, and storyboard generation a shared source of truth.

## Character

```yaml
characters:
  - id: "char_lin_che"
    name: "林澈"
    role: "主角"
    description: "克制的青年，寻找父亲失踪背后的真相。"
    arc: "从逃避父亲失踪，到主动承担揭开真相的代价。"
```

| Field | Type | Required | Reason |
|---|---|---:|---|
| `id` | string | yes | Stable reference for scenes and dialogue. |
| `name` | string | yes | Display name for authors. |
| `role` | string | yes | Describes story function: protagonist, ally, antagonist, witness. |
| `description` | string | yes | Captures motivation and usable writing context. |
| `arc` | string | no | Helps later revisions preserve character development. |

Design reason: names can change or collide. Stable IDs let the YAML be validated and safely edited while preserving readable names.

## Scene

```yaml
scenes:
  - id: "scene_001"
    source_chapter: 1
    heading: "EXT. 老街雨巷 - 夜"
    location: "老街雨巷"
    time: "夜晚"
    purpose: "让主角获得进入旧剧院的钥匙。"
    summary: "林澈在雨巷收到父亲留下的铜钥匙。"
    characters:
      - "char_lin_che"
    actions:
      - "雨水打湿旧剧票，铜钥匙在掌心发凉。"
    dialogues:
      - character: "char_lin_che"
        emotion: "迟疑"
        line: "如果这是你留下的线索，我会走到最后。"
    visual_notes:
      - "冷色雨夜，路灯反光，铜钥匙特写。"
```

| Field | Type | Required | Reason |
|---|---|---:|---|
| `id` | string | yes | Unique scene identifier for edits and version history. |
| `source_chapter` | integer | yes | Connects the scene back to source material. |
| `heading` | string | no | Gives authors a familiar screenplay-style scene heading. |
| `location` | string | yes | Required for staging and storyboard generation. |
| `time` | string | yes | Helps pacing and continuity. |
| `purpose` | string | yes | Explains why this scene exists dramatically. |
| `summary` | string | yes | Short editable scene overview. |
| `characters` | array[string] | yes | References global character IDs. |
| `actions` | array[string] | yes | Converts narration into playable action. |
| `dialogues` | array[Dialogue] | yes | Holds character lines. |
| `visual_notes` | array[string] | no | Bridges ArcReel's storyboard and asset workflow. |

Design reason: the scene is the core editable unit. It must be structured enough for validation but still readable by authors who want to rewrite it.

## Dialogue

```yaml
dialogues:
  - character: "char_xu_lan"
    emotion: "紧张"
    line: "这地方不像废弃了三年，倒像有人一直在等你。"
    subtext: "她担心林澈被过去吞没。"
```

| Field | Type | Required | Reason |
|---|---|---:|---|
| `character` | string | yes | References a global character ID. |
| `emotion` | string | no | Gives actors, TTS, and revision tools a performance cue. |
| `line` | string | yes | The actual spoken line. |
| `subtext` | string | no | Helps authors revise dialogue beyond literal plot delivery. |

Design reason: dialogue is more than text. Splitting speaker, emotion, line, and subtext supports editing, voice generation, and performance direction.

## Validation Rules

Minimum validation should enforce:

- Input must contain at least three source chapters.
- `source_chapters.length >= 3`.
- `title`, `story_bible.core_conflict`, `characters`, and `scenes` must be present.
- Every `characters[].id` must be unique.
- Every `scenes[].characters[]` value must exist in `characters[].id`.
- Every `dialogues[].character` value must exist in `characters[].id`.
- Every scene must include at least one action or one dialogue line.
- Every scene must have `location`, `time`, `purpose`, and `summary`.

## Extension Points

ArcReel-compatible optional fields can be added later:

| Field | Location | Use |
|---|---|---|
| `asset_refs` | scene | Link characters, props, and locations to ArcReel asset records. |
| `shot_list` | scene | Store generated storyboard shot prompts. |
| `estimated_duration` | scene | Estimate short-drama pacing. |
| `version` | top level | Track schema migration and compatibility. |
| `export_targets` | top level | Record whether the draft is for YAML, JSON, storyboard, or video. |

These fields are optional because the first deliverable should remain a screenplay draft, not a full production database dump.
