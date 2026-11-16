/** Set on the course route when a learning-path "Start lesson" tap should skip the course start gate. */
export function wantsAutoStartLesson(state: unknown): boolean {
  return Boolean(
    state &&
      typeof state === "object" &&
      (state as { autoStartLesson?: boolean }).autoStartLesson,
  );
}

/** Lesson id from `?playLesson=`, used when a reference guide opens the course in a new tab. */
export function playLessonId(search: string): string | null {
  const id = new URLSearchParams(search).get("playLesson")?.trim();
  return id || null;
}
