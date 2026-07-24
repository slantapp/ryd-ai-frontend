/**
 * True when the learner should see the patience banner — the lesson is active,
 * the instructor was asked to speak, but audio has not started yet.
 */
export function isInstructorWaitActive({
  isPaused = false,
  hasPendingSpeech = false,
  awaitingSpeech = false,
  lessonActive = true,
}: {
  isPaused?: boolean;
  /** @deprecated Avatar readiness alone should not trigger the banner. */
  isAvatarReady?: boolean;
  hasPendingSpeech?: boolean;
  awaitingSpeech?: boolean;
  /** When false (e.g. start gate), never show the wait banner. */
  lessonActive?: boolean;
}): boolean {
  if (!lessonActive || isPaused) return false;
  return hasPendingSpeech || awaitingSpeech;
}
