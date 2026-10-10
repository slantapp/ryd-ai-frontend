/**
 * Lesson-level Learning Path progress for v1 (classic + Maths) and v2 (flow) curricula.
 *
 * What each course saves (CourseProgressDataEntry):
 * - completedLessons: v1 "<flatIndex>::<lessonId>" (or legacy bare id), v2 bare lesson id
 * - lessonIndex: flat index of the current lesson; lessonStarted
 * - v1: canStartQuestions (speech done, questions unlocked) + questionIndex (questions answered)
 * - v2: questionIndex = beat index in the current lesson (a local draft may be further ahead)
 *
 * From that we derive, per lesson: locked / current (learning) / learned (content done,
 * practice pending) / completed, plus how much content and practice is done.
 */
import { isLessonIdMarkedComplete } from "@/utils/lessonNavigation";
import type { Curriculum } from "@/data/curriculumData";
import type { CourseProgressDataEntry } from "@/stores/coursesStore";
import type { PathNodeState } from "./types";

export type BeatKind = "content" | "question";

export type LessonOutline = {
  nodeId: string;
  lessonId: string;
  flatIndex: number;
  moduleIndex: number;
  moduleTitle: string;
  title: string;
  /** v1 questions[] length, or the number of v2 question beats. */
  practiceTotal: number;
  /** v2 only: kind of each beat in flow order. */
  beatKinds?: BeatKind[];
  /** Last lesson of its module (drawn as a checkpoint). */
  endsModule: boolean;
};

export type CourseOutline = {
  slug: string;
  title: string;
  version: 1 | 2;
  /** Raw curriculum JSON (v1 needs it to resolve legacy bare completion ids). */
  curriculum: Record<string, unknown>;
  moduleCount: number;
  lessons: LessonOutline[];
};

export type LessonProgress = {
  state: PathNodeState;
  /** 0..1 share of the lesson content (speech/body or content beats) done. */
  learnFraction: number;
  practiceDone: number;
  practiceTotal: number;
  /** 0..3: 3 = completed, 1 = content done with practice pending. */
  stars: number;
};

export type CourseSummary = {
  slug: string;
  unlocked: boolean;
  started: boolean;
  completed: boolean;
  completedCount: number;
  total: number;
  /** 0..100, completed lessons plus partial credit for the current one. */
  percent: number;
  currentNodeId: string | null;
  lessons: Record<string, LessonProgress>;
};

type AnyRecord = Record<string, unknown>;

export const lessonNodeId = (slug: string, flatIndex: number) => `${slug}::${flatIndex}`;

/** Build a course outline from the curriculum JSON the app already loads (v1, Maths or v2). */
export function buildCourseOutline(slug: string, title: string, curriculumJson: unknown): CourseOutline | null {
  let json = curriculumJson as AnyRecord | string | null;
  if (typeof json === "string") {
    try { json = JSON.parse(json) as AnyRecord; } catch { return null; }
  }
  if (!json || typeof json !== "object") return null;
  const modules = Array.isArray(json.modules) ? (json.modules as AnyRecord[]) : [];
  const lessons: LessonOutline[] = [];
  let flatIndex = 0;
  let isV2 = false;
  modules.forEach((mod, moduleIndex) => {
    const modLessons = Array.isArray(mod?.lessons) ? (mod.lessons as AnyRecord[]) : [];
    modLessons.forEach((lesson, i) => {
      const flow = Array.isArray(lesson?.flow) ? (lesson.flow as AnyRecord[]) : null;
      if (flow) isV2 = true;
      const beatKinds = flow?.map((b): BeatKind => (b?.type === "question" ? "question" : "content"));
      const practiceTotal = flow
        ? beatKinds!.filter((k) => k === "question").length
        : Array.isArray(lesson?.questions) ? (lesson.questions as unknown[]).length : 0;
      lessons.push({
        nodeId: lessonNodeId(slug, flatIndex),
        lessonId: String(lesson?.id ?? flatIndex),
        flatIndex,
        moduleIndex,
        moduleTitle: String(mod?.title ?? `Module ${moduleIndex + 1}`),
        title: String(lesson?.title ?? `Lesson ${i + 1}`),
        practiceTotal,
        beatKinds,
        endsModule: i === modLessons.length - 1 && modLessons.length > 1,
      });
      flatIndex += 1;
    });
  });
  if (!lessons.length) return null;
  return { slug, title, version: isV2 ? 2 : 1, curriculum: json, moduleCount: modules.length, lessons };
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/** Course has any saved activity (so it is reachable even if earlier path courses aren't done). */
export function courseHasProgress(entry: CourseProgressDataEntry | undefined): boolean {
  return !!entry && (entry.status !== "not-started" || !!entry.lessonStarted || (entry.completedLessons?.length ?? 0) > 0);
}

/**
 * Per-lesson progress for one course.
 * @param unlocked whether the path allows this course yet (a started course is always reachable)
 * @param v2DraftBeat optional local v2 draft beat index for a lesson (the runner keeps it locally)
 */
export function computeCourseProgress(
  outline: CourseOutline,
  entry: CourseProgressDataEntry | undefined,
  unlocked: boolean,
  v2DraftBeat?: (lessonId: string) => number | undefined,
): CourseSummary {
  const total = outline.lessons.length;
  const completedKeys = new Set(entry?.completedLessons ?? []);
  const courseCompleted = entry?.status === "completed";
  const started = courseHasProgress(entry);
  const reachable = unlocked || started;
  const curriculum = outline.curriculum as unknown as Curriculum["curriculum"];

  const isDone = (l: LessonOutline) =>
    courseCompleted || isLessonIdMarkedComplete(completedKeys, l.lessonId, l.flatIndex, curriculum);
  const done = outline.lessons.map(isDone);

  // Where the learner is: the saved lesson position, else the first unfinished lesson.
  let position = typeof entry?.lessonIndex === "number" ? entry.lessonIndex : -1;
  if ((position < 0 || position >= total) && entry?.currentLessonId) {
    position = outline.lessons.findIndex((l) => l.lessonId === entry.currentLessonId);
  }
  const firstUnfinished = done.indexOf(false);
  // "Up next": the saved position if that lesson isn't finished, otherwise the first unfinished lesson.
  const upNext = position >= 0 && position < total && !done[position] ? position : firstUnfinished;

  const lessons: Record<string, LessonProgress> = {};
  let partial = 0;
  outline.lessons.forEach((l, i) => {
    const practiceTotal = l.practiceTotal;
    if (done[i]) {
      lessons[l.nodeId] = { state: "completed", learnFraction: 1, practiceDone: practiceTotal, practiceTotal, stars: 3 };
      return;
    }
    if (!reachable || upNext < 0 || i > upNext) {
      lessons[l.nodeId] = { state: "locked", learnFraction: 0, practiceDone: 0, practiceTotal, stars: 0 };
      return;
    }
    if (i < upNext) {
      // Moved past this lesson without finishing it: its content was covered, practice is pending.
      lessons[l.nodeId] = { state: "learned", learnFraction: 1, practiceDone: 0, practiceTotal, stars: 1 };
      partial += 0.5;
      return;
    }

    // The lesson that's up next. Saved position data only describes it when it is the saved lesson.
    let learnFraction = 0;
    let practiceDone = 0;
    const positionData = i === position && !!entry?.lessonStarted;
    if (positionData && outline.version === 2 && l.beatKinds?.length) {
      const saved = Math.max(0, Number(entry?.questionIndex ?? 0));
      const draft = v2DraftBeat?.(l.lessonId) ?? 0;
      const beat = clamp(Math.max(saved, draft), 0, l.beatKinds.length);
      const reached = l.beatKinds.slice(0, beat);
      const contentTotal = l.beatKinds.filter((k) => k === "content").length;
      learnFraction = contentTotal ? reached.filter((k) => k === "content").length / contentTotal : 1;
      practiceDone = reached.filter((k) => k === "question").length;
    } else if (positionData) {
      // v1 / Maths: speech finished unlocks questions; questionIndex counts answered questions.
      learnFraction = entry?.canStartQuestions ? 1 : 0.5;
      practiceDone = entry?.canStartQuestions ? clamp(Number(entry?.questionIndex ?? 0), 0, practiceTotal) : 0;
    }
    const learned = learnFraction >= 1 && practiceTotal > 0 && practiceDone < practiceTotal;
    lessons[l.nodeId] = {
      state: learned ? "learned" : "current",
      learnFraction,
      practiceDone,
      practiceTotal,
      stars: learned ? 1 : 0,
    };
    const practiceShare = practiceTotal ? practiceDone / practiceTotal : learnFraction;
    partial += 0.5 * learnFraction + 0.5 * practiceShare;
  });

  const completedCount = done.filter(Boolean).length;
  const completed = courseCompleted || completedCount === total;
  const percent = completed ? 100 : Math.min(99, Math.round(((completedCount + partial) / total) * 100));
  return {
    slug: outline.slug,
    unlocked: reachable,
    started,
    completed,
    completedCount,
    total,
    percent,
    currentNodeId: completed || upNext < 0 ? null : outline.lessons[upNext].nodeId,
    lessons,
  };
}

export type PathProgress = {
  byNode: Record<string, LessonProgress>;
  byCourse: Record<string, CourseSummary>;
  /** The lesson the learner should do next on this path. */
  currentNodeId: string | null;
  completedCount: number;
  totalCount: number;
  percent: number;
};

/**
 * Whole path: courses unlock in order (a course is reachable once the previous one is
 * completed, or as soon as the learner has started it from the Courses page).
 */
export function computePathProgress(
  outlines: CourseOutline[],
  getEntry: (slug: string) => CourseProgressDataEntry | undefined,
  v2DraftBeat?: (slug: string, lessonId: string) => number | undefined,
): PathProgress {
  const byNode: Record<string, LessonProgress> = {};
  const byCourse: Record<string, CourseSummary> = {};
  let previousCompleted = true;
  let currentNodeId: string | null = null;
  let completedCount = 0;
  let totalCount = 0;
  let weighted = 0;

  for (const outline of outlines) {
    const summary = computeCourseProgress(
      outline,
      getEntry(outline.slug),
      previousCompleted,
      v2DraftBeat ? (lessonId) => v2DraftBeat(outline.slug, lessonId) : undefined,
    );
    byCourse[outline.slug] = summary;
    Object.assign(byNode, summary.lessons);
    if (!currentNodeId && summary.unlocked && summary.currentNodeId) currentNodeId = summary.currentNodeId;
    completedCount += summary.completedCount;
    totalCount += summary.total;
    weighted += (summary.percent / 100) * summary.total;
    previousCompleted = summary.completed;
  }

  return {
    byNode,
    byCourse,
    currentNodeId,
    completedCount,
    totalCount,
    percent: totalCount ? Math.round((weighted / totalCount) * 100) : 0,
  };
}
