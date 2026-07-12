import type { Curriculum, Lesson } from "@/data/curriculumData";
import {
  getLessonIndexInCurriculum,
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

export function isLessonMarkedComplete(
  lesson: Lesson,
  completedLessonIds: Set<string>,
  questionIndex: number,
): boolean {
  const questionCount = lesson.questions?.length ?? 0;
  if (completedLessonIds.has(lesson.id)) return true;
  if (questionCount === 0) return false;
  return questionIndex >= questionCount;
}

export function resolveLessonPhase(args: {
  lesson: Lesson;
  questionIndex: number;
  hasCurrentQuestion: boolean;
  introReady: boolean;
  completedLessonIds: Set<string>;
}): LessonPhase {
  const { lesson, questionIndex, hasCurrentQuestion, completedLessonIds } =
    args;
  // Reviewing a completed lesson's questions keeps the questions phase.
  if (hasCurrentQuestion) return "questions";
  if (isLessonMarkedComplete(lesson, completedLessonIds, questionIndex)) {
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
): string {
  const info = getModuleInfoForLesson(lesson.id, curriculum);
  if (!info) return "";
  const moduleIndex = curriculum.modules.findIndex((m) => m.id === info.module.id);
  const lessonInModule =
    info.module.lessons.findIndex((l) => l.id === lesson.id) + 1;
  const moduleNumber = moduleIndex >= 0 ? moduleIndex + 1 : 1;
  return `Module ${moduleNumber} · Lesson ${lessonInModule} of ${info.module.lessons.length}`;
}

export function buildLessonPositionLabel(args: {
  lesson: Lesson;
  curriculum: Curriculum["curriculum"];
  phase: LessonPhase;
  questionIndex: number;
}): string {
  const { lesson, curriculum, phase, questionIndex } = args;
  const base = modulePositionLabel(lesson, curriculum);
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
}): LessonNavSnapshot {
  const {
    lesson,
    curriculum,
    phase,
    introReady,
    questionIndex,
    isSpeaking,
    completedLessonIds,
  } = args;

  const questionCount = lesson.questions?.length ?? 0;
  const hasPrevLesson = !!getPreviousLessonInOrder(lesson, curriculum);
  const nextLesson = getNextLessonInOrder(lesson, curriculum);
  const moduleInfo = getModuleInfoForLesson(lesson.id, curriculum);
  const nextCrossesModule = !!(
    nextLesson &&
    moduleInfo?.isLastLessonInModule
  );

  const lessonComplete = isLessonMarkedComplete(
    lesson,
    completedLessonIds,
    questionIndex,
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
