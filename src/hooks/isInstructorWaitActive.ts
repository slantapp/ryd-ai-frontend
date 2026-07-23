/**
 * True when the learner should see the patience banner — avatar still loading,
 * speech queued before the avatar is ready, or TTS hasn't started yet after speak().
 */
export function isInstructorWaitActive({
  isPaused = false,
  isAvatarReady,
  hasPendingSpeech = false,
  awaitingSpeech = false,
}: {
  isPaused?: boolean;
  isAvatarReady: boolean;
  hasPendingSpeech?: boolean;
  awaitingSpeech?: boolean;
}): boolean {
  if (isPaused) return false;
  return !isAvatarReady || hasPendingSpeech || awaitingSpeech;
}
