# Curriculum Preview v2 (Flow Player)

Kid-friendly preview player for **schema_version 2** flow-based curricula.

## Folder layout

```
v2/
├── index.ts
├── types.ts / detect.ts / validate.ts / defaults.ts / navigation.ts
├── speechText.ts            # Strip markdown for TTS
├── phaseStyles.ts
├── templates/
├── hooks/useTypedText.ts
└── components/
    ├── CurriculumV2Preview.tsx   # Shell: sidebar | avatar | lesson stage
    ├── LessonPlayer.tsx          # Beat interpreter + real CodeEditor
    ├── V2Sidebar.tsx
    ├── BeatProgressBar.tsx
    ├── ContinueButton.tsx
    ├── SubtitleBubble.tsx
    ├── RichBody.tsx
    └── beats/
        ├── ContentBeats.tsx
        └── BridgeBeatView.tsx
```

## Layout (matches classic student preview)

```
┌──────────┬────────────┬─────────────────────────┐
│ Outline  │  Avatar +  │  Lesson stage           │
│ sidebar  │  subtitles │  - teaching text        │
│          │            │  - OR full CodeEditor   │
│          │            │    + TestResults Split  │
└──────────┴────────────┴─────────────────────────┘
```

Code / formula beats take the **full lesson stage** (not a cramped side panel), using the same `CodeEditor` / `WebCodeWorkspace` / `TestResults` as the classic preview.

## Beat flow

```
speak/display → demo → pause → question → recap → bridge
```

Avatar narrates titles, body text, demos, questions, and recap points. Advance modes: `auto` | `manual` | `on_answer`.

On `code_test` practice handoff, optional `code_example.starterCode` seeds the editor (skeleton with comments) instead of wiping it blank.

## Docs

- [`docs/CURRICULUM_V2_GUIDE.md`](../../../../docs/CURRICULUM_V2_GUIDE.md)
- [`docs/CURRICULUM_V2_SAMPLE.json`](../../../../docs/CURRICULUM_V2_SAMPLE.json)
