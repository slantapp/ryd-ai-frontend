/**
 * Compact display for school class + optional international grade number.
 * e.g. "Grade 7 (JSS1)" — grade first, local class in parentheses.
 */
function normalizeSchoolClassLabel(schoolClass: string): string {
  return schoolClass
    .replace(/\bJSS\s+(\d+)\b/gi, "JSS$1")
    .replace(/\bSS\s+(\d+)\b/gi, "SS$1")
    .trim();
}

export function formatSchoolClassDisplay(
  schoolClass: string | undefined,
  grade?: number,
): string | null {
  const label = schoolClass?.trim();
  const hasGrade =
    typeof grade === "number" && Number.isFinite(grade) && grade > 0;

  if (!label && !hasGrade) return null;
  if (!hasGrade) return normalizeSchoolClassLabel(label ?? "");
  if (!label) return `Grade ${grade}`;

  const normalized = normalizeSchoolClassLabel(label);
  if (new RegExp(`grade\\s*${grade}\\b`, "i").test(normalized)) {
    return `Grade ${grade}`;
  }

  return `Grade ${grade} (${normalized})`;
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

function gradeFromFilterKey(key: string): number {
  const gradePart = key.split("|")[1];
  const n = Number(gradePart);
  return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
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
    .sort((a, b) => {
      const gradeDiff = gradeFromFilterKey(a.key) - gradeFromFilterKey(b.key);
      if (gradeDiff !== 0) return gradeDiff;
      return a.label.localeCompare(b.label);
    });
}
