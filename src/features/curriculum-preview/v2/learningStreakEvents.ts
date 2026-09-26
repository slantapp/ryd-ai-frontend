/** Tiny pub/sub so any course player can trigger the shared streak popup. */

export type LearningStreakListener = (streak: number) => void;

const listeners = new Set<LearningStreakListener>();

export function subscribeLearningStreak(
  listener: LearningStreakListener,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitLearningStreak(streak: number): void {
  if (!Number.isFinite(streak) || streak < 3) return;
  for (const listener of listeners) {
    try {
      listener(streak);
    } catch {
      // Popup must never break lesson flow.
    }
  }
}

export function streakPopupHeadline(streak: number): string {
  if (streak >= 15) return "Legendary!";
  if (streak >= 10) return "Unstoppable!";
  if (streak >= 8) return "On fire!";
  if (streak >= 5) return "Awesome!";
  return "Nice streak!";
}
