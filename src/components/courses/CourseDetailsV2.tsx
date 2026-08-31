import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Play } from "lucide-react";
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
import { PageLoadWaitBanner } from "@/components/courses/exercise/PageLoadWaitBanner";
import { prefetchMonacoEditor } from "@/components/courses/exercise/MonacoEditorLazy";
import { MOBILE_INSTRUCTOR_AUDIO_BUTTON } from "@/constants/mobileInstructorAudio";
import { getCurriculumEntryBySlug } from "@/data/curriculumData";
import { useMediaQueryMinLg } from "@/hooks/useMediaQueryMinLg";
import { useCoursesStore } from "@/stores/coursesStore";
import {
  buildCourseCompletionSpeech,
  computeV2CourseProgress,
} from "@/utils/courseProgress";
import { CourseCompletionCelebration } from "@/components/courses/CourseCompletionCelebration";
import { CourseProgressResetLink } from "@/components/courses/CourseProgressResetLink";
import {
  clearV2LessonDraft,
  loadV2LessonDraft,
  saveV2LessonDraft,
  type V2LessonDraft,
} from "@/features/curriculum-preview/v2/lessonPersist";

/**
 * Paid / enrolled learning environment for schema v2 (flow) curricula.
 * Mirrors DemoSneakPeekPage: start gate (with mobile audio unlock on tap),
 * then avatar left / board right via LessonPlayer.
 */
export default function CourseDetailsV2() {
  const { exercise } = useParams<{ exercise: string }>();
  const updateCourseProgress = useCoursesStore((s) => s.updateCourseProgress);
  const getCourseProgress = useCoursesStore((s) => s.getCourseProgress);
  const isCourseCompleted = useCoursesStore((s) =>
    exercise ? s.courseProgress[exercise]?.status === "completed" : false,
  );
  const isLgUp = useMediaQueryMinLg();

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
  const [lessonStarted, setLessonStarted] = useState(false);
  const [lessonKey, setLessonKey] = useState(0);
  const [progressReady, setProgressReady] = useState(false);
  /** True when returning to an in-progress lesson — gate asks to continue, then speech starts on tap. */
  const [canResume, setCanResume] = useState(false);
  const [resumeDraft, setResumeDraft] = useState<V2LessonDraft | null>(null);
  const courseCompletionSpeechRef = useRef(false);

  const {
    AvatarComponent,
    speak,
    stop,
    scheduleAfterSpeech,
    clearScheduledAfterSpeech,
    isSpeaking,
    isPaused,
    togglePause,
    rewindSpeaking,
    currentSubtitle,
    isInstructorWaiting,
    showMobileAudioUnlock,
    unlockMobileAudio,
  } = usePreviewAvatar({
    instructorSource: "global",
    lessonActive: lessonStarted,
  });

  const lessonOrdinal = useMemo(() => {
    if (!currentLesson) return 1;
    const idx = allLessons.findIndex((l) => l.lesson.id === currentLesson.id);
    return idx >= 0 ? idx + 1 : 1;
  }, [allLessons, currentLesson]);

  const lessonTotal = curriculum ? countLessonsV2(curriculum) : 0;

  const avatarSlot = (
    <AvatarComponent className="h-full w-full" showUnlockOverlay={false} />
  );

  useEffect(() => {
    prefetchMonacoEditor();
  }, []);

  // Hydrate progress, then pick the lesson — always wait for a Continue/Start tap
  // so avatar speech runs inside a user gesture (autoplay policies after async load).
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

      let lesson: LessonV2 | null = null;
      if (typeof stored?.lessonIndex === "number") {
        lesson = allLessons[stored.lessonIndex]?.lesson ?? null;
      }
      if (!lesson && stored?.currentLessonId) {
        lesson = findLessonV2ById(curriculum, stored.currentLessonId);
      }
      if (!lesson) {
        lesson = getFirstLessonV2(curriculum);
      }

      const resume =
        !!stored?.lessonStarted &&
        !!lesson &&
        (stored.status === "ongoing" || stored.status === "completed");

      const draft =
        exercise && lesson
          ? loadV2LessonDraft(
              typeof window !== "undefined" ? window.localStorage : null,
              exercise,
              lesson.id,
            )
          : null;

      // Keep the furthest known position. A refresh can happen before the
      // debounced API write lands, while the local draft is already current.
      const beatFromApi =
        typeof stored?.questionIndex === "number" ? stored.questionIndex : null;
      const mergedDraft: V2LessonDraft | null =
        draft || beatFromApi != null
          ? {
              beatIndex: Math.max(beatFromApi ?? 0, draft?.beatIndex ?? 0),
              completedBeatIds: draft?.completedBeatIds,
              code: draft?.code,
              webCode: draft?.webCode,
              formulaAnswer: draft?.formulaAnswer,
              resumePractice: draft?.resumePractice,
            }
          : null;

      setCurrentLesson(lesson);
      setLessonStarted(false);
      setCanResume(resume);
      setResumeDraft(mergedDraft);
      setProgressReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [allLessons, curriculum, exercise, getCourseProgress]);

  const persistLessonPosition = useCallback(
    (lesson: LessonV2, started: boolean, beatIndex = 0) => {
      if (!exercise || !curriculum) return;
      const lessonIndex = allLessons.findIndex((l) => l.lesson.id === lesson.id);
      updateCourseProgress(
        exercise,
        {
          status: started ? "ongoing" : "not-started",
          currentLessonId: lesson.id,
          lessonIndex: lessonIndex >= 0 ? lessonIndex : undefined,
          questionIndex: beatIndex,
          lessonStarted: started,
          canStartQuestions: false,
          lastUpdated: Date.now(),
        },
        { immediate: true },
      );
    },
    [allLessons, curriculum, exercise, updateCourseProgress],
  );

  const handleBeatProgress = useCallback(
    (draft: V2LessonDraft) => {
      if (!exercise || !currentLesson) return;
      saveV2LessonDraft(
        typeof window !== "undefined" ? window.localStorage : null,
        exercise,
        currentLesson.id,
        draft,
      );
      persistLessonPosition(currentLesson, true, draft.beatIndex);
    },
    [currentLesson, exercise, persistLessonPosition],
  );

  const handleStartLesson = useCallback(() => {
    if (!curriculum) return;
    const lesson = currentLesson ?? getFirstLessonV2(curriculum);
    if (!lesson) return;

    // Unlock audio inside the user tap; do not stop() — that clears speech queued for the new lesson.
    unlockMobileAudio();
    clearScheduledAfterSpeech();
    setCurrentLesson(lesson);
    setLessonStarted(true);
    setCanResume(false);
    setLessonKey((k) => k + 1);
    const startBeat = canResume ? resumeDraft?.beatIndex ?? 0 : 0;
    persistLessonPosition(lesson, true, startBeat);
  }, [
    canResume,
    clearScheduledAfterSpeech,
    curriculum,
    currentLesson,
    persistLessonPosition,
    resumeDraft?.beatIndex,
    unlockMobileAudio,
  ]);

  const selectLesson = useCallback(
    (lesson: LessonV2) => {
      unlockMobileAudio();
      stop();
      clearScheduledAfterSpeech();
      setCurrentLesson(lesson);
      setLessonStarted(true);
      setResumeDraft(
        loadV2LessonDraft(
          typeof window !== "undefined" ? window.localStorage : null,
          exercise ?? "",
          lesson.id,
        ),
      );
      setLessonKey((k) => k + 1);
      persistLessonPosition(lesson, true, 0);
    },
    [
      clearScheduledAfterSpeech,
      exercise,
      persistLessonPosition,
      stop,
      unlockMobileAudio,
    ],
  );

  const handleLessonComplete = useCallback(
    (lessonId: string) => {
      if (!exercise) return;

      clearV2LessonDraft(
        typeof window !== "undefined" ? window.localStorage : null,
        exercise,
        lessonId,
      );

      const stored = getCourseProgress(exercise);
      const completed = Array.from(
        new Set([...(stored?.completedLessons ?? []), lessonId]),
      );
      const lessonIndex = allLessons.findIndex((l) => l.lesson.id === lessonId);
      const { progress, done } = computeV2CourseProgress({
        lessonId,
        lessonIndex,
        lessonTotal,
        completedLessonIds: completed,
      });

      updateCourseProgress(
        exercise,
        {
          status: done ? "completed" : "ongoing",
          progress,
          completedLessons: completed,
          currentLessonId: lessonId,
          lessonIndex: lessonIndex >= 0 ? lessonIndex : stored?.lessonIndex,
          lessonStarted: true,
          canStartQuestions: true,
          lastUpdated: Date.now(),
        },
        done ? { immediate: true } : undefined,
      );
    },
    [allLessons, exercise, getCourseProgress, lessonTotal, updateCourseProgress],
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

  const handleRestartCourse = useCallback(() => {
    if (!exercise || !curriculum) return;
    stop();
    clearScheduledAfterSpeech();
    courseCompletionSpeechRef.current = false;
    const first = getFirstLessonV2(curriculum);
    if (exercise && first) {
      clearV2LessonDraft(
        typeof window !== "undefined" ? window.localStorage : null,
        exercise,
        first.id,
      );
    }
    for (const entry of allLessons) {
      if (!exercise) break;
      clearV2LessonDraft(
        typeof window !== "undefined" ? window.localStorage : null,
        exercise,
        entry.lesson.id,
      );
    }
    updateCourseProgress(
      exercise,
      {
        status: "not-started",
        progress: 0,
        currentLessonId: null,
        completedLessons: [],
        lessonIndex: undefined,
        questionIndex: 0,
        lessonStarted: false,
        canStartQuestions: false,
        lastUpdated: Date.now(),
      },
      { immediate: true },
    );
    setCurrentLesson(first);
    setLessonStarted(false);
    setCanResume(false);
    setResumeDraft(null);
    setLessonKey((k) => k + 1);
  }, [
    allLessons,
    clearScheduledAfterSpeech,
    curriculum,
    exercise,
    stop,
    updateCourseProgress,
  ]);

  useEffect(() => {
    if (!isCourseCompleted || !lessonStarted || !curriculum) return;
    if (courseCompletionSpeechRef.current) return;
    courseCompletionSpeechRef.current = true;
    speak(buildCourseCompletionSpeech(curriculum.title));
  }, [curriculum, isCourseCompleted, lessonStarted, speak]);

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
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-[20px] bg-white shadow-lg">
      <PageLoadWaitBanner
        isLoading={isInstructorWaiting && !showMobileAudioUnlock}
        mobileOnly={false}
      />

      {!lessonStarted ? (
        <div className="flex h-full min-h-0 flex-col overflow-hidden border-l-0 border-primary/20 bg-linear-to-br from-[#F3ECFE] via-[#F8F4FF] to-white lg:border-l-2">
          {isLgUp ? (
            <div className="flex min-h-0 flex-1 items-center justify-center p-6">
              <div className="aspect-square h-full max-h-80 w-full max-w-sm overflow-hidden rounded-2xl border border-primary/15 bg-linear-to-b from-primary/10 to-white shadow-inner">
                {avatarSlot}
              </div>
            </div>
          ) : (
            <div
              className="pointer-events-none fixed bottom-0 right-0 z-0 h-[280px] w-[320px] translate-x-8 translate-y-12 opacity-0"
              aria-hidden
            >
              {avatarSlot}
            </div>
          )}
          <div className="flex min-h-[280px] flex-1 items-center justify-center px-4 py-8 sm:px-6">
            <div className="mx-auto max-w-md text-center">
              <div className="relative mb-6 inline-flex items-center justify-center">
                <div className="absolute h-20 w-20 animate-ping rounded-full bg-primary/10" />
                <div className="absolute h-16 w-16 animate-pulse rounded-full bg-primary/20" />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-linear-to-br from-primary to-primary/80 shadow-lg shadow-primary/30">
                  <Play className="size-8 fill-white text-white" aria-hidden />
                </div>
              </div>
              <h2 className="mb-2 font-solway text-2xl font-bold text-gray-800">
                {canResume ? "Continue your lesson?" : "Ready to Learn?"}
              </h2>
              <p className="mb-2 font-inter text-sm font-medium text-gray-700">
                {canResume && currentLesson
                  ? currentLesson.title
                  : curriculum.title}
              </p>
              <p className="mb-6 font-inter leading-relaxed text-gray-500">
                {canResume
                  ? "Pick up where you left off. Tap below and your instructor will start teaching this lesson again."
                  : "Your learning adventure awaits! Tap below to begin your lesson and start building amazing things."}
              </p>
              <button
                type="button"
                onClick={handleStartLesson}
                className="group mx-auto flex w-full max-w-xs shrink-0 items-center justify-center gap-3 whitespace-nowrap rounded-full bg-linear-to-r from-primary via-primary to-primary/90 px-10 py-4 font-solway text-base font-bold tracking-tight text-white shadow-lg shadow-primary/35 ring-2 ring-primary/20 transition-all duration-200 hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/40 active:scale-[0.98] sm:max-w-none sm:px-12"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/20 ring-1 ring-white/30">
                  <Play className="size-5 fill-white text-white" aria-hidden />
                </span>
                <span className="pr-1">
                  {canResume ? "Continue learning" : MOBILE_INSTRUCTOR_AUDIO_BUTTON}
                </span>
              </button>
              {canResume ? (
                <CourseProgressResetLink onReset={handleRestartCourse} />
              ) : null}
              <div className="mt-8 flex items-center justify-center gap-2 font-inter text-xs text-gray-400">
                <span className="h-1 w-1 rounded-full bg-primary/40" />
                <span>Interactive lessons</span>
                <span className="h-1 w-1 rounded-full bg-primary/40" />
                <span>Fun quizzes</span>
                <span className="h-1 w-1 rounded-full bg-primary/40" />
                <span>Hands-on coding</span>
              </div>
            </div>
          </div>
        </div>
      ) : isCourseCompleted && currentLesson ? (
        <CourseCompletionCelebration
          courseTitle={curriculum.title}
          instructorMessage={buildCourseCompletionSpeech(curriculum.title)}
          currentSubtitle={currentSubtitle}
          isSpeaking={isSpeaking}
          avatarSlot={avatarSlot}
          onRestart={handleRestartCourse}
        />
      ) : (
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
          isPaused={isPaused}
          onTogglePause={togglePause}
          onRewind={rewindSpeaking}
          currentSubtitle={currentSubtitle}
          avatarSlot={avatarSlot}
          onLessonComplete={handleLessonComplete}
          onNextLesson={handleNextLesson}
          hideFlowChrome
          classicLayout
          showMobileAudioUnlock={showMobileAudioUnlock}
          onMobileAudioUnlock={unlockMobileAudio}
          isInstructorWaiting={isInstructorWaiting}
          suppressMobileWaitBanner
          initialBeatIndex={resumeDraft?.beatIndex ?? 0}
          initialDraft={resumeDraft}
          onBeatProgress={handleBeatProgress}
        />
      )}
    </div>
  );
}
