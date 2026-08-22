const SUBMITTED_KEY = "ryd-course-feedback-submitted";
const SKIPPED_FIRST_MODULE_KEY = "ryd-course-feedback-skipped-first-module";

function readSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((s) => typeof s === "string"));
  } catch {
    return new Set();
  }
}

function writeSet(key: string, slugs: Set<string>) {
  localStorage.setItem(key, JSON.stringify([...slugs]));
}

export function hasSubmittedCourseFeedback(courseSlug: string): boolean {
  return readSet(SUBMITTED_KEY).has(courseSlug);
}

export function markCourseFeedbackSubmitted(courseSlug: string) {
  const next = readSet(SUBMITTED_KEY);
  next.add(courseSlug);
  writeSet(SUBMITTED_KEY, next);
  clearFirstModuleFeedbackSkipped(courseSlug);
}

export function hasSkippedFirstModuleFeedback(courseSlug: string): boolean {
  return readSet(SKIPPED_FIRST_MODULE_KEY).has(courseSlug);
}

export function markFirstModuleFeedbackSkipped(courseSlug: string) {
  const next = readSet(SKIPPED_FIRST_MODULE_KEY);
  next.add(courseSlug);
  writeSet(SKIPPED_FIRST_MODULE_KEY, next);
}

export function clearFirstModuleFeedbackSkipped(courseSlug: string) {
  const next = readSet(SKIPPED_FIRST_MODULE_KEY);
  if (!next.delete(courseSlug)) return;
  writeSet(SKIPPED_FIRST_MODULE_KEY, next);
}
