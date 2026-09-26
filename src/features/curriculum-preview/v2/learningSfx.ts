/**
 * Learning feedback SFX (Duolingo-inspired encouragement cues).
 *
 * Assets live in /public/sounds/learning — 5 variants per scenario.
 * Switch the active clip via ACTIVE_VARIANTS or localStorage
 * (`ryd-learning-sfx-variants`). See public/sounds/learning/CATALOG.md.
 */

import { emitLearningStreak } from "./learningStreakEvents";

export type LearningSfxKind = "correct" | "wrong" | "streak" | "moduleComplete";

const STORAGE_VARIANTS = "ryd-learning-sfx-variants";
const STORAGE_MUTED = "ryd-learning-sfx-muted";

/** Mark HTMLAudioElements so stopAvatarSpeech does not tear them down. */
export const LEARNING_SFX_ATTR = "data-ryd-learning-sfx";

/**
 * Change these (1–5) to pick which clip plays for the stakeholder demo.
 * localStorage overrides take precedence when present.
 */
export const ACTIVE_VARIANTS: Record<LearningSfxKind, number> = {
  correct: 3,
  wrong: 1,
  streak: 1,
  moduleComplete: 1,
};

const SFX_FILES: Record<LearningSfxKind, readonly string[]> = {
  correct: [
    "/sounds/learning/correct/01-correct-answer-tone.mp3",
    "/sounds/learning/correct/02-correct-answer-reward.mp3",
    "/sounds/learning/correct/03-correct-positive-notification.mp3",
    "/sounds/learning/correct/04-correct-answer-notification.mp3",
    "/sounds/learning/correct/05-correct-positive-answer.mp3",
  ],
  wrong: [
    "/sounds/learning/wrong/01-wrong-fail-notification.mp3",
    "/sounds/learning/wrong/02-soft-reject-tone.mp3",
    "/sounds/learning/wrong/03-musical-game-over.mp3",
    "/sounds/learning/wrong/04-player-losing-or-failing.mp3",
    "/sounds/learning/wrong/05-wrong-bass-buzzer.mp3",
  ],
  streak: [
    "/sounds/learning/streak/01-arcade-bonus-alert.mp3",
    "/sounds/learning/streak/02-winning-extra-bonus.mp3",
    "/sounds/learning/streak/03-fantasy-game-success.mp3",
    "/sounds/learning/streak/04-ethereal-fairy-win.mp3",
    "/sounds/learning/streak/05-quick-positive-game.mp3",
  ],
  moduleComplete: [
    "/sounds/learning/module-complete/01-game-level-completed.mp3",
    "/sounds/learning/module-complete/02-completion-of-a-level.mp3",
    "/sounds/learning/module-complete/03-medieval-fanfare.mp3",
    "/sounds/learning/module-complete/04-achievement-completed.mp3",
    "/sounds/learning/module-complete/05-winning-notification.mp3",
  ],
};

/** Consecutive-correct counts that play the streak cue instead of correct. */
export const STREAK_MILESTONES = [3, 5, 8, 10, 15] as const;

const VOLUME: Record<LearningSfxKind, number> = {
  correct: 0.42,
  wrong: 0.36,
  streak: 0.48,
  moduleComplete: 0.5,
};

type VariantMap = Partial<Record<LearningSfxKind, number>>;

function readStoredVariants(): VariantMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_VARIANTS);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as VariantMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function isMuted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_MUTED) === "1";
  } catch {
    return false;
  }
}

function clampVariant(kind: LearningSfxKind, value: number): number {
  const max = SFX_FILES[kind].length;
  if (!Number.isFinite(value)) return 1;
  return Math.min(max, Math.max(1, Math.round(value)));
}

export function resolveLearningSfxVariant(kind: LearningSfxKind): number {
  const stored = readStoredVariants()[kind];
  const chosen = typeof stored === "number" ? stored : ACTIVE_VARIANTS[kind];
  return clampVariant(kind, chosen);
}

export function resolveLearningSfxSrc(kind: LearningSfxKind): string {
  const variant = resolveLearningSfxVariant(kind);
  return SFX_FILES[kind][variant - 1]!;
}

export function isStreakMilestone(streak: number): boolean {
  return (STREAK_MILESTONES as readonly number[]).includes(streak);
}

let activeAudio: HTMLAudioElement | null = null;

/**
 * Play a short learning feedback cue. Safe to call during avatar TTS —
 * SFX elements are tagged so speech cleanup will not stop them.
 */
export function playLearningSfx(kind: LearningSfxKind): void {
  if (typeof window === "undefined") return;
  if (isMuted()) return;

  const src = resolveLearningSfxSrc(kind);

  try {
    if (activeAudio) {
      activeAudio.pause();
      activeAudio = null;
    }

    const audio = new Audio(src);
    audio.setAttribute(LEARNING_SFX_ATTR, "true");
    audio.volume = VOLUME[kind];
    activeAudio = audio;

    const clear = () => {
      if (activeAudio === audio) activeAudio = null;
    };
    audio.addEventListener("ended", clear);
    audio.addEventListener("error", clear);

    void audio.play().catch(() => {
      // Autoplay may be blocked until a user gesture unlocks audio.
      clear();
    });
  } catch {
    // Ignore — SFX must never break the lesson flow.
  }
}

/** Play correct, or streak when the consecutive count hits a milestone. */
export function playCorrectOrStreakSfx(streak: number): void {
  if (isStreakMilestone(streak)) {
    playLearningSfx("streak");
    return;
  }
  playLearningSfx("correct");
}

type LearningStreakState = {
  /** Consecutive corrects that have counted toward streak this lesson. */
  current: number;
  /** Question keys that already contributed a streak tick (prevents re-answer farming). */
  countedKeys: Set<string>;
};

/** Create streak state for a lesson session (v1 CourseDetails / v2 LessonPlayer). */
export function createLearningStreakState(): LearningStreakState {
  return { current: 0, countedKeys: new Set() };
}

/**
 * Shared answer-outcome control for v1 CourseDetails and v2 LessonPlayer.
 * Updates consecutive-correct streak and plays the matching cue.
 * Each `questionKey` can only increase the streak once until it is missed again.
 * Does not change curriculum flow — callers keep their own submit/advance logic.
 */
export function notifyLearningAnswerOutcome(
  correct: boolean,
  streak: LearningStreakState,
  questionKey: string,
): void {
  const key = questionKey.trim();

  if (correct) {
    // Already earned streak credit for this question — play correct SFX only.
    if (key && streak.countedKeys.has(key)) {
      playLearningSfx("correct");
      return;
    }
    if (key) streak.countedKeys.add(key);
    streak.current += 1;
    playCorrectOrStreakSfx(streak.current);
    if (streak.current >= 3) {
      emitLearningStreak(streak.current);
    }
    return;
  }

  // Wrong breaks the consecutive streak. Allow this question to count again later
  // if they come back and get it right after the streak has reset.
  streak.current = 0;
  if (key) streak.countedKeys.delete(key);
  playLearningSfx("wrong");
}

/** Reset streak when starting a new lesson (v1) or remounting a player (v2). */
export function resetLearningAnswerStreak(streak: LearningStreakState): void {
  streak.current = 0;
  streak.countedKeys.clear();
}
