# Code test contract (teachers)

Use this when authoring any `code_test` question. Following it keeps **Submit** grading and **View correct answer** aligned forever.

## Field meanings

| Field | What it is | What learners see |
|-------|------------|-------------------|
| `code_example.code` | Teach **demo** (instructor types this). May use a different theme (Ada vs Leo). | Demo only |
| `code_example.starterCode` | Practice **skeleton** with TODO comments | Editor on practice handoff |
| `code_example.solutionCode` | Exact **finished practice** answer | **View correct answer** (preferred) |
| `testCriteria.expectedCode` | **Grader** — plain text or `regex:…` | Never show raw regex |
| `testCriteria.expectedHTML` / `expectedCSS` / `expectedJS` | Pane graders | Used when set |
| `testCriteria.domChecks` | Live page checks after Run | Pass/fail only |

Optional alias: `testCriteria.solutionCode` (same role as `code_example.solutionCode`).

## Golden rule

> **`solutionCode` must be the code a correct learner would submit on the practice theme, and it must pass `expectedCode`.**

If the teach demo uses different names/colors than practice, **do not** rely on `code` for View Answer — always set `solutionCode`.

## When `solutionCode` is required in practice

Add it whenever any of these are true:

1. `expectedCode` starts with `regex:`
2. Teach demo theme ≠ practice theme (different names, colors, selectors)
3. `starterCode` has TODO comments the learner must fill

Preview validation **warns** when a regex grader has no `solutionCode`, and **errors** if `solutionCode` fails the grader or looks like regex debris.

## Good example (HTML practice)

```json
{
  "type": "code_test",
  "question": "Add a footer that says Made by Leo.",
  "code_example": {
    "code": "<header>\n  <h1>Ada's Pets</h1>\n</header>\n<footer>\n  <p>Made by Ada, 2026</p>\n</footer>\n",
    "language": "html",
    "runtime": "web",
    "starterCode": "<header>\n  <h1>Leo's Robots</h1>\n</header>\n<!-- TODO: add a footer with Made by Leo -->\n",
    "solutionCode": "<header>\n  <h1>Leo's Robots</h1>\n</header>\n<footer>\n  <p>Made by Leo</p>\n</footer>\n"
  },
  "testCriteria": {
    "expectedCode": "regex:<footer[\\s\\S]*Made\\s+by\\s+Leo[\\s\\S]*</footer>",
    "domChecks": [{ "selector": "footer p", "text": "Made by Leo" }]
  }
}
```

- Demo teaches the **pattern** with Ada.
- Practice uses Leo.
- View Answer shows Leo’s finished page (`solutionCode`), not Ada and not the regex.

## Bad patterns (avoid)

| Mistake | What breaks |
|---------|-------------|
| Putting the practice answer only in `code` while practice uses another theme | View Answer shows the wrong theme |
| Putting a regex in `solutionCode` | Learners see `\s` / `(?:` debris |
| Omitting `solutionCode` with a hard `regex:` grader | View Answer may reconstruct the wrong line or fail |
| `solutionCode` that does not pass `expectedCode` | Submit and View Answer disagree |

## Checklist before publish

1. Run the practice starter yourself → fill TODOs → Submit passes.
2. Copy that finished code into `solutionCode`.
3. Confirm `solutionCode` still passes `expectedCode` (and `domChecks` if used).
4. Preview → exhaust tries → open **View correct answer** → confirm it matches practice theme.
5. Upload; fix any validation **errors**. Treat **warnings** about missing `solutionCode` as blockers for new lessons.

## Samples

- Flow sample: `ryd-learning/docs/CURRICULUM_V2_SAMPLE.json`
- Turtle sample: `ryd-learning/docs/CURRICULUM_V2_TURTLE_SAMPLE.json`
- HTML layout curriculum: `docs/HTML Step 8 - Page Layout Tags.json` (this folder)
- Preview template: `ryd-learning/src/features/curriculum-preview/templates/sample-curriculum.ts`

## Quality check (developers)

From `ryd-learning/`:

```bash
npm run test:curriculum
```

Runs golden fixtures for View Answer + the curriculum code-test lint.
