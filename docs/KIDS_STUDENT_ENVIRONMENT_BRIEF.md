# Kids / Student Learning Environment — Build Brief

Use this document to prompt an agent (or developer) to implement the **real student-facing kids environment** for RYD Learning, on top of the existing **Curriculum v2 flow engine**.

Related docs:

- [`docs/CURRICULUM_V2_GUIDE.md`](./CURRICULUM_V2_GUIDE.md) — v2 schema, beats, speech progression
- [`docs/CURRICULUM_V2_SAMPLE.json`](./CURRICULUM_V2_SAMPLE.json) — example flow curriculum
- `src/features/curriculum-preview/v2/` — current preview player (reference implementation)

---

## 1. Goal

Build a **kid-first classroom experience** that feels like a human teaching session:

> Hook → short explain → show example → pause to look → micro-check → guided practice → recap → bridge

Not:

- a rigid property bag (`body` → `avatar_script` → all questions)
- an adult LMS dashboard
- a long lecture with occasional Continue clicks

The preview (`CurriculumV2Preview` + `LessonPlayer`) proves the **flow engine** and now **simulates the student learning loop** for teachers (retry on wrong answers, `speak_body`, pause keeps demos).  
The student app should reuse that engine, but replace the **presentation layer** with a playful, focused kids stage.

---

## 2. What already exists (do not reinvent)

### Engine (keep / reuse)

- Flow-based lessons: `lesson.flow[]` of beats
- Beat types: `speak`, `display`, `media`, `code_demo`, `formula_demo`, `question`, `pause`, `recap`, `bridge`
- Advance modes: `auto`, `manual`, `on_answer`
- Avatar speech sequencing (`speakSequence`, goal spoken once per lesson)
- Pause after demo **keeps example visible** for review
- Real `CodeEditor` / `WebCodeWorkspace` / `TestResults` for coding beats
- Validation/detect for v2 JSON in curriculum preview upload

### Preview-only (do not copy blindly into student UI)

- Teacher upload / publish controls
- Full course outline always visible
- Instructor A/B selector as primary chrome
- Dense “step dots” / adult preview tooling

### Production student app today

- Still largely v1 lesson runner (`CourseDetails` / `MathCourseDetails`)
- Student rollout should migrate to v2 flow player when ready

---

## 3. JSON structure guidance

### Do NOT redesign v2

Keep `schema_version: 2` and `flow` beats as the source of truth.

### Authoring rules (immediate, no schema change)

1. Prefer short avatar lines (1–2 sentences).
2. Prefer many small beats over one huge `display`.
3. Put micro `question` beats mid-lesson, not only at the end.
4. After `code_demo` / `formula_demo`, use `pause` so kids can look.
5. End with `recap` + `bridge`.
6. Avoid relying on reading the entire `body` aloud; keep on-screen reading support.

### Additive schema (supported in preview student simulation)

These fields are validated and honored in `CurriculumV2Preview` / `LessonPlayer` so teachers experience the same pedagogy students will.

#### A. Optional on `display`

```json
"speak_body": false,
"avatar": { "text": "Short kid summary only." }
```

If `speak_body` is false, show full body on screen but do not TTS the whole body.

#### B. Optional on `question`

```json
"retry": {
  "max": 2,
  "hint": "Look at the quotes around the text.",
  "on_exhausted": "continue"
}
```

Behavior:

- wrong → speak hint / `on_wrong` → stay on beat
- after max retries → speak explanation → advance (or optional remediate beat id)

Curriculum-level default: `defaults.question_retry` (preview defaults to `max: 2` even when omitted).

#### C. Optional on `pause`

```json
"keep_previous": true
```

Keeps the prior code/formula demo visible during the pause (default when the previous beat was a demo).

#### D. New beat type later: `interact` (kid micro-response)

```json
{
  "id": "tap_quotes",
  "type": "interact",
  "kind": "tap_target",
  "phase": "assess",
  "prompt": "Tap the quotes in the example",
  "targets": [
    { "id": "quotes", "label": "quotation marks", "correct": true },
    { "id": "console", "label": "console.log", "correct": false }
  ],
  "avatar": {
    "on_ask": "Can you find the quotes?",
    "on_correct": "Yes! Those quotes mean text.",
    "on_wrong": "Not that one — look at the text inside the message."
  },
  "advance": "on_answer",
  "retry": { "max": 2 }
}
```

Suggested `kind` values (implement incrementally):

- `tap_target` — tap the right part of an example
- `choice_chips` — 2–3 big kid choices (not a formal quiz card)
- `confirm` — “I see it!” / “Ready to try”
- `order_steps` — put steps in order (later)

---

## 4. Product requirements — kids student environment

### 4.1 One job on screen

During a lesson, the first viewport should feel like **one classroom moment**, not a dashboard.

Primary composition:

```
┌──────────────────────────────────────────────┐
│  Board / example / question (dominant)       │
│                                              │
│  Avatar (corner or bottom strip)             │
│  One clear action: Continue / Try / Submit   │
└──────────────────────────────────────────────┘
```

Hide or minimize during active lesson:

- full module tree
- publish/upload controls
- dense metadata

Show outline mainly:

- between lessons
- on explicit “Lessons” menu

### 4.2 Interaction density

Target: a meaningful kid action about every **60–90 seconds**.

Actions can be:

- Continue after a short look
- Micro tap/choice
- Quick true/false or MC
- Run / submit code
- “I noticed it” confirm on pause

Avoid: long uninterrupted speech with no response opportunity.

### 4.3 Speech rules for kids

- Speak short chunks.
- Do not always read full `display.body`.
- Always speak feedback on answers.
- Speak goal **once** at lesson start.
- During pause, keep example visible and invite looking.

### 4.4 Wrong-answer pedagogy

Default student behavior:

1. Incorrect → warm feedback + hint
2. Retry same beat
3. After retries exhausted → short explanation → continue
4. Optional: jump to a small remediate beat, then return

Do not shame. Keep tone encouraging.

### 4.5 Celebration / motivation

Lightweight, not noisy:

- Avatar praise line
- Simple star/stamp on beat or lesson complete
- Clear “Next adventure” bridge CTA
- Avoid cluttered stats in the first viewport

### 4.6 Code experience by age

- Younger track: large font, big Run button, fewer controls, locked demo then clear “Your turn”
- Older track: full Monaco / web workspace (current editors are fine)

### 4.7 Brand / UI

- Use app `primary` and primary shades
- Clear large tap targets
- High readability
- Avoid generic “AI SaaS” card stacks, purple glow clichés, and dashboard chrome
- Match existing RYD visual language where possible

---

## 5. Technical implementation plan

### Phase 1 — Extract shared flow engine

1. Move beat player core out of preview-only usage into a shared module, e.g.:
   - `src/features/lesson-flow/` (types, speech helpers, `LessonPlayer` core)
2. Keep preview as a thin teacher shell around the same player.
3. Ensure v1 courses still work until migrated.

### Phase 2 — Student shell (kids stage)

1. New student route/page using v2 curricula from API.
2. Layout: board-first + avatar + single CTA.
3. Progress persistence: `{ lessonId, beatIndex, attempts? }` (not only questionIndex).
4. Mobile: avatar compact strip; board remains primary.

### Phase 3 — Pedagogy upgrades

1. Question retry loops
2. `display.speak_body` support
3. First `interact` beat kind (`choice_chips` or `tap_target`)
4. Pause prompts with optional confirm button

### Phase 4 — Polish

1. Celebrations / stamps
2. Better wrong-path remediation
3. Accessibility (focus, tap size, reduced motion option)
4. Analytics: beat completion, retries, drop-off

---

## 6. Acceptance criteria

### Must have

- [ ] Student can complete a v2 lesson beat-by-beat with avatar speech
- [ ] Flow order is author-controlled via `flow[]`
- [ ] Demo → pause keeps example visible
- [ ] Questions can appear mid-lesson
- [ ] Continue / Submit are obvious for kids
- [ ] Progress restores to correct `beatIndex`
- [ ] Works on mobile and desktop

### Should have

- [ ] Retry on incorrect answers
- [ ] Short-speech mode for display bodies
- [ ] At least one micro-interact beat type
- [ ] Kid-simple chrome (outline not always open)

### Nice to have

- [ ] Remediation branch beats
- [ ] Stamps/stars
- [ ] Age-based editor simplicity modes

---

## 7. Explicit non-goals (for first student rollout)

- Do not invent a third unrelated curriculum format
- Do not require all old v1 courses to be hand-rewritten before launch (use adapter/compiler if needed)
- Do not build a content CMS in this phase
- Do not overload the first viewport with stats, badges, and marketing widgets

---

## 8. Prompt template (paste to an agent later)

```text
Implement the RYD kids/student learning environment using the brief in
docs/KIDS_STUDENT_ENVIRONMENT_BRIEF.md.

Context:
- Curriculum v2 flow engine already exists in preview:
  src/features/curriculum-preview/v2/
- Docs: docs/CURRICULUM_V2_GUIDE.md and docs/CURRICULUM_V2_SAMPLE.json
- Goal: teach like a human session for kids, not an adult dashboard

Please:
1. Reuse the v2 beat player; do not redesign the JSON core.
2. Build a kid-first student stage (board-dominant, avatar present, one clear CTA).
3. Preserve demo→pause example visibility.
4. Add retry behavior for questions.
5. Keep changes additive to schema if new interactivity is needed.
6. Follow existing primary brand colors and codebase patterns.
7. Ship in small PR-sized steps and summarize what to test.
```

---

## 9. Suggested first implementation slice

Smallest valuable student slice:

1. Shared `LessonPlayer` usable outside preview
2. Student page that loads one v2 curriculum lesson
3. Kids stage layout
4. Progress by `beatIndex`
5. Question retry (max 2)

Then iterate on `interact` beats and polish.

---

## 10. JSON / flow decision summary

| Question | Answer |
|----------|--------|
| Redesign v2 JSON? | **No** — keep `flow` beats |
| Change teaching flow pattern? | **Authoring only** — shorter beats, more mid-lesson checks, demo→pause→practice |
| Schema changes needed for kids app? | **Mostly done in preview** — `retry`, `speak_body`, `keep_previous`; optional `interact` beat still later |
| Best next product step? | Kid-first student stage on top of existing engine |
