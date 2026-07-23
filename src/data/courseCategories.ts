import {
  BookOpen,
  BookText,
  Braces,
  Briefcase,
  Calculator,
  Database,
  Palette,
  type LucideIcon,
} from "lucide-react";

/**
 * High-level course groupings for the library (folder-style navigation).
 * Any curriculum `category` string is accepted; known ids get preset labels/icons.
 */
export type CourseCategoryId = string;

export type CourseCategory = {
  id: CourseCategoryId;
  title: string;
  subtitle: string;
};

/** Preset folders with friendly copy — extend when you want defaults for new slugs. */
export const COURSE_CATEGORIES: CourseCategory[] = [
  {
    id: "coding",
    title: "Coding",
    subtitle: "Programming, web, and software foundations",
  },
  {
    id: "mathematics",
    title: "Mathematics",
    subtitle: "Numbers, algebra, geometry, and problem solving",
  },
  {
    id: "english",
    title: "English",
    subtitle: "Reading, writing, grammar, and comprehension",
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

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  coding: Braces,
  mathematics: Calculator,
  english: BookText,
  design: Palette,
  data: Database,
  careers: Briefcase,
};

/** Curricula / placeholder slugs → category (extend when new courses ship). */
export const COURSE_SLUG_TO_CATEGORY: Partial<Record<string, CourseCategoryId>> =
  {
    "web-development-basics": "coding",
    "css-basics": "coding",
    "html-css-combined": "coding",
    "javascript-beginner": "coding",
    "web-basics": "coding",
    "javascript-intermediate": "coding",
    "javascript-professional": "coding",
    "intro-computer-science": "coding",
    "javascript-fundamentals": "coding",
    "python-programming": "coding",
    "data-structures-algorithms": "coding",
    "software-engineering": "careers",
    "mobile-app-development": "coding",
    "database-management": "data",
    "machine-learning-basics": "data",
    "ui-ux-design-principles": "design",
    "python-beginner": "coding",
    "python-intermediate": "coding",
    "python-advance": "coding",
    css_flex_grid_lessons: "coding",
    "grade-9-basic-skills-review": "mathematics",
  };

export function getCategoryIdForCourseSlug(slug: string): CourseCategoryId {
  return COURSE_SLUG_TO_CATEGORY[slug] ?? "coding";
}

/** Learner age / class filters apply to these categories only (not coding). */
export const FILTERABLE_COURSE_CATEGORIES: CourseCategoryId[] = [
  "mathematics",
  "english",
];

/** Difficulty level filters (Beginner / Intermediate / Advanced) for coding. */
export const LEVEL_FILTERABLE_COURSE_CATEGORIES: CourseCategoryId[] = ["coding"];

export type CourseLevelFilter = "Beginner" | "Intermediate" | "Advanced";

export const COURSE_LEVEL_FILTER_OPTIONS: CourseLevelFilter[] = [
  "Beginner",
  "Intermediate",
  "Advanced",
];

export function formatCategoryTitle(id: string): string {
  return id
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function isAgeClassFilterableCategory(
  categoryId: CourseCategoryId,
): boolean {
  return FILTERABLE_COURSE_CATEGORIES.includes(categoryId);
}

export function isLevelFilterableCategory(
  categoryId: CourseCategoryId,
): boolean {
  return LEVEL_FILTERABLE_COURSE_CATEGORIES.includes(categoryId);
}

export function getCategoryMeta(id: CourseCategoryId): CourseCategory {
  const normalized = id.trim();
  const found = COURSE_CATEGORIES.find((c) => c.id === normalized);
  if (found) return found;

  const title = formatCategoryTitle(normalized || "General");
  return {
    id: normalized || "general",
    title,
    subtitle: `Courses in ${title}`,
  };
}

export function getCategoryIcon(id: CourseCategoryId): LucideIcon {
  return CATEGORY_ICONS[id] ?? BookOpen;
}

/** Categories that appear in the folder view, sorted A–Z by title, with course counts. */
export function listCategoriesWithCounts(
  courses: { categoryId: CourseCategoryId }[],
): { category: CourseCategory; count: number }[] {
  const counts = new Map<CourseCategoryId, number>();
  for (const c of courses) {
    const id =
      typeof c.categoryId === "string" && c.categoryId.trim()
        ? c.categoryId.trim()
        : "coding";
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }

  const out: { category: CourseCategory; count: number }[] = [];
  for (const [id, count] of counts) {
    if (count > 0) out.push({ category: getCategoryMeta(id), count });
  }

  out.sort((a, b) =>
    a.category.title.localeCompare(b.category.title, undefined, {
      sensitivity: "base",
    }),
  );

  return out;
}
