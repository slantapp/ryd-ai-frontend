import type { Curriculum, Lesson } from "@/data/curriculumData";
import { isLessonMarkedComplete } from "@/utils/lessonNavigation";

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

  const completed = Array.from(
    new Set([...completedLessonIds, lessonId]),
  );
  const byUniqueIds = Math.round((completed.length / lessonTotal) * 100);
  const byIndex =
    lessonIndex >= 0
      ? Math.round(((lessonIndex + 1) / lessonTotal) * 100)
      : 0;

  const isLastLesson =
    lessonIndex >= 0 && lessonIndex === lessonTotal - 1;
  const done = isLastLesson;
  const progress = done ? 100 : Math.min(100, Math.max(byUniqueIds, byIndex));

  return { progress, done };
}
