# Curriculum JSON Guide for Teachers

This guide explains how to structure a curriculum JSON file so it works correctly in RYD Learning: course listing, AI instructor narration, quizzes, coding exercises, and publishing.

Use the **Curriculum Preview** page in the teacher portal to upload your file, fix any validation errors, preview the course, then publish when you are satisfied.

---

## Table of contents

1. [Quick start](#quick-start)
2. [File structure overview](#file-structure-overview)
3. [Top-level fields](#top-level-fields)
4. [Modules](#modules)
5. [Lessons](#lessons)
6. [Questions](#questions)
7. [Code examples and tests](#code-examples-and-tests)
8. [Linking lessons (`next_lesson_id`)](#linking-lessons-next_lesson_id)
9. [Categories](#categories)
10. [Naming conventions](#naming-conventions)
11. [Common mistakes](#common-mistakes)
12. [Pre-publish checklist](#pre-publish-checklist)
13. [Minimal valid example](#minimal-valid-example)

---

## Quick start

1. Download the sample template from **Curriculum Preview** (or copy from `src/features/curriculum-preview/templates/sample-curriculum.ts` in the repo).
2. Edit the JSON in a text editor. Use **JSON** format only (`.json` file).
3. Validate JSON syntax (no trailing commas, double quotes on keys and strings).
4. Upload to **Curriculum Preview** and read any validation messages.
5. Walk through every lesson and question in preview before publishing.

**Recommended format:** wrap everything in `slug` + `curriculum` (see below).

---

## File structure overview

Your file is a single JSON object with two main parts:

```
Curriculum (root)
├── slug          → unique course ID (URL-friendly)
└── curriculum    → all course content
    ├── title, description, language, category, age, class, grade
    └── modules[]
        └── lessons[]
            └── questions[]
```

### Accepted shapes

The uploader accepts either:

**A. Wrapped (recommended for publishing)**

```json
{
  "slug": "my-course-slug",
  "curriculum": {
    "title": "My Course Title",
    "description": "...",
    "language": "en",
    "category": "coding",
    "age": 10,
    "class": "Primary 5",
    "grade": 5,
    "modules": []
  }
}
```

**B. Curriculum only (no slug wrapper)**

```json
{
  "title": "My Course Title",
  "description": "...",
  "modules": []
}
```

For publishing, prefer **wrapped** format with a clear `slug`.

---

## Top-level fields

### `slug` (required when wrapped)

| Field | Type | Rules |
|-------|------|--------|
| `slug` | string | Unique, lowercase, use hyphens or underscores. Examples: `python-beginner`, `html-css-combined`. Becomes the course URL identifier. |

**Do not** use spaces or special characters. Once published, changing the slug may affect existing links and progress.

---

### Inside `curriculum`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | Yes | Course name shown on cards and headers. |
| `description` | string | Yes | Short summary for the course library. |
| `language` | string | Yes | Usually `"en"`. Content language for the course. |
| `category` | string | Yes | Folder on the course listing. See [Categories](#categories). |
| `age` | number | Yes | Minimum recommended learner age (years), e.g. `10`. Must be ≥ 1. |
| `class` | string | Yes | School class label, e.g. `"Primary 5"`, `"JSS 1"`, `"Grade 5"`. |
| `grade` | number | No | Optional international grade 1–12, shown as “Gr. 5” next to class. |
| `modules` | array | Yes | At least one module. |

**Example:**

```json
"title": "HTML Fundamentals",
"description": "Learn the building blocks of web development with HTML.",
"language": "en",
"category": "coding",
"age": 10,
"class": "Primary 5",
"grade": 5,
"modules": [ ... ]
```

---

## Modules

Each module is a chapter or unit of the course.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique within the course, e.g. `html_module_01`. |
| `title` | string | Yes | Module name shown to learners. |
| `prerequisite` | string \| null | Yes | `id` of a module that must be completed first, or `null` for the first module. |
| `lessons` | array | Yes | One or more lessons in order. |

**Example:**

```json
{
  "id": "module_01",
  "title": "Getting Started",
  "prerequisite": null,
  "lessons": [ ... ]
}
```

```json
{
  "id": "module_02",
  "title": "Building on the Basics",
  "prerequisite": "module_01",
  "lessons": [ ... ]
}
```

---

## Lessons

Each lesson is one teaching step: reading content, instructor speech, then optional questions.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique within the course, e.g. `lesson_01`. |
| `title` | string | Yes | Lesson title. |
| `body` | string | Recommended | Text shown in the lesson panel. |
| `avatar_script` | string | Recommended | What the AI instructor **speaks**. Can differ from `body` (shorter, conversational). |
| `media` | object | Yes | Use `{}` if empty. Optional `image` or `video` URLs. |
| `questions` | array | Yes | Can be `[]` for intro-only lessons. |
| `next_lesson_id` | string \| null | Yes | `id` of the next lesson, or `null` on the **last** lesson of the course. |

**At least one of `body` or `avatar_script` is required.**

**Example:**

```json
{
  "id": "lesson_01",
  "title": "What is HTML?",
  "body": "HTML stands for HyperText Markup Language. It structures web pages...",
  "avatar_script": "Welcome! HTML is the foundation of every website. Think of it as the skeleton of a page...",
  "media": {},
  "questions": [ ... ],
  "next_lesson_id": "lesson_02"
}
```

### Writing good `avatar_script` text

- Write how you would **speak** to a student, not like a textbook.
- Keep sentences clear; the instructor reads this aloud.
- End lessons with a natural lead-in to questions when applicable.

### Media (optional)

```json
"media": {
  "image": "https://example.com/diagram.png",
  "video": "https://example.com/intro.mp4"
}
```

Use HTTPS URLs. If you have no media, use `"media": {}`.

---

## Questions

Every lesson has a `questions` array. Supported types:

| `type` | Purpose |
|--------|---------|
| `multiple_choice` | Student picks one option. |
| `true_false` | Student picks true or false. |
| `code_test` | Student writes code; system checks against `testCriteria`. |

### Shared question fields

| Field | Type | Required | Notes |
|-------|------|----------|--------|
| `id` | string | Recommended | Unique within the lesson, e.g. `q1`, `html_q1`. |
| `type` | string | Yes | `multiple_choice`, `true_false`, or `code_test`. |
| `question` | string | Yes | Question text (spoken for non-code; shown in UI). |
| `explanation` | string | Recommended | Feedback after submit (correct or incorrect). |

---

### Multiple choice

```json
{
  "id": "q1_multiple_choice",
  "type": "multiple_choice",
  "question": "What does HTML stand for?",
  "options": [
    "HyperText Markup Language",
    "High Tech Modern Language",
    "Home Tool Markup Language",
    "Hyperlink Text Management Language"
  ],
  "answer": "HyperText Markup Language",
  "explanation": "HTML stands for HyperText Markup Language — the standard language for web pages."
}
```

| Field | Required |
|-------|----------|
| `options` | Yes — array of strings (typically 3–4). |
| `answer` | Yes — must **exactly match** one string in `options`. |

---

### True / false

```json
{
  "id": "q2_true_false",
  "type": "true_false",
  "question": "HTML is used to style the colors of a webpage.",
  "answer": false,
  "explanation": "HTML structures content. CSS is used for styling and colors."
}
```

| Field | Required |
|-------|----------|
| `answer` | Yes — boolean: `true` or `false` (not strings). |

---

### Code test

Used for hands-on coding (JavaScript, HTML, CSS, Python, etc.).

```json
{
  "id": "q3_code_test",
  "type": "code_test",
  "question": "Create a variable called 'message' and set it to 'Hello World'",
  "explanation": "Great! Variables store values you can use later.",
  "code_example": {
    "code": "let message = 'Hello World';\nconsole.log(message);",
    "language": "javascript",
    "description": "Creating a variable",
    "explanation": "Watch: we use 'let', then the name, then the value in quotes.",
    "autoRun": false,
    "typingSpeed": 60
  },
  "testCriteria": {
    "expectedJS": "let message"
  }
}
```

| Field | Required | Notes |
|-------|----------|--------|
| `code_example` | Optional but recommended | Instructor demo before the student codes. **Only on `code_test` questions.** |
| `testCriteria` | Yes for grading | How the app checks the student’s code. |

---

## Code examples and tests

### Important rule: `code_example` only on questions

- **Do** put `code_example` inside a `code_test` **question**.
- **Do not** put `code_example` on a **lesson** object. Validation will fail.

The instructor teaches code from the question’s `code_example`, then asks the `question` text.

### `code_example` fields

| Field | Type | Description |
|-------|------|-------------|
| `code` | string | Code shown/typed by the instructor. Use `\n` for new lines. |
| `language` | string | e.g. `javascript`, `html`, `css`, `python`. |
| `description` | string | Optional short label. |
| `explanation` | string | Optional spoken walkthrough of the code. |
| `autoRun` | boolean | Optional. If `true`, code may run automatically after typing. |
| `typingSpeed` | number | Optional. Characters per second for typing animation (e.g. `60`). |

### `testCriteria` options

Use one or more checks appropriate to the exercise:

| Field | Use when |
|-------|----------|
| `expectedJS` | Student code must **contain** this substring (e.g. `"let message"`, `"function greet"`). |
| `expectedHTML` | HTML output must match/contain expected markup pattern. |
| `expectedCSS` | CSS must match/contain expected rule (e.g. `"font-size: 20px;"`). |
| `expectedVariable` | A variable with this name must exist after running code. |
| `expectedValue` | A variable must equal this value. |
| `expectedValues` | Multiple acceptable values. |
| `expectedFunction` | A function with this name must exist. |
| `expectedCode` | Full code must match a regular expression (string form). |
| `testCases` | Array of `{ "input": [...], "expected": ... }` for function tests. |

**Example (HTML):**

```json
"testCriteria": {
  "expectedHTML": "<h1>Hello</h1>"
}
```

**Example (CSS):**

```json
"testCriteria": {
  "expectedCSS": "color: blue;"
}
```

**Example (JavaScript substring):**

```json
"testCriteria": {
  "expectedJS": "console.log"
}
```

---

## Linking lessons (`next_lesson_id`)

Lessons play in **module order**, then **lesson order** within each module. `next_lesson_id` helps the app know what comes next and when to show “Next lesson”.

| Situation | `next_lesson_id` |
|-----------|------------------|
| Another lesson follows in the same or next module | That lesson’s `id` |
| Last lesson in the entire course | `null` |

**Tips:**

- Use **unique** lesson `id` values across the whole course (avoid reusing `lesson_01` in every module).
- Prefer a consistent prefix per course: `html_lesson_01`, `py_lesson_01`.
- The last lesson in the course should have `"next_lesson_id": null`.

---

## Categories

`category` controls which **folder** the course appears under on the course listing page.

| Value | Folder title | Typical use |
|-------|----------------|-------------|
| `coding` | Coding | Programming, web, software |
| `design` | Design | UI, UX, creative skills |
| `data` | Data | Data, analytics, machine learning |
| `careers` | Careers & practice | Professional skills, engineering habits |

**Example:**

```json
"category": "coding"
```

Must be **exactly** one of: `coding`, `design`, `data`, `careers` (lowercase).

---

## Naming conventions

Good IDs are short, unique, and predictable:

| Item | Pattern | Example |
|------|---------|---------|
| Slug | `topic-level` or `topic_topic` | `python-beginner`, `css_flex_grid_lessons` |
| Module | `{prefix}_module_{nn}` | `html_module_01` |
| Lesson | `{prefix}_lesson_{nn}` | `html_lesson_01` |
| Question | `{prefix}_q{n}` or descriptive | `html_q1`, `q1_multiple_choice` |

Avoid:

- Spaces in IDs
- Duplicate lesson IDs in one course
- Special characters in `slug` (stick to letters, numbers, `-`, `_`)

---

## Common mistakes

| Mistake | Fix |
|---------|-----|
| Trailing comma after last item in array/object | Remove it — JSON does not allow trailing commas |
| Single quotes instead of double quotes | JSON requires `"` for strings |
| `answer: "true"` for true/false | Use boolean: `true` or `false` |
| `code_example` on a lesson | Move it to the `code_test` question only |
| `code_example` on multiple_choice / true_false | Remove — only for `code_test` |
| Multiple choice `answer` not in `options` | `answer` must match an option string exactly |
| Missing `category` | Add one of: coding, design, data, careers |
| Missing `age` or `class` | Add both — required for course listing filters |
| Empty `modules` array | Add at least one module with lessons |
| Reused lesson IDs across modules | Use unique IDs (e.g. `mod2_lesson_01`) |
| Last lesson has a `next_lesson_id` pointing nowhere | Use `null` on the final lesson |

---

## Pre-publish checklist

Before you click **Publish curriculum**:

- [ ] File is valid JSON (no syntax errors)
- [ ] `slug` is unique and URL-friendly
- [ ] `title`, `description`, `language`, `category`, `age`, `class` are set
- [ ] At least one module with at least one lesson
- [ ] Every lesson has `id`, `title`, `body` or `avatar_script`, `media`, `questions`, `next_lesson_id`
- [ ] Final lesson has `"next_lesson_id": null`
- [ ] All multiple choice answers match an option exactly
- [ ] All true/false answers are booleans
- [ ] Code tests have `testCriteria`; demos use `code_example` on the question only
- [ ] Previewed full course in Curriculum Preview (every lesson and question)
- [ ] Instructor speech sounds natural when read aloud

---

## Minimal valid example

Copy and extend this skeleton:

```json
{
  "slug": "my-course-slug",
  "curriculum": {
    "title": "My Course Title",
    "description": "What students will learn.",
    "language": "en",
    "category": "coding",
    "age": 10,
    "class": "Primary 5",
    "grade": 5,
    "modules": [
      {
        "id": "module_01",
        "title": "Introduction",
        "prerequisite": null,
        "lessons": [
          {
            "id": "lesson_01",
            "title": "First Lesson",
            "body": "Lesson text for the student to read.",
            "avatar_script": "Welcome! Let's learn something new today.",
            "media": {},
            "questions": [
              {
                "id": "q1",
                "type": "multiple_choice",
                "question": "Are you ready to learn?",
                "options": ["Yes", "No"],
                "answer": "Yes",
                "explanation": "Great attitude!"
              }
            ],
            "next_lesson_id": null
          }
        ]
      }
    ]
  }
}
```

---

## Need help?

1. Use **Curriculum Preview** — upload your JSON and fix every error listed.
2. Download the built-in **template** from the same page for a full working example.
3. Compare your file to existing courses in `src/data/*.json` (e.g. `web-development-basics.json`).

When your file passes validation and preview looks correct end-to-end, you are ready to publish.
