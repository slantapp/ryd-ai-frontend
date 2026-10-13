import type { ApiLearningPath } from "@/api/learningPaths";
import { PALETTES } from "./palettes";
import { buildCourseOutline, type CourseOutline } from "./lessonProgress";
import type { PathNode, PathUnit, Pathway } from "./types";


/** Rough lesson time: a few minutes of content plus about a minute per practice question. */
const BASE_LESSON_MINUTES = 4;

export const pathwayId = (apiId: number) => `path-${apiId}`;

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
  // Every path uses the app's primary plum.
  const palette = PALETTES.plum;
  const units: PathUnit[] = [];
  const outlines: CourseOutline[] = [];

  // Units are named by position ("Unit 1", "Unit 2"…), counting only units that have a course
  // to show, and the label appears once: on the first course band of each unit.
  let shownUnits = 0;
  api.units.forEach((apiUnit) => {
    let unitLabel: string | undefined;
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
      const sectionTitle = unitLabel === undefined ? (unitLabel = `Unit ${++shownUnits}`) : undefined;
      units.push({
        id: `course-${step.id}`,
        title: step.title,
        description:
          step.description?.trim() ||
          `${outline.moduleCount} module${outline.moduleCount === 1 ? "" : "s"} · ${lessonCount} lesson${lessonCount === 1 ? "" : "s"}`,
        palette,
        nodes,
        sectionTitle,
        courseSlug: outline.slug,
      });
    }
  });

  const firstLanguage = api.units.flatMap((u) => u.steps).find((s) => s.language)?.language;
  return {
    pathway: {
      id: pathwayId(api.id),
      title: api.title,
      language: firstLanguage || "en",
      icon: api.icon,
      palette,
      units,
    },
    outlines,
  };
}
