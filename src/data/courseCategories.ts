/**
 * High-level course groupings for the library (folder-style navigation).
 * Map each curriculum slug → category; unknown slugs default to "coding".
 */
export type CourseCategoryId =
  | "coding"
  | "design"
  | "data"
  | "careers";

export type CourseCategory = {
  id: CourseCategoryId;
  title: string;
  subtitle: string;
};

export const COURSE_CATEGORIES: CourseCategory[] = [
  {
    id: "coding",
    title: "Coding",
    subtitle: "Programming, web, and software foundations",
  },
  {
    id: "design",
    title: "Design",
    subtitle: "UI, UX, and creative skills",
  },
  {
    id: "data",
    title: "Data",
    subtitle: "Data, analytics, and machine learning",
  },
  {
    id: "careers",
    title: "Careers & practice",
    subtitle: "Engineering habits, tools, and professional skills",
  },
];

/** Curricula / placeholder slugs → category (extend when new courses ship). */
export const COURSE_SLUG_TO_CATEGORY: Partial<
  Record<string, CourseCategoryId>
> = {
  "web-development-basics": "coding",
  "css-basics": "coding",
  "html-css-combined": "coding",
  "intro-computer-science": "coding",
  "javascript-fundamentals": "coding",
  "python-programming": "coding",
  "data-structures-algorithms": "coding",
  "software-engineering": "careers",
  "mobile-app-development": "coding",
  "database-management": "data",
  "machine-learning-basics": "data",
  "ui-ux-design-principles": "design",
};

export function getCategoryIdForCourseSlug(slug: string): CourseCategoryId {
  return COURSE_SLUG_TO_CATEGORY[slug] ?? "coding";
}

export function getCategoryMeta(id: CourseCategoryId): CourseCategory {
  const found = COURSE_CATEGORIES.find((c) => c.id === id);
  return found ?? COURSE_CATEGORIES[0];
}

/** Categories that appear in the folder view, in display order, with course counts. */
export function listCategoriesWithCounts(
  courses: { categoryId: CourseCategoryId }[]
): { category: CourseCategory; count: number }[] {
  const counts = new Map<CourseCategoryId, number>();
  for (const c of courses) {
    const id = c.categoryId;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  const out: { category: CourseCategory; count: number }[] = [];
  for (const cat of COURSE_CATEGORIES) {
    const n = counts.get(cat.id) ?? 0;
    if (n > 0) out.push({ category: cat, count: n });
  }
  return out;
}
