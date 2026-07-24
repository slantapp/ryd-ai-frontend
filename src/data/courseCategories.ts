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

/** Category id comes from each curriculum's `category` field (any non-empty string). */
export type CourseCategoryId = string;

export type CourseCategory = {
  id: CourseCategoryId;
  title: string;
  subtitle: string;
};

const DEFAULT_CATEGORY_ID = "general";

/** Normalize curriculum category strings for grouping and comparison. */
export function normalizeCategoryId(value: string | undefined | null): string {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed ? trimmed.toLowerCase() : DEFAULT_CATEGORY_ID;
}

/** Human-readable label for a category string, e.g. "computer-science" → "Computer Science". */
export function formatCategoryTitle(categoryId: string): string {
  const normalized = normalizeCategoryId(categoryId);
  if (normalized === DEFAULT_CATEGORY_ID) return "General";

  return normalized
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function getCategoryMeta(id: CourseCategoryId): CourseCategory {
  const normalized = normalizeCategoryId(id);
  const title = formatCategoryTitle(normalized);
  return {
    id: normalized,
    title,
    subtitle: `Explore ${title.toLowerCase()} courses`,
  };
}

/** Pick an icon from category keywords; unknown categories use a book icon. */
export function getCategoryIcon(categoryId: CourseCategoryId): LucideIcon {
  const lower = normalizeCategoryId(categoryId);

  if (lower.includes("math")) return Calculator;
  if (lower.includes("english") || lower.includes("language")) return BookText;
  if (lower.includes("design") || lower.includes("ui") || lower.includes("ux")) {
    return Palette;
  }
  if (
    lower.includes("data") ||
    lower.includes("database") ||
    lower.includes("machine")
  ) {
    return Database;
  }
  if (lower.includes("career") || lower.includes("professional")) {
    return Briefcase;
  }
  if (
    lower.includes("cod") ||
    lower.includes("program") ||
    lower.includes("software") ||
    lower.includes("web") ||
    lower.includes("computer")
  ) {
    return Braces;
  }

  return BookOpen;
}

/** Learner age / class filters for non-coding subject areas. */
export function isAgeClassFilterableCategory(categoryId: CourseCategoryId): boolean {
  const lower = normalizeCategoryId(categoryId);
  return (
    lower === "mathematics" ||
    lower === "math" ||
    lower === "english" ||
    lower.includes("language arts")
  );
}

/** Difficulty level filters for programming-style courses. */
export function isLevelFilterableCategory(categoryId: CourseCategoryId): boolean {
  const lower = normalizeCategoryId(categoryId);
  return (
    lower === "coding" ||
    lower.includes("program") ||
    lower.includes("software") ||
    lower.includes("computer") ||
    lower.includes("web")
  );
}

export type CourseLevelFilter = "Beginner" | "Intermediate" | "Advanced";

export const COURSE_LEVEL_FILTER_OPTIONS: CourseLevelFilter[] = [
  "Beginner",
  "Intermediate",
  "Advanced",
];

/** Categories that appear in the folder view, sorted A–Z, with course counts. */
export function listCategoriesWithCounts(
  courses: { categoryId: CourseCategoryId }[],
): { category: CourseCategory; count: number }[] {
  const counts = new Map<CourseCategoryId, number>();
  for (const course of courses) {
    const id = normalizeCategoryId(course.categoryId);
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }

  const folders: { category: CourseCategory; count: number }[] = [];
  for (const [id, count] of counts) {
    if (count > 0) {
      folders.push({ category: getCategoryMeta(id), count });
    }
  }

  return folders.sort((a, b) =>
    a.category.title.localeCompare(b.category.title, undefined, {
      sensitivity: "base",
    }),
  );
}
