# Curriculum v2 — Backend validation spec

This document is for **backend engineers** implementing upload validation for **schema v2** curricula (`schema_version: 2`). It lists what is **required**, what is **optional**, and what the **student app actually uses** — so teachers are not blocked by rules stricter than the frontend.

**Companion docs (authors / QA):**

- Author guide: [`CURRICULUM_V2_GUIDE.md`](./CURRICULUM_V2_GUIDE.md)
- Working JSON: [`CURRICULUM_V2_SAMPLE.json`](./CURRICULUM_V2_SAMPLE.json)
- Subtitle `show` sample: [`CURRICULUM_V2_CAPTION_SAMPLE.json`](./CURRICULUM_V2_CAPTION_SAMPLE.json)

**Frontend reference implementation:** `src/features/curriculum-preview/v2/validate.ts`

---

## Table of contents

1. [Envelope shapes](#envelope-shapes)
2. [Required vs optional — quick matrix](#required-vs-optional--quick-matrix)
3. [Root & curriculum metadata](#root--curriculum-metadata)
4. [Modules & lessons](#modules--lessons)
5. [Beat core fields](#beat-core-fields)
6. [Beat types (field-by-field)](#beat-types-field-by-field)
7. [`code_example` object](#code_example-object)
8. [`question` object](#question-object)
9. [Avatar speech vs subtitle display (`avatar.show`)](#avatar-speech-vs-subtitle-display-avatarshow)
10. [`defaults` block](#defaults-block)
11. [Validation rules backend should enforce](#validation-rules-backend-should-enforce)
12. [Fields that must NOT be required](#fields-that-must-not-be-required)
13. [Recommended warnings (non-blocking)](#recommended-warnings-non-blocking)
14. [Full minimal valid curriculum](#full-minimal-valid-curriculum)
15. [CSS lesson with supporting HTML (example)](#css-lesson-with-supporting-html-example)

---

## Envelope shapes

Upload may be either:

### A) Wrapped (preferred for published courses)

```json
{
  "slug": "my-course-slug",
  "schema_version": 2,
  "curriculum": { ... }
}
```

| Field | Required | Notes |
|-------|----------|-------|
| `slug` | **Yes** | Unique course identifier; URL-safe string |
| `schema_version` | **Yes** | Must be `2` |
| `curriculum` | **Yes** | Object — see below |

### B) Bare curriculum object (preview uploads)

```json
{
  "title": "...",
  "modules": [ ... ]
}
```

If `schema_version` is omitted but lessons use `flow[]`, treat as v2 when all lessons have `flow`.

---

## Required vs optional — quick matrix

| Layer | Required | Optional |
|-------|----------|----------|
| **Curriculum** | `title`, `description`, `category`, `age`, `class`, `modules` (≥1) | `language`, `grade`, `duration`, `level`, `rating`, `defaults` |
| **Module** | `id`, `title`, `lessons` (≥1) | `unlock` |
| **Lesson** | `id`, `title`, `flow` (≥1 beat) | `goal`, `estimated_minutes` |
| **Every beat** | `id`, `type`, `advance` | `phase`, `avatar` (depends on type) |
| **`code_example`** | `code`, `language` | `description`, `explanation`, `autoRun`, `typingSpeed`, `starterCode`, `supportingCode`, `supportingLanguage` |
| **`question` (code_test)** | `type`, `question` | `id`, `options`, `answer`, `explanation`, `code_example`, `formula_example`, `testCriteria` |
| **`avatar` on beat** | Depends on beat type | Most lines optional except `speak` requires `avatar.text` |

---

## Root & curriculum metadata

```json
"curriculum": {
  "title": "Course title",
  "description": "Short description for library cards.",
  "language": "en",
  "category": "coding",
  "age": 10,
  "class": "Primary 5",
  "grade": 5,
  "duration": "4 weeks",
  "level": "Beginner",
  "rating": 4.8,
  "defaults": { ... },
  "modules": [ ... ]
}
```

| Field | Required | Type | Validation |
|-------|----------|------|------------|
| `title` | **Yes** | string | Non-empty |
| `description` | **Yes** | string | Non-empty |
| `category` | **Yes** | string | Non-empty (e.g. `coding`, `mathematics`) |
| `age` | **Yes** | number | Finite, ≥ 1 |
| `class` | **Yes** | string | Non-empty (display label, e.g. `"Primary 5"`) |
| `language` | No | string | e.g. `"en"` — **not validated as required by frontend** |
| `grade` | No | number | |
| `duration` | No | string | |
| `level` | No | string | If present: `Beginner` \| `Intermediate` \| `Advanced` |
| `rating` | No | number | |
| `defaults` | No | object | See [defaults](#defaults-block) |
| `modules` | **Yes** | array | Length ≥ 1 |

---

## Modules & lessons

### Module

| Field | Required | Notes |
|-------|----------|-------|
| `id` | **Yes** | Unique within course |
| `title` | **Yes** | |
| `lessons` | **Yes** | Array, length ≥ 1 |
| `unlock` | No | `{ "requires": "module_id" }` or `null` — **not enforced in app yet** |

### Lesson

| Field | Required | Notes |
|-------|----------|-------|
| `id` | **Yes** | **Globally unique** across all modules (use `module_01__lesson_01`) |
| `title` | **Yes** | |
| `flow` | **Yes** | Ordered array of beats, length ≥ 1 |
| `goal` | No | Spoken once on first beat only |
| `estimated_minutes` | No | Metadata for authors |

---

## Beat core fields

Every beat object:

| Field | Required | Values |
|-------|----------|--------|
| `id` | **Yes** | string — stable id for preview skip panel |
| `type` | **Yes** | `speak` \| `display` \| `media` \| `code_demo` \| `formula_demo` \| `question` \| `pause` \| `recap` \| `bridge` |
| `advance` | **Yes** | `auto` \| `manual` \| `on_answer` |
| `phase` | No | `hook` \| `teach` \| `assess` \| `practice` \| `reflect` — UI label only |
| `avatar` | No* | Object — *required content depends on `type` |

### Advance constraints (enforce)

| Beat type | Allowed `advance` |
|-----------|-------------------|
| `question` | **`on_answer` only** |
| `pause`, `bridge` | **`manual` only** |
| Others | `auto` or `manual` |

---

## Beat types (field-by-field)

### `speak`

| Field | Required |
|-------|----------|
| `avatar.text` | **Yes** |
| `avatar.show` | No |
| `phase` | No |

### `display`

| Field | Required | Default in player |
|-------|----------|-------------------|
| `body` | **Yes** | |
| `title` | No | |
| `speak_body` | No | `true` (authors should set `false` for long bodies) |
| `avatar.text` | No | |
| `avatar.timing` | No | `with_display` — `after_display` **not implemented** |
| `avatar.show` | No | Applies to spoken lines + body when `speak_body` is true |

### `media`

| Field | Required |
|-------|----------|
| `media.image` **or** `media.video` | **At least one** |
| `media.alt` | No |
| `avatar.text` | No |

### `code_demo`

| Field | Required |
|-------|----------|
| `code_example` | **Yes** (object) |
| `code_example.code` | **Yes** |
| `code_example.language` | **Yes** |
| `avatar.text` | No |

### `formula_demo`

| Field | Required |
|-------|----------|
| `formula_example` | **Yes** |
| `formula_example.formula` | **Yes** |
| `avatar.text` | No |

### `question`

| Field | Required |
|-------|----------|
| `question` | **Yes** (object) |
| `advance` | **`on_answer`** |
| `retry` | No |
| `avatar.on_ask`, `on_correct`, `on_wrong`, `before_demo`, `handoff`, `show` | No — fall back to `defaults.avatar` |

### `pause`

| Field | Required |
|-------|----------|
| `advance` | **`manual`** |
| `min_seconds` | No — falls back to `defaults.advance.pause_min_seconds` (2) |
| `keep_previous` | No |
| `avatar.text` | No |

### `recap`

| Field | Required |
|-------|----------|
| `points` | **Yes** — non-empty string array |
| `avatar.text` | No |

### `bridge`

| Field | Required |
|-------|----------|
| `next` | **Yes** — lesson id string **or** `null` (end of course) |
| `advance` | **`manual`** |
| `avatar.text` | No |

---

## `code_example` object

Used on `code_demo` beats and optionally on `code_test` questions.

```json
{
  "code": "h1 { color: red; }",
  "language": "css",
  "description": "Spoken before typing",
  "explanation": "Spoken after typing",
  "autoRun": true,
  "typingSpeed": 45,
  "starterCode": "/* your CSS here */\n",
  "supportingCode": "<h1>My Page</h1>\n<p>Welcome!</p>",
  "supportingLanguage": "html"
}
```

| Field | Required | Purpose |
|-------|----------|---------|
| `code` | **Yes** | Worked example typed in demo; full solution reference |
| `language` | **Yes** | e.g. `javascript`, `python`, `html`, `css`, `web` |
| `description` | No | Avatar line before typing (player default if omitted) |
| `explanation` | No | Avatar line after typing |
| `autoRun` | No | Default `false` — run after demo finishes typing |
| `typingSpeed` | No | ms per character; default ~40 |
| `starterCode` | No | Editor seed **after** demo on `code_test` handoff — skeleton only, **not** the answer |
| `supportingCode` | No | Companion pane code (e.g. HTML to style when `language` is `css`) |
| `supportingLanguage` | No | Language of `supportingCode`; if omitted: `html` when main is `css`, `css` when main is `html` |

### Web workspace languages

These open HTML / CSS / JS panes: `html`, `css`, `web`, `html/css`, `html+css`, `html-css`, or when `testCriteria.expectedHTML` / `expectedCSS` is set.

### `starterCode` vs `supportingCode`

| | `code` | `starterCode` | `supportingCode` |
|---|--------|---------------|------------------|
| **When** | Demo typing | Student practice | Demo + practice |
| **Pane** | Main (`language`) | Main (`language`) | Companion pane |
| **Required?** | Yes | **No** | **No** |
| **Typical CSS lesson** | Full rule `h1 { color: red; }` | `/* Write selector */\n` or empty | `<h1>Title</h1>` HTML |

**Do not require `starterCode` or `supportingCode` for upload to succeed.**

---

## `question` object

Shared across v1 and v2.

| Field | Required | By type |
|-------|----------|---------|
| `type` | **Yes** | `multiple_choice` \| `true_false` \| `code_test` \| `formula_test` |
| `question` | **Yes** | Prompt text |
| `id` | No | |
| `options` | No* | *Required in practice for MC — app needs options to render |
| `answer` | No* | *Required in practice for MC/TF |
| `explanation` | No | Shown/spoken on success or after retries |
| `code_example` | No | Optional worked demo before `code_test` |
| `formula_example` | No | Optional demo before `formula_test` |
| `testCriteria` | No | See below |

### `testCriteria` (all optional keys)

| Key | Used when |
|-----|-----------|
| `expectedCode` | Generic substring match |
| `expectedHTML` | Web workspace — HTML pane |
| `expectedCSS` | Web workspace — CSS pane |
| `expectedJS` | Web workspace — JS pane |
| `expectedVariable`, `expectedValue`, `expectedValues`, `expectedFunction` | JS/Python checks |
| `expectedFormula` | **Required for `formula_test` validation in frontend** |
| `testCases` | Array of `{ input, expected }` |

**Backend:** For `formula_test`, require `testCriteria.expectedFormula`. For `code_test`, **do not** require `code_example` or `testCriteria` — empty practice is valid (player falls back to “any code submitted”).

---

## Avatar speech vs subtitle display (`avatar.show`)

Optional on any beat with `avatar`.

```json
"avatar": {
  "text": "When we multiply, 2 times 3 equals 6.",
  "show": [
    { "say": "2 times 3", "as": "2 × 3" },
    { "say": "equals 6", "as": "= 6" }
  ]
}
```

| Field | Required | Rule |
|-------|----------|------|
| `show` | No | Omit entirely if voice = subtitle |
| `show[].say` | Yes **if `show` present** | Must appear **exactly** in spoken text (`text`, `on_ask`, etc.) |
| `show[].as` | Yes **if `show` present** | Subtitle display replacement |

**Validation:** If `show` is provided, validate each `say` is a substring of the beat’s spoken fields (case-insensitive match is OK for backend). **Do not require `show` on any beat.**

Applies to: `text`, `on_ask`, `on_correct`, `on_wrong`, `before_demo`, `handoff`, and `display.body` when `speak_body` is true.

---

## `defaults` block

Entire `defaults` object is **optional**.

```json
"defaults": {
  "avatar": {
    "continue_prompt": "...",
    "handoff_to_practice": "...",
    "correct_feedback": "...",
    "incorrect_feedback": "...",
    "intro_template": "...",
    "start_questions_prompt": "...",
    "lesson_complete_template": "..."
  },
  "advance": { "pause_min_seconds": 2 },
  "question_retry": { "max": 2, "on_exhausted": "continue" }
}
```

| Key | Required | Used by player? |
|-----|----------|-----------------|
| `avatar.continue_prompt` | No | Yes — manual beats |
| `avatar.handoff_to_practice` | No | Yes — after code demo |
| `avatar.correct_feedback` / `incorrect_feedback` | No | Yes |
| `avatar.intro_template` | No | **No** — put intro in first beat |
| `avatar.start_questions_prompt` | No | **No** |
| `avatar.lesson_complete_template` | No | **No** |
| `advance.pause_min_seconds` | No | Yes — default 2 |
| `question_retry` | No | Yes when beat omits `retry` |

**Do not require any `defaults` keys.**

---

## Validation rules backend should enforce

1. Valid JSON object.
2. `schema_version === 2` when using flow lessons.
3. Curriculum metadata required fields (see table).
4. ≥ 1 module; each module ≥ 1 lesson; each lesson ≥ 1 beat.
5. Unique lesson `id` values across the whole course.
6. Each beat: valid `type`, valid `advance`, type-specific required fields.
7. `question` beats: `advance === "on_answer"`.
8. `pause` / `bridge`: `advance === "manual"`.
9. `speak`: `avatar.text` present.
10. `display`: `body` present.
11. `media`: at least one of `image`, `video`.
12. `code_demo`: `code_example.code` + `code_example.language`.
13. `formula_demo`: `formula_example.formula`.
14. `recap`: non-empty `points[]`.
15. `bridge`: `next` is string or `null`.
16. If `avatar.show` present: validate `say` / `as` shape; warn if `say` not in spoken text.
17. `formula_test`: `testCriteria.expectedFormula` required.
18. Optional string fields (`starterCode`, `supportingCode`, etc.): if key exists, value must be string.

---

## Fields that must NOT be required

Teachers must be able to upload without these:

- `defaults` (entire block)
- `lesson.goal`, `lesson.estimated_minutes`
- `beat.phase`
- `beat.avatar` (except `speak` needs `avatar.text`)
- `display.title`, `display.speak_body`, `display.avatar`
- `code_example.description`, `explanation`, `autoRun`, `typingSpeed`
- **`code_example.starterCode`**
- **`code_example.supportingCode`**, **`supportingLanguage`**
- `question.id`, `explanation`
- **`question.code_example`** on `code_test`
- `question.formula_example` on `formula_test` (unless you want demo — still optional in app)
- **`testCriteria`** on `code_test` (except validate shape if present)
- `retry` on question beats
- `media.alt`, `pause.min_seconds`, `pause.keep_previous`
- `module.unlock`
- `curriculum.language`, `grade`, `duration`, `level`, `rating`
- `avatar.show` anywhere

---

## Recommended warnings (non-blocking)

- Duplicate lesson ids across modules
- `bridge.next` points to missing lesson id
- `avatar.show[].say` not found in spoken text
- `question` MC/TF missing `options` or `answer`
- `code_test` with no `testCriteria` and no `code_example` (weak exercise)
- Very long `display.body` with `speak_body: true`
- Bare lesson ids like `lesson_01` in multiple modules

---

## Full minimal valid curriculum

```json
{
  "slug": "minimal-v2",
  "schema_version": 2,
  "curriculum": {
    "title": "Minimal v2",
    "description": "Smallest valid upload.",
    "category": "coding",
    "age": 8,
    "class": "Primary 3",
    "modules": [
      {
        "id": "module_01",
        "title": "Module 1",
        "lessons": [
          {
            "id": "module_01__lesson_01",
            "title": "Hello",
            "flow": [
              {
                "id": "hook",
                "type": "speak",
                "avatar": { "text": "Hello!" },
                "advance": "auto"
              },
              {
                "id": "bridge",
                "type": "bridge",
                "next": null,
                "advance": "manual"
              }
            ]
          }
        ]
      }
    ]
  }
}
```

---

## CSS lesson with supporting HTML (example)

Use when students write **CSS** but need **HTML context** in the preview.

```json
{
  "id": "practice_heading_color",
  "type": "question",
  "phase": "practice",
  "question": {
    "type": "code_test",
    "question": "Make the heading red using CSS.",
    "code_example": {
      "code": "h1 {\n  color: red;\n}",
      "language": "css",
      "description": "Here is how we color a heading.",
      "explanation": "The h1 selector picks the heading; color changes the text color.",
      "supportingCode": "<h1>My Page</h1>\n<p>Welcome to my site.</p>",
      "supportingLanguage": "html",
      "starterCode": "/* Write CSS for the h1 heading */\n\n"
    },
    "testCriteria": {
      "expectedCSS": "color: red"
    }
  },
  "avatar": {
    "on_ask": "Use CSS to style the heading on the page."
  },
  "advance": "on_answer"
}
```

During the demo the instructor types the CSS rule; the HTML stays in the HTML pane. During practice the student gets `starterCode` in the CSS pane and the same HTML in the HTML pane.

---

*Last updated to match `src/features/curriculum-preview/v2/` and `src/utils/webCodeWorkspace.ts`.*
