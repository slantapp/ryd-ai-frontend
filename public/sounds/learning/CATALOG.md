# Learning SFX catalog

Royalty-free Mixkit sound effects (Mixkit License). Five variants per scenario for stakeholder A/B listening.

## How to switch variants

Same control for **v1** (`CourseDetails` / `MathCourseDetails`) and **v2** (`LessonPlayer`).

**Option A — code defaults**  
Edit `ACTIVE_VARIANTS` in `src/features/curriculum-preview/v2/learningSfx.ts` (values `1`–`5`).

**Option B — browser console (no rebuild)**

```js
localStorage.setItem(
  "ryd-learning-sfx-variants",
  JSON.stringify({ correct: 2, wrong: 1, streak: 3, moduleComplete: 1 }),
);
location.reload();
```

Mute all learning SFX:

```js
localStorage.setItem("ryd-learning-sfx-muted", "1");
```

## correct

| # | File | Mixkit ID |
|---|------|-----------|
| 1 | `01-correct-answer-tone.mp3` | 2870 |
| 2 | `02-correct-answer-reward.mp3` | 952 |
| 3 | `03-correct-positive-notification.mp3` | 957 |
| 4 | `04-correct-answer-notification.mp3` | 947 |
| 5 | `05-correct-positive-answer.mp3` | 949 |

## wrong

| # | File | Mixkit ID |
|---|------|-----------|
| 1 | `01-wrong-fail-notification.mp3` | 946 |
| 2 | `02-soft-reject-tone.mp3` | 2863 |
| 3 | `03-musical-game-over.mp3` | 959 |
| 4 | `04-player-losing-or-failing.mp3` | 2042 |
| 5 | `05-wrong-bass-buzzer.mp3` | 948 |

## streak

| # | File | Mixkit ID |
|---|------|-----------|
| 1 | `01-arcade-bonus-alert.mp3` | 767 |
| 2 | `02-winning-extra-bonus.mp3` | 2060 |
| 3 | `03-fantasy-game-success.mp3` | 270 |
| 4 | `04-ethereal-fairy-win.mp3` | 2019 |
| 5 | `05-quick-positive-game.mp3` | 265 |

## module-complete

| # | File | Mixkit ID |
|---|------|-----------|
| 1 | `01-game-level-completed.mp3` | 2059 |
| 2 | `02-completion-of-a-level.mp3` | 2063 |
| 3 | `03-medieval-fanfare.mp3` | 226 |
| 4 | `04-achievement-completed.mp3` | 2068 |
| 5 | `05-winning-notification.mp3` | 2018 |
