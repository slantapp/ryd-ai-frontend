# Curriculum v2 Guide — Flow-Based Lessons (Plain Language)

This guide is for **authors, teachers, and developers** building **schema v2** curricula (`schema_version: 2`). It explains how each JSON object works, how they connect, and **what learners actually see** in the app — aligned with the current `LessonPlayer` and `CourseDetailsV2` implementation.

**Working example:** [`CURRICULUM_V2_SAMPLE.json`](./CURRICULUM_V2_SAMPLE.json)

**Subtitle `show` test file:** [`CURRICULUM_V2_CAPTION_SAMPLE.json`](./CURRICULUM_V2_CAPTION_SAMPLE.json) — upload this in Curriculum Preview to hear speech vs live subtitle swaps.

**Legacy v1 format:** [`CURRICULUM_JSON_GUIDE.md`](./CURRICULUM_JSON_GUIDE.md)

---

## Table of contents

1. [What is v2?](#what-is-v2)
2. [How the JSON is organized](#how-the-json-is-organized)
3. [What the student sees before the lesson starts](#what-the-student-sees-before-the-lesson-starts)
4. [How a lesson runs (the flow)](#how-a-lesson-runs-the-flow)
5. [Phases — what they mean in plain English](#phases--what-they-mean-in-plain-english)
6. [Advance modes — when does the next step happen?](#advance-modes--when-does-the-next-step-happen)
7. [Beat types — what you write vs what they see](#beat-types--what-you-write-vs-what-they-see)
8. [Questions, wrong answers, and retries](#questions-wrong-answers-and-retries)
9. [Defaults — set once, reuse everywhere](#defaults--set-once-reuse-everywhere)
10. [Example lesson walkthrough](#example-lesson-walkthrough)
11. [Progress and navigation](#progress-and-navigation)
12. [Preview vs real student course](#preview-vs-real-student-course)
13. [Authoring checklist](#authoring-checklist)
14. [Migrating from v1](#migrating-from-v1)
15. [Quick reference](#quick-reference)

---

## What is v2?

In **v1**, a lesson is a fixed bag of fields (`body`, `avatar_script`, `code_example`, `questions[]`). The app decides the order.

In **v2**, each lesson is an ordered **`flow`** of **beats**. Each beat is one moment: the instructor speaks, something appears on screen, or the learner answers. **You control the teaching rhythm.**

Think of it like a real class:

```
Hook → Explain → Quick check → Demo → Pause → Practice → Recap → Next lesson
```

v2 is **live for students** today via `CourseDetailsV2` (route `/courses/:slug` when the course uses `schema_version: 2`).

---

## How the JSON is organized

Layers from largest to smallest:

```
Course (root)
├── slug                    → unique course ID (e.g. "javascript-fundamentals-v2")
├── schema_version: 2       → must be 2 for flow lessons
└── curriculum
    ├── title, description, category, age, class, ...
    ├── defaults            → optional global phrases and pacing
    └── modules[]
        ├── id, title
        ├── unlock            → optional (not enforced in app yet)
        └── lessons[]
            ├── id, title, goal?, estimated_minutes?
            └── flow[]      → ordered script of beats
```

| Object | What it is | Example |
|--------|------------|---------|
| **Root** | The whole upload | `slug`, `schema_version` |
| **`curriculum`** | Course metadata + modules | `title`, `defaults`, `modules` |
| **`module`** | A chapter | `id: "module_01"`, `lessons[]` |
| **`lesson`** | One class session | `id`, `title`, `goal`, `flow[]` |
| **`beat`** | One step in the lesson | `type`, `advance`, `avatar`, … |

### Lesson IDs

Use **globally unique** lesson IDs across the whole course:

```
module_01__lesson_01
module_02__lesson_01
```

Avoid bare `lesson_01` in multiple modules — IDs collide in progress and navigation.

---

## What the student sees before the lesson starts

When a learner opens a v2 course:

1. **Start screen** — “Ready to Learn?” with the course title. They tap to begin. On **mobile**, this tap also unlocks instructor audio (required by browsers).
2. **Classic layout (desktop)** — **Instructor on the left** (3D avatar), **lesson board on the right** (same shell as classic v1 `CourseDetails`).
3. **Classic layout (mobile)** — Instructor is mostly **audio + a compact header**; content fills the screen. Code questions use a collapsible question header so the editor has room.
4. **Progress bar** — “Lesson 2 of 8” style label across the course.
5. **Pause / resume** — Learner can pause the instructor mid-sentence and resume.

---

## How a lesson runs (the flow)

The app loads **beat 0**, plays it, then **beat 1**, and so on. Only the **`flow` array order** matters — not the order of fields inside each beat.

```
Start lesson → beat 0 → beat 1 → … → last beat → lesson complete
```

### Lesson goal (optional)

If the lesson has a `goal` string, the avatar says **once**, on the **first beat only**:

> “In this lesson, your goal is: …”

### After the last beat

The app marks the lesson complete and saves progress. If **every lesson in the course** is finished, a **feedback dialog** may appear (star rating + optional comment).

### One beat = one speech intention

The runtime does **not** merge `body` + `avatar_script` into one long utterance (that was v1). Each beat controls what is spoken for that step.

---

## Phases — what they mean in plain English

`phase` is **optional metadata**. It does **not** change beat logic — it helps you organize content and shows a small label in the student UI.

| You set `phase` | What it means | Student UI label (classic layout) |
|-----------------|---------------|-----------------------------------|
| `hook` | Opening, grab attention | “Lesson in progress” |
| `teach` | Explaining a concept | “Lesson in progress” |
| `assess` | Quick knowledge check | **“Check understanding”** |
| `practice` | Hands-on / questions | **“Practice”** |
| `reflect` | Wrap-up, recap, bridge | **“Wrap-up”** |

If you omit `phase`, the label stays **“Lesson in progress”**.

---

## Advance modes — when does the next step happen?

Every beat needs an `advance` field:

| Value | Plain English | What the learner does |
|-------|---------------|------------------------|
| **`auto`** | Move on when speech and animations finish | Nothing — continues automatically (~½ s after speech ends) |
| **`manual`** | Wait for the learner | Taps **Continue** (avatar may speak your `continue_prompt` from defaults first) |
| **`on_answer`** | Wait for a submitted answer | **Only on `question` beats** — see [Questions](#questions-wrong-answers-and-retries) |

### Rules enforced by the player

- **`pause`** beats must use `advance: "manual"`.
- **`question`** beats must use `advance: "on_answer"`.
- **`bridge`** beats always end with a manual **Next lesson** button (or subscribe on the free demo).

### Pause countdown

On `pause` beats, **Continue** is disabled until a timer finishes:

- Per-beat: `min_seconds`
- Or global default: `defaults.advance.pause_min_seconds` (default **2** seconds)

---

## Beat types — what you write vs what they see

### `speak` — instructor talks

**You write:** `avatar.text` (required)

**They see:** Avatar / subtitles; teaching area may show a “instructor is speaking” state on some layouts.

**Avatar says:** `avatar.text` (plus lesson `goal` on the first beat only).

**Then:** `auto` or `manual` per `advance`.

```json
{
  "id": "hook",
  "type": "speak",
  "phase": "hook",
  "avatar": {
    "text": "Hey! Ready to learn something new today?"
  },
  "advance": "auto"
}
```

---

### Voice vs subtitle (`avatar.show`)

The avatar **always speaks** `avatar.text` (and other spoken fields). The live subtitle normally repeats those words as they are spoken, so voice and captions stay in time.

If a phrase should **look** like math or code while still being **said** in everyday words, add optional `avatar.show`. You only list the islands inside the sentence — you do not rewrite the whole line.

```json
{
  "id": "multiply",
  "type": "speak",
  "phase": "teach",
  "avatar": {
    "text": "When we multiply, 2 times 3 equals 6, and we call that the product.",
    "show": [
      { "say": "2 times 3", "as": "2 × 3" },
      { "say": "equals 6", "as": "= 6" }
    ]
  },
  "advance": "manual"
}
```

**They hear:** “When we multiply, 2 times 3 equals 6…”  
**They read in the subtitle (once each phrase is fully spoken):** “When we multiply, 2 × 3 = 6…”

| Field | Who it is for |
|--------|----------------|
| `avatar.text` | Voice — write how you would **say** it |
| `avatar.show[].say` | The exact spoken island, copied from `text` |
| `avatar.show[].as` | What the subtitle should **show** for that island |

Rules for authors:

1. `show` is **optional**. Skip it and the subtitle matches the voice.
2. Copy `say` **exactly** from the spoken line (same words and spaces). Do not invent a shorter caption for the whole sentence.
3. You can list several islands on one line. Longer phrases win if two overlap (`2 times 3` beats `times`).
4. Until an island is fully spoken, learners still see the spoken words; the swap happens when that phrase completes. That keeps captions in time with the voice.
5. The same `show` list is used for other spoken fields on that beat (`on_ask`, `on_correct`, recap lead, and a `display` body if `speak_body` is true).

**Test file:** [`CURRICULUM_V2_CAPTION_SAMPLE.json`](./CURRICULUM_V2_CAPTION_SAMPLE.json)

---

### `display` — read on screen

**You write:** `body` (required), optional `title`, optional `avatar.text`, optional `speak_body`, optional `avatar.timing`

| Field | Effect |
|-------|--------|
| `speak_body: false` | Body stays on screen; avatar does **not** read the full wall of text (**recommended for long bodies**) |
| `speak_body: true` (default) | Avatar reads the body aloud |
| `avatar.timing: "before_display"` | Avatar line is spoken **before** title/body |
| `avatar.timing: "with_display"` (default) | Avatar line is spoken **after** title/body |

**Note:** `after_display` exists in the type definition but is **not implemented** in the player yet — use `before_display` or `with_display`.

**They see:** Title + formatted body on the purple-tinted lesson board.

```json
{
  "id": "concept",
  "type": "display",
  "phase": "teach",
  "title": "What is a variable?",
  "body": "A **variable** stores data under a name.",
  "speak_body": false,
  "avatar": {
    "text": "Think of it like a labeled box.",
    "timing": "with_display"
  },
  "advance": "manual"
}
```

---

### `media` — image or video

**You write:** `media.image` and/or `media.video`, optional `alt`, optional `avatar.text`

**They see:** Image or video on the lesson board.

**Avatar says:** Your `avatar.text`, or if `alt` is set: “Here’s a picture: {alt}.”

```json
{
  "id": "diagram",
  "type": "media",
  "phase": "teach",
  "media": {
    "image": "https://example.com/chart.png",
    "alt": "Order of operations chart"
  },
  "avatar": {
    "text": "Here's a visual to help you remember."
  },
  "advance": "manual"
}
```

---

### `code_demo` — instructor types code

**You write:** `code_example` object.

**What happens:**

1. Avatar: optional beat `avatar.text` + `description`
2. Code **types** character by character (`typingSpeed`, default ~40 ms/char)
3. If `autoRun: true`, code runs and output appears in the console
4. Avatar: `explanation` + “Watch how that code works on the screen.”
5. Next beat per `advance`

**They see:** Full **code editor + console** (same components as real coding courses). Editor is **locked** during the demo.

| Field | Required | Description |
|-------|----------|-------------|
| `code` | Yes | Source to type during demo |
| `language` | Yes | e.g. `javascript`, `python`, `html` |
| `description` | No | Spoken before typing |
| `explanation` | No | Spoken after typing |
| `autoRun` | No | Run after typing (default: false) |
| `typingSpeed` | No | ms per character (default ~40) |
| `starterCode` | No | Used on **question** handoff, not on standalone demos |

```json
{
  "id": "demo",
  "type": "code_demo",
  "phase": "teach",
  "code_example": {
    "code": "console.log('Hello');",
    "language": "javascript",
    "description": "Watch this line appear.",
    "explanation": "console.log prints text to the output.",
    "autoRun": true,
    "typingSpeed": 60
  },
  "advance": "auto"
}
```

---

### `formula_demo` — instructor types math

Same rhythm as `code_demo`, but on the **formula board** instead of a code editor.

```json
{
  "id": "formula_demo",
  "type": "formula_demo",
  "phase": "teach",
  "formula_example": {
    "formula": "(6 - 2)^2 + (-3)^2 \\times 2 = 34",
    "description": "Let's evaluate step by step.",
    "explanation": "Brackets first, then powers, then multiply, then add.",
    "typingSpeed": 60
  },
  "advance": "auto"
}
```

---

### `question` — learner must answer

**Advance must be:** `"on_answer"`

Supported `question.type` values:

| Type | Use case |
|------|----------|
| `multiple_choice` | Pick one option |
| `true_false` | True or false |
| `code_test` | Write and run code |
| `formula_test` | Enter a math answer |

The `question` object uses the **same shape as v1** (`question`, `options`, `answer`, `testCriteria`, `code_example`, `formula_example`, `explanation`).

#### Multiple choice / true-false — what happens

1. Avatar: `avatar.on_ask` or the question text
2. Learner picks an option and submits
3. Correct → praise → next beat
4. Wrong → [retry flow](#questions-wrong-answers-and-retries)

#### Code test / formula test — what happens

1. Optional `avatar.before_demo`
2. Worked example types out (`code_example` / `formula_example`)
3. `explanation` + `handoff` (or default: “Now it’s your turn…”)
4. Question text is spoken
5. Editor opens — seeded with **`starterCode`** if you provided it (skeleton with comments, not the full solution)
6. Learner submits → retry flow

```json
{
  "id": "practice",
  "type": "question",
  "phase": "practice",
  "question": {
    "type": "code_test",
    "question": "Create a variable called message.",
    "testCriteria": { "expectedCode": "let message" },
    "code_example": {
      "code": "let message = 'Hello';",
      "language": "javascript",
      "description": "Here's an example.",
      "explanation": "We use let, then the name.",
      "starterCode": "// Create a variable called message\n\n"
    }
  },
  "avatar": {
    "on_ask": "Your turn — give it a try!",
    "on_correct": "Perfect!",
    "on_wrong": "Close — check the variable name."
  },
  "retry": {
    "max": 2,
    "hint": "Start with let, then the name message."
  },
  "advance": "on_answer"
}
```

---

### `pause` — intentional breathing room

**Advance must be:** `"manual"`

**You write:** optional `avatar.text`, optional `min_seconds`, optional `keep_previous`

**They see:** A **Continue** button (disabled until the countdown ends).

**`keep_previous`:** When `true` (default after a demo), the **code or formula from the previous beat stays on screen** so learners can keep looking while they pause.

```json
{
  "id": "reflect",
  "type": "pause",
  "phase": "teach",
  "avatar": {
    "text": "Take a moment to read the code on screen."
  },
  "advance": "manual",
  "min_seconds": 2
}
```

---

### `recap` — lesson summary

**You write:** `points[]` (bullet strings), optional `avatar.text`

**Avatar says:** Recap intro + each point (“Point 1: …”, “Point 2: …”, …)

**They see:** Summary card with bullets.

**Special behavior:** If the learner **ran out of retries** on an earlier question without getting it right, recap speech is gentler and avoids overly celebratory wording.

```json
{
  "id": "recap",
  "type": "recap",
  "phase": "reflect",
  "points": [
    "Variables store data",
    "Use let to declare them"
  ],
  "avatar": {
    "text": "Great work today — you learned the basics of variables."
  },
  "advance": "auto"
}
```

---

### `bridge` — end of lesson / handoff

**You write:** `avatar.text`, `next: "lesson_id"` or `null` for end of course

**They see:** Bridge card + **Next lesson** button.

**Avatar says:** Your line + a built-in cue (“Tap Next lesson to keep going” or end-of-course message).

**`next`:** Hint for which lesson comes next. The app also follows **module order → lesson order** in the JSON when advancing.

```json
{
  "id": "bridge_next",
  "type": "bridge",
  "phase": "reflect",
  "avatar": {
    "text": "Next up: changing variable values!"
  },
  "next": "module_01__lesson_02",
  "advance": "manual"
}
```

Set `"next": null` on the final lesson of a course.

---

## Questions, wrong answers, and retries

Default policy (override per beat or in `defaults.question_retry`):

- **2 wrong attempts**, then the app **explains and moves on**.

| Outcome | What happens |
|---------|----------------|
| **Correct** | `on_correct` (or default praise) → auto-advance to next beat |
| **Wrong, retries left** | `on_wrong` → `hint` → selection cleared (MC/TF) → try again |
| **Wrong, retries exhausted** | `on_wrong` → teaching lines from demo `explanation` (not success-phrased `question.explanation`) → advance |

Per-beat override:

```json
"retry": {
  "max": 2,
  "hint": "Look at the quotes around the text.",
  "on_exhausted": "continue"
}
```

### Avatar lines on questions

| Field | When spoken |
|-------|-------------|
| `on_ask` | Before showing the question |
| `on_correct` | After a correct answer |
| `on_wrong` | After an incorrect answer |
| `before_demo` | Before a worked example (code_test / formula_test) |
| `handoff` | After demo, before student tries |

If omitted, the player uses phrases from `curriculum.defaults.avatar`.

---

## Defaults — set once, reuse everywhere

```json
"defaults": {
  "avatar": {
    "continue_prompt": "Tap Continue when you're ready to keep going.",
    "handoff_to_practice": "Now it's your turn! Use the starter in the editor and finish the challenge.",
    "correct_feedback": "That's correct! Well done.",
    "incorrect_feedback": "Not quite — let's look at that again."
  },
  "advance": {
    "pause_min_seconds": 2
  },
  "question_retry": {
    "max": 2,
    "on_exhausted": "continue"
  }
}
```

### What the player actually uses today

| Default key | Used for |
|-------------|----------|
| `continue_prompt` | Spoken before **Continue** on manual beats |
| `handoff_to_practice` | After code/formula demo, before student tries |
| `correct_feedback` / `incorrect_feedback` | Question outcomes |
| `advance.pause_min_seconds` | Pause countdown |
| `question_retry` | Default retry policy when beat omits `retry` |

### Template fields in JSON but not auto-spoken by v2

These appear in sample curricula and migration docs; **put intros in your first `speak` / `display` beat** instead of relying on them:

- `intro_template`
- `start_questions_prompt`
- `lesson_complete_template`

Placeholders when templates are used: `{{lesson_title}}`, `{{module_title}}`.

---

## Example lesson walkthrough

What a learner experiences, beat by beat:

```
[hook / speak, advance: auto]
  Avatar: "Have you ever labeled a box?"
  → auto-advance

[display, advance: manual, speak_body: false]
  Screen: "What is a variable?" + body text
  Avatar: short spoken summary (not the full body)
  → learner taps Continue

[code_demo, advance: auto]
  Avatar introduces → code types on screen → runs → explains
  → auto-advance

[pause, advance: manual]
  Avatar: "Take a moment to read the code."
  Code stays visible on screen
  → learner taps Continue after countdown

[question / multiple_choice, advance: on_answer]
  Avatar asks → learner picks → correct → praise → next beat

[recap, advance: auto]
  Avatar reads bullet points

[bridge, advance: manual]
  Avatar: "Next up: changing variable values!"
  → learner taps Next lesson
```

---

## Progress and navigation

### What gets saved (student app)

| Field | Description |
|-------|-------------|
| `courseSlug` | Which course |
| `status` | `not-started` \| `ongoing` \| `completed` |
| `currentLessonId` | Which lesson they were on |
| `lessonIndex` | Position in the course |
| `completedLessons` | List of finished lesson IDs |
| `lessonStarted` | Whether they passed the start gate |

**Not saved yet:** beat index inside a lesson. If a learner leaves mid-lesson, they resume at the **start of that lesson’s flow**, not mid-beat.

### Lesson order

Lessons play in **module array order**, then **lesson array order** within each module.

`bridge.next` is a hint for messaging and navigation; primary ordering follows the JSON arrays.

### Module unlock

```json
"unlock": { "requires": "module_01" }
```

`null` means available immediately. **Not enforced in the app yet** — reserved for future gating.

---

## Preview vs real student course

| Feature | Curriculum preview (`/curriculum-preview`) | Student course (`/courses/:slug`) |
|---------|--------------------------------------------|-----------------------------------|
| Left sidebar (outline) | Yes | No |
| Skip panel (jump to beats) | Yes | Hidden (`hideFlowChrome`) |
| Beat step progress bar | Shown in preview layouts | Hidden in classic student layout |
| Start gate + mobile audio unlock | Yes | Yes |
| Classic avatar-left / board-right layout | Yes | Yes |
| Course completion feedback dialog | No | Yes (after full course complete) |

Authors should **preview** before publishing to hear speech, test code runs, and jump between beats.

---

## Authoring checklist

1. **Start with a hook** — one short `speak` or `display` beat before heavy content.
2. **Chunk explanations** — several short `display` beats beat one giant paragraph.
3. **Use `speak_body: false`** on long display bodies; let `avatar.text` carry the narration.
4. **Use `avatar.show`** when a spoken phrase should look like math or code in the subtitle (`say` must match the spoken words exactly).
5. **Check understanding early** — put a `question` beat before a hard `code_demo` if needed.
6. **Pause after demos** — give learners time to absorb (`keep_previous` keeps code visible).
7. **End with recap + bridge** — feels like a real class ending.
8. **Stable beat IDs** — used by the skip panel in preview; don’t rename casually.
9. **Unique lesson IDs** — prefix with module: `module_02__lesson_03`.
10. **`starterCode` on code tests** — skeleton with comments, not the full answer.
11. **Set `schema_version: 2`** on the root object.

### Suggested pattern for a ~10-minute lesson

```
speak (hook)
display (concept)
question (micro-check)
code_demo OR formula_demo
pause
question (practice)
recap
bridge
```

---

## Migrating from v1

| v1 field | Becomes v2 beat |
|----------|-----------------|
| Hard-coded intro | `speak` (or first `display`) |
| `body` | `display` |
| `avatar_script` | `speak` |
| `code_example` | `code_demo` |
| `formula_example` | `formula_demo` |
| `media.image` / `video` | `media` |
| Each `questions[]` item | `question` |
| `next_lesson_id` | `bridge` with `next` |

---

## Quick reference

### Beat type → main UI

| Beat type | Main UI panel |
|-----------|---------------|
| `speak` | Avatar / subtitles |
| `display` | Lesson text board |
| `media` | Image or video |
| `code_demo` | Code editor (locked) + console |
| `formula_demo` | Formula board |
| `question` | Quiz / code editor / formula input |
| `pause` | Continue button (+ optional kept demo) |
| `recap` | Summary bullets |
| `bridge` | Next lesson prompt |

### Beat type → advance

| Beat type | Typical `advance` |
|-----------|-------------------|
| `speak`, `display`, `media`, `code_demo`, `formula_demo`, `recap` | `auto` or `manual` |
| `question` | `on_answer` (required) |
| `pause` | `manual` (required) |
| `bridge` | `manual` (required) |

### Speech order by beat type

| Beat type | Avatar speech order |
|-----------|---------------------|
| `speak` | `avatar.text` |
| `display` | title → body (if `speak_body`) → `avatar.text` (order depends on `timing`) |
| `media` | `avatar.text` and/or alt description |
| `code_demo` | `description` → *(typing)* → `explanation` |
| `formula_demo` | `description` → *(typing)* → `explanation` |
| `question` | See [Questions](#questions-wrong-answers-and-retries) |
| `pause` | optional `avatar.text` + built-in “take a moment…” |
| `recap` | intro → each point |
| `bridge` | `avatar.text` + built-in next-step cue |

---

## Validation

When you upload JSON in curriculum preview, the app validates:

- Every beat has `id`, `type`, and `advance`
- `speak` requires `avatar.text`
- `avatar.show` is optional; each item needs `say` and `as`, and `say` must appear in the spoken line
- `display` requires `body`
- `question` requires a valid question object
- `code_demo` / `formula_demo` require their example objects
- `recap` requires `points[]`
- `bridge` requires `next` (string or `null`)

Fix any errors before publishing.

---

*This guide reflects the implementation in `src/features/curriculum-preview/v2/` and `src/components/courses/CourseDetailsV2.tsx`. If behavior changes in code, update this document to match.*
