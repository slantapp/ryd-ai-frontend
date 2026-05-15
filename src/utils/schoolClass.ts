/**
 * Compact display for school class + optional international grade number.
 * e.g. "Primary 5 · Gr. 5" — familiar in Nigeria/Africa and clear for Grade-based systems.
 */
export function formatSchoolClassDisplay(
  schoolClass: string | undefined,
  grade?: number,
): string | null {
  const label = schoolClass?.trim();
  const hasGrade =
    typeof grade === "number" && Number.isFinite(grade) && grade > 0;

  if (!label && !hasGrade) return null;
  if (!hasGrade) return label ?? null;
  if (!label) return `Grade ${grade}`;

  if (new RegExp(`grade\\s*${grade}\\b`, "i").test(label)) {
    return label;
  }

  return `${label} · Gr. ${grade}`;
}

/** Stable key for filtering courses by class + grade together. */
export function getSchoolClassFilterKey(
  schoolClass?: string,
  grade?: number,
): string | null {
  const label = schoolClass?.trim();
  const hasGrade =
    typeof grade === "number" && Number.isFinite(grade) && grade > 0;

  if (!label && !hasGrade) return null;
  return `${label ?? ""}|${hasGrade ? grade : ""}`;
}

export function buildSchoolClassFilterOptions(
  courses: Array<{ class?: string; grade?: number }>,
): Array<{ key: string; label: string }> {
  const map = new Map<string, string>();

  for (const course of courses) {
    const key = getSchoolClassFilterKey(course.class, course.grade);
    const label = formatSchoolClassDisplay(course.class, course.grade);
    if (key && label) {
      map.set(key, label);
    }
  }

  return Array.from(map.entries())
    .map(([key, label]) => ({ key, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
}
