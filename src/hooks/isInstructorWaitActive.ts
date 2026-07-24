/**
 * True when the learner should see the patience banner — the lesson is active,
 * speech was requested, but audio has not started yet (queued TTS / waiting on avatar).
 */
export function isInstructorWaitActive({
  isPaused = false,
  lessonActive = true,
  hasPendingSpeech = false,
  awaitingSpeech = false,
}: {
  isPaused?: boolean;
  /** Only show while the learner has started the lesson (not on pre-start screens). */
  lessonActive?: boolean;
  hasPendingSpeech?: boolean;
  awaitingSpeech?: boolean;
}): boolean {
  if (isPaused || !lessonActive) return false;
  return hasPendingSpeech || awaitingSpeech;
}
