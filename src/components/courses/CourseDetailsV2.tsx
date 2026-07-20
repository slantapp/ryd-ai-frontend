import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { usePreviewAvatar } from "@/features/curriculum-preview/components/PreviewAvatar";
import { LessonPlayer } from "@/features/curriculum-preview/v2/components/LessonPlayer";
import {
  countLessonsV2,
  findLessonV2ById,
  flattenLessonsV2,
  getFirstLessonV2,
  getNextLessonV2,
} from "@/features/curriculum-preview/v2/navigation";
import {
  extractCurriculumV2Data,
  isCurriculumV2,
} from "@/features/curriculum-preview/v2/detect";
import type { LessonV2 } from "@/features/curriculum-preview/v2/types";
import { prefetchMonacoEditor } from "@/components/courses/exercise/MonacoEditorLazy";
import {
  getCurriculumEntryBySlug,
  isDemoCourseSlug,
} from "@/data/curriculumData";
import { useCoursesStore } from "@/stores/coursesStore";

/**
 * Paid / enrolled learning environment for schema v2 (flow) curricula.
 * Same classic shell as sneak peek: avatar left / board right via LessonPlayer.
 */
export default function CourseDetailsV2() {
  const { exercise } = useParams<{ exercise: string }>();
  const updateCourseProgress = useCoursesStore((s) => s.updateCourseProgress);
  const getCourseProgress = useCoursesStore((s) => s.getCourseProgress);

  const entry = exercise ? getCurriculumEntryBySlug(exercise) : null;
  const curriculum = useMemo(() => {
    if (!entry || !isCurriculumV2(entry)) return null;
    return extractCurriculumV2Data(entry).data;
  }, [entry]);

  const allLessons = useMemo(
    () => (curriculum ? flattenLessonsV2(curriculum) : []),
    [curriculum],
  );

  const [currentLesson, setCurrentLesson] = useState<LessonV2 | null>(null);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(
    () => new Set(),
  );
  const [lessonKey, setLessonKey] = useState(0);
  const [progressReady, setProgressReady] = useState(false);

  const {
    AvatarComponent,
    speak,
    stop,
    scheduleAfterSpeech,
    clearScheduledAfterSpeech,
    isSpeaking,
    currentSubtitle,
    showMobileAudioUnlock,
    unlockMobileAudio,
  } = usePreviewAvatar();

  const lessonOrdinal = useMemo(() => {
    if (!currentLesson) return 1;
    const idx = allLessons.findIndex((l) => l.lesson.id === currentLesson.id);
    return idx >= 0 ? idx + 1 : 1;
  }, [allLessons, currentLesson]);

  const lessonTotal = curriculum ? countLessonsV2(curriculum) : 0;

  useEffect(() => {
    prefetchMonacoEditor();
  }, []);

  // Hydrate progress, then pick the lesson to resume (or first lesson).
  useEffect(() => {
    if (!curriculum || !exercise) {
      setProgressReady(false);
      return;
    }

    let cancelled = false;
    setProgressReady(false);

    void (async () => {
      await useCoursesStore.getState().hydrateCourseProgressFromApi(exercise);
      if (cancelled) return;

      const stored = getCourseProgress(exercise);
      const completed = new Set(stored?.completedLessons ?? []);
      setCompletedLessons(completed);

      let lesson: LessonV2 | null = null;
      if (typeof stored?.lessonIndex === "number") {
        lesson = allLessons[stored.lessonIndex]?.lesson ?? null;
      }
      if (!lesson && stored?.currentLessonId) {
        lesson = findLessonV2ById(curriculum, stored.currentLessonId);
      }
      if (!lesson || !stored?.lessonStarted) {
        lesson = getFirstLessonV2(curriculum);
      }

      setCurrentLesson(lesson);
      setLessonKey((k) => k + 1);
      setProgressReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [allLessons, curriculum, exercise, getCourseProgress]);

  const selectLesson = useCallback(
    (lesson: LessonV2, options?: { persist?: boolean }) => {
      stop();
      clearScheduledAfterSpeech();
      setCurrentLesson(lesson);
      setLessonKey((k) => k + 1);

      if (options?.persist === false || !exercise || !curriculum) return;

      const lessonIndex = allLessons.findIndex((l) => l.lesson.id === lesson.id);
      updateCourseProgress(exercise, {
        status: "ongoing",
        currentLessonId: lesson.id,
        lessonIndex: lessonIndex >= 0 ? lessonIndex : undefined,
        questionIndex: 0,
        lessonStarted: true,
        canStartQuestions: false,
        lastUpdated: Date.now(),
      });
    },
    [
      allLessons,
      clearScheduledAfterSpeech,
      curriculum,
      exercise,
      stop,
      updateCourseProgress,
    ],
  );

  const handleLessonComplete = useCallback(
    (lessonId: string) => {
      setCompletedLessons((prev) => {
        const next = new Set(prev);
        next.add(lessonId);
        return next;
      });

      if (!exercise) return;

      const stored = getCourseProgress(exercise);
      const completed = Array.from(
        new Set([...(stored?.completedLessons ?? []), lessonId]),
      );
      const progress =
        lessonTotal > 0
          ? Math.round((completed.length / lessonTotal) * 100)
          : 0;
      const done = completed.length >= lessonTotal;
      updateCourseProgress(exercise, {
        status: done ? "completed" : "ongoing",
        progress,
        completedLessons: completed,
        currentLessonId: lessonId,
        lessonStarted: true,
        canStartQuestions: true,
        lastUpdated: Date.now(),
      });
    },
    [exercise, getCourseProgress, lessonTotal, updateCourseProgress],
  );

  const handleNextLesson = useCallback(
    (preferredNextId?: string | null) => {
      if (!currentLesson || !curriculum) return;

      let next: LessonV2 | null = null;
      if (preferredNextId) {
        next = findLessonV2ById(curriculum, preferredNextId);
      }
      if (!next && preferredNextId !== null) {
        next = getNextLessonV2(curriculum, currentLesson);
      }

      if (next) {
        selectLesson(next);
      }
    },
    [curriculum, currentLesson, selectLesson],
  );

  // Persist "in lesson" once the player mounts a lesson.
  useEffect(() => {
    if (!progressReady || !currentLesson || !exercise || !curriculum) return;
    if (isDemoCourseSlug(exercise)) return;

    const lessonIndex = allLessons.findIndex(
      (l) => l.lesson.id === currentLesson.id,
    );
    const stored = getCourseProgress(exercise);
    if (stored?.currentLessonId === currentLesson.id && stored.lessonStarted) {
      return;
    }

    updateCourseProgress(exercise, {
      status: stored?.status === "completed" ? "completed" : "ongoing",
      currentLessonId: currentLesson.id,
      lessonIndex: lessonIndex >= 0 ? lessonIndex : undefined,
      lessonStarted: true,
      lastUpdated: Date.now(),
    });
  }, [
    allLessons,
    curriculum,
    currentLesson,
    exercise,
    getCourseProgress,
    progressReady,
    updateCourseProgress,
  ]);

  if (!entry) {
    return (
      <div className="flex h-full min-h-80 items-center justify-center p-6">
        <p className="text-sm text-gray-500">Course could not be found.</p>
      </div>
    );
  }

  if (!curriculum) {
    return (
      <div className="flex h-full min-h-80 items-center justify-center p-6">
        <p className="text-sm text-gray-500">
          This course is not a flow (v2) curriculum.
        </p>
      </div>
    );
  }

  if (!progressReady || !currentLesson) {
    return (
      <div className="flex h-full min-h-80 items-center justify-center p-6">
        <p className="text-sm text-gray-500">Loading lesson…</p>
      </div>
    );
  }

  return (
    <div className="relative h-full min-h-0 overflow-hidden rounded-[20px] bg-white shadow-lg">
      <LessonPlayer
        key={`${currentLesson.id}-${lessonKey}`}
        curriculum={curriculum}
        lesson={currentLesson}
        lessonOrdinal={lessonOrdinal}
        lessonTotal={lessonTotal}
        speak={speak}
        stop={stop}
        scheduleAfterSpeech={scheduleAfterSpeech}
        clearScheduledAfterSpeech={clearScheduledAfterSpeech}
        isSpeaking={isSpeaking}
        currentSubtitle={currentSubtitle}
        avatarSlot={
          <AvatarComponent className="h-full w-full" showUnlockOverlay={false} />
        }
        onLessonComplete={handleLessonComplete}
        onNextLesson={handleNextLesson}
        hideFlowChrome
        classicLayout
        showMobileAudioUnlock={showMobileAudioUnlock}
        onMobileAudioUnlock={unlockMobileAudio}
      />
    </div>
  );
}
