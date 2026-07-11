import type { CurriculumV2Data } from "./types";

/** True when JSON is (or wraps) a schema_version 2 curriculum with flow-based lessons. */
export function isCurriculumV2(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const root = data as Record<string, unknown>;

  if (root.schema_version === 2) return true;

  const curriculum =
    root.curriculum && typeof root.curriculum === "object"
      ? (root.curriculum as Record<string, unknown>)
      : root;

  if (curriculum.schema_version === 2) return true;

  if (!Array.isArray(curriculum.modules) || curriculum.modules.length === 0) {
    return false;
  }

  const firstModule = curriculum.modules[0] as Record<string, unknown> | undefined;
  const firstLesson = Array.isArray(firstModule?.lessons)
    ? (firstModule.lessons[0] as Record<string, unknown> | undefined)
    : undefined;

  return Array.isArray(firstLesson?.flow);
}

export function extractCurriculumV2Data(data: unknown): {
  data: CurriculumV2Data;
  slug?: string;
} {
  const root = data as Record<string, unknown>;
  if ("curriculum" in root && root.curriculum && typeof root.curriculum === "object") {
    return {
      data: root.curriculum as CurriculumV2Data,
      slug: typeof root.slug === "string" ? root.slug : undefined,
    };
  }
  return { data: root as unknown as CurriculumV2Data };
}
