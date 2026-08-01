const STORAGE_KEY = "ryd-course-feedback-submitted";

function readSet(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((s) => typeof s === "string"));
  } catch {
    return new Set();
  }
}

function writeSet(slugs: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...slugs]));
}

export function hasSubmittedCourseFeedback(courseSlug: string): boolean {
  return readSet().has(courseSlug);
}

export function markCourseFeedbackSubmitted(courseSlug: string) {
  const next = readSet();
  next.add(courseSlug);
  writeSet(next);
}
