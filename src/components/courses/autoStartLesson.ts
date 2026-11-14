/** Set on the course route when a learning-path "Start lesson" tap should skip the course start gate. */
export function wantsAutoStartLesson(state: unknown): boolean {
  return Boolean(
    state &&
      typeof state === "object" &&
      (state as { autoStartLesson?: boolean }).autoStartLesson,
  );
}
