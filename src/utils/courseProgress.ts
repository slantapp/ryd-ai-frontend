import type { Curriculum, Lesson } from "@/data/curriculumData";
import { isLessonMarkedComplete } from "@/utils/lessonNavigation";

import type { CurriculumEntry } from "@/data/curriculumData";

type CurriculumModulesShape = {
  modules?: Array<{ lessons?: Array<{ id?: string }> }>;
};

/** Lesson ids belonging to the first module (v1 and v2 curricula). */
export function getFirstModuleLessonIds(entry: CurriculumEntry | null): string[] {
  if (!entry?.curriculum || typeof entry.curriculum !== "object") return [];
  const modules = (entry.curriculum as CurriculumModulesShape).modules;
  if (!Array.isArray(modules) || modules.length === 0) return [];
  const lessons = modules[0]?.lessons;
  if (!Array.isArray(lessons)) return [];
  return lessons
    .map((lesson) => (typeof lesson.id === "string" ? lesson.id : ""))
    .filter(Boolean);
}

export function isSingleModuleCourse(entry: CurriculumEntry | null): boolean {
  if (!entry?.curriculum || typeof entry.curriculum !== "object") return false;
  const modules = (entry.curriculum as CurriculumModulesShape).modules;
  return Array.isArray(modules) && modules.length === 1;
}

/** True when every lesson in module 1 is in the learner's completed list. */
export function isFirstModuleComplete(
  entry: CurriculumEntry | null,
  completedLessonIds: readonly string[],
): boolean {
  const lessonIds = getFirstModuleLessonIds(entry);
  if (lessonIds.length === 0) return false;
  const completed = new Set(completedLessonIds);
  return lessonIds.every((id) => completed.has(id));
}

/** Avatar line when the learner finishes an entire course. */
export function buildCourseCompletionSpeech(courseTitle: string): string {
  const title = courseTitle.trim() || "this course";
  return (
    `You did it! You finished ${title}, every single lesson. ` +
    `I'm really proud of you — you kept going, learned new things, and didn't give up. ` +
    `Take a moment to celebrate. When you're ready, pick your next adventure and keep building amazing things!`
  );
}

/** Whether the current lesson counts as fully done for progress + course status. */
export function isLessonProgressComplete(
  lesson: Lesson,
  completedLessonIds: Set<string>,
  questionIndex: number,
): boolean {
  return isLessonMarkedComplete(lesson, completedLessonIds, questionIndex);
}

/** Whether the learner has finished the final lesson in a v1 curriculum. */
export function isV1CourseFinished(args: {
  lesson: Lesson;
  curriculum: Curriculum["curriculum"];
  completedLessonIds: Set<string>;
  questionIndex: number;
}): boolean {
  const allLessons = args.curriculum.modules.flatMap((m) => m.lessons);
  if (allLessons.length === 0) return false;

  let currentIndex = -1;
  for (let i = 0; i < allLessons.length; i++) {
    if (allLessons[i] === args.lesson) {
      currentIndex = i;
      break;
    }
  }
  if (currentIndex !== allLessons.length - 1) return false;

  return isLessonProgressComplete(
    args.lesson,
    args.completedLessonIds,
    args.questionIndex,
  );
}

/** v2 progress from lesson position (handles duplicate lesson IDs in a curriculum). */
export function computeV2CourseProgress(args: {
  lessonId: string;
  lessonIndex: number;
  lessonTotal: number;
  completedLessonIds: string[];
}): { progress: number; done: boolean } {
  const { lessonId, lessonIndex, lessonTotal, completedLessonIds } = args;
  if (lessonTotal <= 0) return { progress: 0, done: false };

  const completed = Array.from(new Set([...completedLessonIds, lessonId]));
  const byUniqueIds = Math.round((completed.length / lessonTotal) * 100);
  const byIndex =
    lessonIndex >= 0 ? Math.round(((lessonIndex + 1) / lessonTotal) * 100) : 0;

  const isLastLesson = lessonIndex >= 0 && lessonIndex === lessonTotal - 1;
  const done = isLastLesson;
  const progress = done ? 100 : Math.min(100, Math.max(byUniqueIds, byIndex));

  return { progress, done };
}
