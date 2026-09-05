import type { Curriculum, Lesson } from "@/data/curriculumData";
import {
  getLessonIndexInCurriculum,
  getModuleIndexForLesson,
  getModuleInfoForLesson,
  getNextLessonInOrder,
  getPreviousLessonInOrder,
} from "@/data/curriculumData";

export type LessonPhase = "intro" | "questions" | "complete";

export type PrimaryNavKind =
  | "start_questions"
  | "next_lesson"
  | "next_module"
  | "none";

export interface LessonNavSnapshot {
  phase: LessonPhase;
  positionLabel: string;
  statusHint: string;
  canGoPrevious: boolean;
  previousLabel: string;
  primary: {
    kind: PrimaryNavKind;
    label: string;
    enabled: boolean;
  };
}

export function countCurriculumLessons(
  curriculum: Curriculum["curriculum"],
): number {
  return curriculum.modules.reduce((sum, mod) => sum + mod.lessons.length, 0);
}

/**
 * Session/UI completion for the current visit through a lesson.
 * Historical completions must not skip "Start questions" when the learner
 * revisits a previous lesson/module (enterLessonIntro resets questionIndex to 0).
 */
export function isLessonMarkedComplete(
  lesson: Lesson,
  completedLessonIds: Set<string>,
  questionIndex: number,
  preferredFlatIndex?: number,
  curriculum?: Curriculum["curriculum"],
): boolean {
  const questionCount = lesson.questions?.length ?? 0;

  // Lessons with questions: only complete once every question is done this visit.
  if (questionCount > 0) {
    return questionIndex >= questionCount;
  }

  // No-question lessons: honor stored completion so Next lesson unlocks after intro.
  return isLessonIdMarkedComplete(
    completedLessonIds,
    lesson.id,
    preferredFlatIndex,
    curriculum,
  );
}

/** Indexed completion token so duplicate lesson IDs across modules don't collide. */
export function lessonCompletionKey(
  lessonId: string,
  flatIndex: number,
): string {
  return `${flatIndex}::${lessonId}`;
}

export function parseLessonCompletionKey(key: string): {
  flatIndex: number | null;
  lessonId: string;
} {
  const sep = key.indexOf("::");
  if (sep > 0) {
    const flatIndex = Number(key.slice(0, sep));
    if (Number.isFinite(flatIndex) && flatIndex >= 0) {
      return { flatIndex, lessonId: key.slice(sep + 2) };
    }
  }
  return { flatIndex: null, lessonId: key };
}

/** First flat index of a lesson id in curriculum order (for legacy bare-ID progress). */
function firstFlatIndexForLessonId(
  lessonId: string,
  curriculum: Curriculum["curriculum"],
): number {
  let index = 0;
  for (const mod of curriculum.modules) {
    for (const lesson of mod.lessons) {
      if (lesson.id === lessonId) return index;
      index++;
    }
  }
  return -1;
}

/**
 * Whether this lesson occurrence is recorded as complete.
 * Prefers `flatIndex::lessonId` keys; bare lesson IDs (legacy) only count for
 * the first occurrence of that id so later modules are not auto-skipped.
 */
export function isLessonIdMarkedComplete(
  completedLessonIds: Set<string> | readonly string[],
  lessonId: string,
  preferredFlatIndex?: number,
  curriculum?: Curriculum["curriculum"],
): boolean {
  const completed =
    completedLessonIds instanceof Set
      ? completedLessonIds
      : new Set(completedLessonIds);

  if (typeof preferredFlatIndex === "number" && preferredFlatIndex >= 0) {
    if (completed.has(lessonCompletionKey(lessonId, preferredFlatIndex))) {
      return true;
    }
    // Legacy bare id: only the first occurrence of this id is considered done.
    if (completed.has(lessonId)) {
      if (!curriculum) return preferredFlatIndex === 0;
      return firstFlatIndexForLessonId(lessonId, curriculum) === preferredFlatIndex;
    }
    return false;
  }

  if (completed.has(lessonId)) return true;
  for (const key of completed) {
    if (parseLessonCompletionKey(key).lessonId === lessonId) return true;
  }
  return false;
}

/** Record completion with a flat-index key when available (safe with duplicate ids). */
export function withLessonMarkedComplete(
  completedLessonIds: Set<string>,
  lessonId: string,
  flatIndex?: number,
): Set<string> {
  const next = new Set(completedLessonIds);
  if (typeof flatIndex === "number" && flatIndex >= 0) {
    next.add(lessonCompletionKey(lessonId, flatIndex));
    // Drop legacy bare id so later modules with the same id are not treated done.
    next.delete(lessonId);
  } else {
    next.add(lessonId);
  }
  return next;
}

export function resolveLessonPhase(args: {
  lesson: Lesson;
  questionIndex: number;
  hasCurrentQuestion: boolean;
  introReady: boolean;
  completedLessonIds: Set<string>;
  preferredFlatIndex?: number;
  curriculum?: Curriculum["curriculum"];
}): LessonPhase {
  const {
    lesson,
    questionIndex,
    hasCurrentQuestion,
    introReady,
    completedLessonIds,
    preferredFlatIndex,
    curriculum,
  } = args;
  // Reviewing a completed lesson's questions keeps the questions phase.
  if (hasCurrentQuestion) return "questions";
  if (
    isLessonMarkedComplete(
      lesson,
      completedLessonIds,
      questionIndex,
      preferredFlatIndex,
      curriculum,
    )
  ) {
    // Allow intentional intro replay (Back to lesson / previous completed)
    // until teaching finishes and unlocks again.
    if (!introReady) return "intro";
    return "complete";
  }
  const questionCount = lesson.questions?.length ?? 0;
  if (questionCount > 0 && questionIndex > 0) {
    return "questions";
  }
  return "intro";
}

function modulePositionLabel(
  lesson: Lesson,
  curriculum: Curriculum["curriculum"],
  preferredFlatIndex?: number,
): string {
  // Resolve by flat index (reference equality + preferredFlatIndex) so
  // duplicate lesson/module IDs don't always label as Module 1.
  const moduleIndex = getModuleIndexForLesson(
    lesson,
    curriculum,
    preferredFlatIndex,
  );
  if (moduleIndex >= 0) {
    const mod = curriculum.modules[moduleIndex];
    const flatIndex = getLessonIndexInCurriculum(
      lesson,
      curriculum,
      preferredFlatIndex,
    );
    let priorLessons = 0;
    for (let mi = 0; mi < moduleIndex; mi++) {
      priorLessons += curriculum.modules[mi].lessons.length;
    }
    const lessonInModule = flatIndex - priorLessons + 1;
    return `Module ${moduleIndex + 1} · Lesson ${lessonInModule} of ${mod.lessons.length}`;
  }

  const info = getModuleInfoForLesson(
    lesson.id,
    curriculum,
    preferredFlatIndex,
  );
  if (!info) return "";
  const fallbackModuleIndex = curriculum.modules.findIndex(
    (m) => m === info.module,
  );
  const lessonInModule =
    info.module.lessons.findIndex((l) => l.id === lesson.id) + 1;
  const moduleNumber =
    fallbackModuleIndex >= 0 ? fallbackModuleIndex + 1 : 1;
  return `Module ${moduleNumber} · Lesson ${lessonInModule} of ${info.module.lessons.length}`;
}

export function buildLessonPositionLabel(args: {
  lesson: Lesson;
  curriculum: Curriculum["curriculum"];
  phase: LessonPhase;
  questionIndex: number;
  /** Disambiguates duplicate lesson IDs across modules. */
  preferredFlatIndex?: number;
}): string {
  const { lesson, curriculum, phase, questionIndex, preferredFlatIndex } =
    args;
  const base = modulePositionLabel(lesson, curriculum, preferredFlatIndex);
  const questionCount = lesson.questions?.length ?? 0;
  if (phase === "questions" && questionCount > 0) {
    const displayIndex = Math.min(questionIndex + 1, questionCount);
    return `${base} · Question ${displayIndex} of ${questionCount}`;
  }
  if (phase === "complete" && questionCount > 0) {
    return `${base} · Completed`;
  }
  return base;
}

export function buildLessonNavSnapshot(args: {
  lesson: Lesson;
  curriculum: Curriculum["curriculum"];
  phase: LessonPhase;
  introReady: boolean;
  questionIndex: number;
  isSpeaking: boolean;
  completedLessonIds: Set<string>;
  /** Disambiguates duplicate lesson IDs across modules. */
  preferredFlatIndex?: number;
}): LessonNavSnapshot {
  const {
    lesson,
    curriculum,
    phase,
    introReady,
    questionIndex,
    isSpeaking,
    completedLessonIds,
    preferredFlatIndex,
  } = args;

  const questionCount = lesson.questions?.length ?? 0;
  const hasPrevLesson = !!getPreviousLessonInOrder(
    lesson,
    curriculum,
    preferredFlatIndex,
  );
  const nextLesson = getNextLessonInOrder(lesson, curriculum, preferredFlatIndex);
  const moduleInfo = getModuleInfoForLesson(
    lesson.id,
    curriculum,
    preferredFlatIndex,
  );
  const nextCrossesModule = !!(
    nextLesson &&
    moduleInfo?.isLastLessonInModule
  );

  const lessonComplete = isLessonMarkedComplete(
    lesson,
    completedLessonIds,
    questionIndex,
    preferredFlatIndex,
    curriculum,
  );

  const canGoPrevious =
    phase === "questions" ||
    (phase === "complete" && (questionCount > 0 || hasPrevLesson)) ||
    (phase === "intro" && hasPrevLesson);

  let previousLabel = "Previous";
  if (phase === "questions" && questionIndex > 0) {
    previousLabel = "Previous question";
  } else if (phase === "questions" && questionIndex === 0) {
    previousLabel = "Back to lesson";
  } else if (phase === "complete" && hasPrevLesson) {
    // Prefer replaying the prior lesson/module over reviewing current questions.
    previousLabel = "Previous lesson";
  } else if (phase === "complete" && questionCount > 0) {
    previousLabel = "Review questions";
  } else if (hasPrevLesson) {
    previousLabel = "Previous lesson";
  }

  let primaryKind: PrimaryNavKind = "none";
  let primaryLabel = "Continue";
  let primaryEnabled = false;
  let statusHint = "";

  if (isSpeaking) {
    statusHint = "Wait for the instructor to finish speaking.";
  }

  if (lessonComplete || phase === "complete") {
    if (nextLesson) {
      primaryKind = nextCrossesModule ? "next_module" : "next_lesson";
      primaryLabel = nextCrossesModule ? "Next module" : "Next lesson";
      primaryEnabled = !isSpeaking;
      if (!isSpeaking) {
        statusHint = nextCrossesModule
          ? "Lesson complete. Continue to the next module."
          : "Lesson complete. Continue to the next lesson.";
      }
    } else {
      primaryKind = "none";
      primaryLabel = "Course complete";
      primaryEnabled = false;
      if (!isSpeaking) {
        statusHint = "You've finished every lesson in this course.";
      }
    }
  } else if (phase === "intro") {
    if (questionCount > 0) {
      primaryKind = "start_questions";
      primaryLabel = "Start questions";
      primaryEnabled = introReady && !isSpeaking;
      if (!isSpeaking) {
        statusHint = introReady
          ? "Ready when you are — start the questions for this lesson."
          : "Listen to the lesson first. Questions unlock when the intro finishes.";
      }
    } else if (nextLesson) {
      // No questions: completion is unlocked after intro speech.
      primaryKind = nextCrossesModule ? "next_module" : "next_lesson";
      primaryLabel = nextCrossesModule ? "Next module" : "Next lesson";
      primaryEnabled = introReady && !isSpeaking;
      if (!isSpeaking) {
        statusHint = introReady
          ? "This lesson has no questions — continue when ready."
          : "Listen to the lesson first to continue.";
      }
    } else {
      primaryKind = "none";
      primaryLabel = "Course complete";
      primaryEnabled = false;
      if (!isSpeaking) {
        statusHint = introReady
          ? "You've finished every lesson in this course."
          : "Listen to the lesson first.";
      }
    }
  } else {
    // Mid-question: no forward nav — answering advances automatically.
    primaryKind = "none";
    primaryLabel = "Keep going";
    primaryEnabled = false;
    if (!isSpeaking) {
      statusHint = `Answer question ${Math.min(questionIndex + 1, questionCount)} of ${questionCount} to continue. You can't skip ahead.`;
    }
  }

  return {
    phase,
    positionLabel: buildLessonPositionLabel({
      lesson,
      curriculum,
      phase: lessonComplete ? "complete" : phase,
      questionIndex,
      preferredFlatIndex,
    }),
    statusHint,
    canGoPrevious: canGoPrevious && !isSpeaking,
    previousLabel,
    primary: {
      kind: primaryKind,
      label: primaryLabel,
      enabled: primaryEnabled,
    },
  };
}

/** Estimate a safe fallback unlock time if onSpeechEnd never fires. */
export function estimateSpeechFallbackMs(textLength: number): number {
  const speakingMs = Math.max(2500, (textLength / 12.5) * 1000);
  return speakingMs + 4000;
}

export function getLessonFlatIndex(
  lesson: Lesson,
  curriculum: Curriculum["curriculum"],
): number {
  return getLessonIndexInCurriculum(lesson, curriculum);
}
