import type { ApiLearningPath } from "@/api/learningPaths";
import { PALETTES } from "./mockData";
import { buildCourseOutline, type CourseOutline } from "./lessonProgress";
import type { PathNode, PathUnit, Pathway, UnitPalette } from "./types";

const PALETTE_ORDER = ["plum", "iris", "royal", "rose"] as const;
type PaletteKey = (typeof PALETTE_ORDER)[number];

/** Rough lesson time: a few minutes of content plus about a minute per practice question. */
const BASE_LESSON_MINUTES = 4;

export const pathwayId = (apiId: number) => `path-${apiId}`;

function paletteAt(start: PaletteKey, offset: number): UnitPalette {
  const i = (PALETTE_ORDER.indexOf(start) + offset) % PALETTE_ORDER.length;
  return PALETTES[PALETTE_ORDER[i]];
}

export type BuiltPathway = {
  pathway: Pathway;
  /** One outline per course in path order (drives lesson progress). */
  outlines: CourseOutline[];
};

/**
 * API learning path -> page model.
 * - Each course step becomes a band (a PathUnit) labelled with its admin unit.
 * - Each lesson in the course becomes a node, grouped by module (the last lesson of a module is a checkpoint).
 * Courses whose curriculum JSON isn't available are left out.
 */
export function buildPathway(api: ApiLearningPath, getCurriculumJson: (slug: string) => unknown): BuiltPathway {
  const color: PaletteKey = PALETTE_ORDER.includes(api.color) ? api.color : "plum";
  const units: PathUnit[] = [];
  const outlines: CourseOutline[] = [];

  api.units.forEach((apiUnit, unitIndex) => {
    for (const step of apiUnit.steps) {
      const outline = buildCourseOutline(step.slug, step.title, getCurriculumJson(step.slug));
      if (!outline) continue;
      outlines.push(outline);

      const nodes: PathNode[] = outline.lessons.map((lesson) => {
        const lessonNumber = outline.lessons.filter((l) => l.moduleIndex === lesson.moduleIndex && l.flatIndex <= lesson.flatIndex).length;
        return {
          id: lesson.nodeId,
          type: lesson.endsModule ? "checkpoint" : "lesson",
          title: lesson.title,
          description: lesson.moduleTitle,
          minutes: BASE_LESSON_MINUTES + lesson.practiceTotal,
          slug: outline.slug,
          flatIndex: lesson.flatIndex,
          lessonId: lesson.lessonId,
          kindLabel: lesson.endsModule
            ? `Module ${lesson.moduleIndex + 1} checkpoint`
            : `Module ${lesson.moduleIndex + 1} · Lesson ${lessonNumber}`,
        };
      });

      const lessonCount = outline.lessons.length;
      units.push({
        id: `course-${step.id}`,
        title: step.title,
        description:
          step.description?.trim() ||
          `${outline.moduleCount} module${outline.moduleCount === 1 ? "" : "s"} · ${lessonCount} lesson${lessonCount === 1 ? "" : "s"}`,
        palette: paletteAt(color, outlines.length - 1),
        guide: apiUnit.guide ?? [],
        nodes,
        sectionTitle: `Unit ${unitIndex + 1} · ${apiUnit.title}`,
        courseSlug: outline.slug,
      });
    }
  });

  const firstLanguage = api.units.flatMap((u) => u.steps).find((s) => s.language)?.language;
  return {
    pathway: {
      id: pathwayId(api.id),
      title: api.title,
      tagline: api.tagline || api.description || "",
      language: firstLanguage || "en",
      level: api.level,
      icon: api.icon,
      palette: PALETTES[color],
      units,
    },
    outlines,
  };
}
