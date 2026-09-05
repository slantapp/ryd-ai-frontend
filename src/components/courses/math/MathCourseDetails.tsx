import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import Split from "react-split";
import NarratorAvatar from "narrator-avatar";
import { Calculator, CheckCircle2, Mic, Pause, Play, RotateCcw, Volume2, XCircle } from "lucide-react";
import {
  type Question,
  type Lesson,
  type FormulaExample,
  findLessonById,
  getFirstLesson,
  getCurriculumBySlug,
  getModuleInfoForLesson,
  getNextLessonInOrder,
  getPreviousLessonInOrder,
  getModuleIndexForLesson,
  getLessonIndexInCurriculum,
  getLessonByIndex,
} from "@/data/curriculumData";
import { applySubtitleShow } from "@/features/curriculum-preview/v2/subtitleShow";
import {
  MultipleChoiceQuestion,
  TrueFalseQuestion,
  LessonNavControls,
  LessonProgressBar,
  PageLoadWaitBanner,
} from "@/components/courses/exercise";
import MathFormulaBoard from "./MathFormulaBoard";
import MathAnswerWorkspace from "./MathAnswerWorkspace";
import MathText from "./MathText";
import { compareFormulaAnswer } from "@/utils/formulaAnswer";
import { useInstructorStore, INSTRUCTORS } from "@/stores/instructorStore";
import { useCoursesStore } from "@/stores/coursesStore";
import { cn } from "@/lib/utils";
import { stopAvatarSpeech } from "@/utils/stopAvatarSpeech";
import {
  createSpeechRewindTracker,
  REWIND_RESPEAK_DELAY_MS,
  REWIND_SECONDS,
} from "@/utils/speechRewind";
import {
  MOBILE_INSTRUCTOR_AUDIO_BUTTON,
  MOBILE_INSTRUCTOR_AUDIO_HINT,
} from "@/constants/mobileInstructorAudio";
import { useMediaQueryMinLg } from "@/hooks/useMediaQueryMinLg";
import { isInstructorWaitActive } from "@/hooks/isInstructorWaitActive";
import { useAvatarAudioRecovery } from "@/hooks/useAvatarAudioRecovery";
import {
  buildLessonNavSnapshot,
  estimateSpeechFallbackMs,
  isLessonIdMarkedComplete,
  resolveLessonPhase,
  withLessonMarkedComplete,
  type LessonPhase,
  type PrimaryNavKind,
} from "@/utils/lessonNavigation";
import {
  buildCourseCompletionSpeech,
  isLessonProgressComplete,
  isV1CourseFinished,
} from "@/utils/courseProgress";
import { CourseCompletionCelebration } from "@/components/courses/CourseCompletionCelebration";
import { CourseProgressResetLink } from "@/components/courses/CourseProgressResetLink";

interface NarratorAvatarRef {
  speakText: (text: string, options?: Record<string, unknown>) => void;
  pauseSpeaking: () => void;
  resumeSpeaking: () => void;
  stopSpeaking: () => void;
}

interface CourseProgress {
  lessonId: string | null;
  lessonIndex?: number;
  questionIndex: number;
  lessonStarted: boolean;
  canStartQuestions: boolean;
  lastUpdated: number;
}

type PendingResume = {
  lesson: Lesson;
  questionIndex: number;
  canStartQuestions: boolean;
  lessonComplete: boolean;
};

type PendingAction =
  | { type: "none" }
  | { type: "next_question" }
  | { type: "enable_start_questions" }
  | { type: "enable_next_lesson" }
  | { type: "show_completion" }
  | { type: "ask_question"; question: Question }
  | { type: "clear_formula_and_ask"; question: Question }
  | { type: "wait_then_clear_and_ask"; question: Question }
  | { type: "start_lesson_formula_demo"; lesson: Lesson }
  | {
    type: "lesson_formula_outro";
    hasQuestions: boolean;
    hasNextLesson: boolean;
  };

function InstructorSpeakingIndicator({ isSpeaking }: { isSpeaking: boolean }) {
  return (
    <div className="relative flex size-11 shrink-0 items-center justify-center sm:size-12">
      {isSpeaking && (
        <>
          <span className="absolute inline-flex size-[120%] animate-ping rounded-full bg-primary/30" />
          <span className="absolute inline-flex size-full rounded-full bg-primary/20" />
        </>
      )}
      <div
        className={cn(
          "relative flex size-9 items-center justify-center rounded-xl border-2 bg-white shadow-md transition-all duration-300 sm:size-10",
          isSpeaking
            ? "scale-105 border-primary shadow-lg shadow-primary/25"
            : "border-primary/25",
        )}
      >
        <Mic
          className={cn(
            "size-[1.15rem] text-primary sm:size-5",
            isSpeaking && "animate-pulse",
          )}
          aria-hidden
        />
      </div>
    </div>
  );
}

function MathCourseDetailsInner() {
  const { exercise } = useParams<{ exercise: string }>();
  const location = useLocation();
  const selectedInstructor = useInstructorStore((s) => s.selectedInstructor);
  const instructorConfig = INSTRUCTORS[selectedInstructor];
  const { updateCourseProgress } = useCoursesStore();
  const isCourseCompleted = useCoursesStore((state) =>
    exercise ? state.courseProgress[exercise]?.status === "completed" : false,
  );

  const avatarRef = useRef<NarratorAvatarRef | null>(null);
  const avatarReadyRef = useRef(false);
  const [isAvatarReady, setIsAvatarReady] = useState(false);
  const [awaitingSpeech, setAwaitingSpeech] = useState(false);
  const [hasPendingSpeech, setHasPendingSpeech] = useState(false);
  const pendingSpeechQueueRef = useRef<
    Array<{ text: string; action: PendingAction }>
  >([]);
  const pendingActionRef = useRef<PendingAction>({ type: "none" });
  const isManuallyStopped = useRef(false);
  const formulaTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const isTypingFormulaRef = useRef(false);
  const speechStartTimeRef = useRef(0);
  const lastSpeechTextRef = useRef("");
  const moveToNextQuestionRef = useRef<() => void>(() => { });
  const introUnlockTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  /** Lesson id waiting for intro unlock (speech end or fallback). */
  const pendingIntroUnlockLessonIdRef = useRef<string | null>(null);
  const pendingResumeRef = useRef<PendingResume | null>(null);
  const courseCompletionSpeechRef = useRef(false);
  const [canResume, setCanResume] = useState(false);

  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const currentLessonRef = useRef<Lesson | null>(null);
  currentLessonRef.current = currentLesson;
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [lessonStarted, setLessonStarted] = useState(false);

  // Progress-driven nav: phase + introReady (not speech-gated button flags)
  const [lessonPhase, setLessonPhase] = useState<LessonPhase>("intro");
  const [introReady, setIntroReady] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const [selectedAnswer, setSelectedAnswer] = useState<string | boolean | null>(
    null,
  );
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [correctAnswersCount, setCorrectAnswersCount] = useState(0);
  // Score each question once by index. This prevents review navigation or
  // rapid repeated clicks from producing impossible totals such as 4 out of 3.
  const answerResultsRef = useRef<Map<number, boolean>>(new Map());
  const answerSubmissionInFlightRef = useRef(false);
  const [progressPct, setProgressPct] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const pausedLiveRef = useRef(false);
  const lastSpokenTextRef = useRef<string>("");
  /** Tracks live playback position inside the current utterance (for rewind). */
  const rewindTracker = useMemo(() => createSpeechRewindTracker(), []);
  const lessonFlatIndexRef = useRef<number | undefined>(undefined);
  const [totalQuestionsAnswered, setTotalQuestionsAnswered] = useState(0);
  const [moduleCorrectCount, setModuleCorrectCount] = useState(0);
  const [moduleTotalAnswered, setModuleTotalAnswered] = useState(0);
  const [completedLessonIds, setCompletedLessonIds] = useState<Set<string>>(
    new Set(),
  );
  const [studentAnswer, setStudentAnswer] = useState("");
  const [displayedFormula, setDisplayedFormula] = useState("");
  const [isFormulaTyping, setIsFormulaTyping] = useState(false);
  const [activeFormulaExample, setActiveFormulaExample] =
    useState<FormulaExample | null>(null);
  const [currentSubtitle, setCurrentSubtitle] = useState("");
  const handleSubtitle = useCallback(
    (text: string) => {
      rewindTracker.noteSubtitle(text);
      setCurrentSubtitle(
        applySubtitleShow(text, currentLessonRef.current?.avatar_show),
      );
    },
    [rewindTracker],
  );
  const [isShowingSubtitles, setIsShowingSubtitles] = useState(false);
  const [showMobileAudioUnlock, setShowMobileAudioUnlock] = useState(false);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(
    null,
  );

  const curriculum = exercise
    ? getCurriculumBySlug(exercise)?.curriculum ?? null
    : null;
  const isLgUp = useMediaQueryMinLg();
  useAvatarAudioRecovery(avatarRef, isSpeaking);

  const clearIntroUnlockTimeout = useCallback(() => {
    if (introUnlockTimeoutRef.current) {
      clearTimeout(introUnlockTimeoutRef.current);
      introUnlockTimeoutRef.current = null;
    }
  }, []);

  const markIntroReady = useCallback(
    (lesson?: Lesson | null) => {
      clearIntroUnlockTimeout();
      pendingIntroUnlockLessonIdRef.current = null;
      setIntroReady(true);
      const target = lesson ?? currentLesson;
      if (target && !(target.questions?.length > 0)) {
        setLessonPhase("complete");
        setCompletedLessonIds((prev) =>
          withLessonMarkedComplete(
            prev,
            target.id,
            curriculum
              ? getLessonIndexInCurriculum(
                  target,
                  curriculum,
                  lessonFlatIndexRef.current,
                )
              : lessonFlatIndexRef.current,
          ),
        );
      }
      if (target && exercise) {
        updateCourseProgress(exercise, {
          currentLessonId: target.id,
          lessonIndex: curriculum
            ? getLessonIndexInCurriculum(target, curriculum)
            : undefined,
          questionIndex: 0,
          lessonStarted: true,
          canStartQuestions: true,
          lastUpdated: Date.now(),
        });
      }
    },
    [
      clearIntroUnlockTimeout,
      currentLesson,
      exercise,
      curriculum,
      updateCourseProgress,
    ],
  );

  const scheduleIntroUnlockFallback = useCallback(
    (lesson: Lesson, textLength: number) => {
      clearIntroUnlockTimeout();
      pendingIntroUnlockLessonIdRef.current = lesson.id;
      introUnlockTimeoutRef.current = setTimeout(() => {
        if (pendingIntroUnlockLessonIdRef.current !== lesson.id) return;
        markIntroReady(lesson);
      }, estimateSpeechFallbackMs(textLength));
    },
    [clearIntroUnlockTimeout, markIntroReady],
  );

  const enterLessonIntro = useCallback((lesson: Lesson) => {
    setCurrentLesson(lesson);
    setCurrentQuestion(null);
    setCurrentQuestionIndex(0);
    setLessonPhase("intro");
    setIntroReady(false);
    setSelectedAnswer(null);
    setIsAnswerSubmitted(false);
    setStudentAnswer("");
    setLastAnswerCorrect(null);
  }, []);

  const getAvatar = useCallback(() => avatarRef.current, []);

  const syncPendingSpeech = useCallback(() => {
    setHasPendingSpeech(pendingSpeechQueueRef.current.length > 0);
  }, []);

  const ensureAvatarReady = useCallback(() => {
    if (avatarReadyRef.current) return true;
    const avatar = getAvatar() as { isReady?: boolean } | null;
    if (avatar?.isReady) {
      avatarReadyRef.current = true;
      setIsAvatarReady(true);
      return true;
    }
    return false;
  }, [getAvatar]);

  const speakImmediate = useCallback(
    (text: string, action: PendingAction = { type: "none" }) => {
      try {
        const avatar = getAvatar();
        if (avatar && text && typeof avatar.speakText === "function") {
          pendingActionRef.current = action;
          speechStartTimeRef.current = Date.now();
          lastSpeechTextRef.current = text;
          rewindTracker.beginUtterance(text);
          lastSpokenTextRef.current = text;
          setAwaitingSpeech(true);
          avatar.speakText(text);
        }
      } catch (error) {
        console.warn("Error speaking text:", error);
        setAwaitingSpeech(false);
      }
    },
    [getAvatar, rewindTracker],
  );

  const speak = useCallback(
    (text: string, action: PendingAction = { type: "none" }) => {
      if (!ensureAvatarReady()) {
        pendingSpeechQueueRef.current.push({ text, action });
        syncPendingSpeech();
        setAwaitingSpeech(true);
        return;
      }
      speakImmediate(text, action);
    },
    [ensureAvatarReady, speakImmediate, syncPendingSpeech],
  );

  const flushNextQueuedSpeech = useCallback(() => {
    const next = pendingSpeechQueueRef.current.shift();
    if (!next) {
      syncPendingSpeech();
      return;
    }
    syncPendingSpeech();
    speakImmediate(next.text, next.action);
  }, [speakImmediate, syncPendingSpeech]);

  // Instructor pause/resume, persisted so learners can resume after leaving.
  const pauseStorageKey = exercise ? `ryd-lesson-pause:${exercise}` : null;

  const persistPausedState = useCallback(
    (text: string) => {
      if (!pauseStorageKey) return;
      try {
        localStorage.setItem(
          pauseStorageKey,
          JSON.stringify({ text, at: Date.now() }),
        );
      } catch {
        // ignore storage errors
      }
    },
    [pauseStorageKey],
  );

  const clearPausedState = useCallback(() => {
    if (!pauseStorageKey) return;
    try {
      localStorage.removeItem(pauseStorageKey);
    } catch {
      // ignore
    }
  }, [pauseStorageKey]);

  const handleTogglePause = useCallback(() => {
    const avatar = getAvatar();
    if (isPaused) {
      if (pausedLiveRef.current && typeof avatar?.resumeSpeaking === "function") {
        avatar.resumeSpeaking();
        rewindTracker.noteResume();
        setIsSpeaking(true);
      } else if (lastSpokenTextRef.current) {
        const resume = rewindTracker.computeResume();
        speak(resume?.text ?? lastSpokenTextRef.current);
      }
      pausedLiveRef.current = false;
      setIsPaused(false);
      clearPausedState();
    } else {
      if (typeof avatar?.pauseSpeaking === "function") {
        rewindTracker.notePause();
        avatar.pauseSpeaking();
        pausedLiveRef.current = true;
      }
      setIsPaused(true);
      setIsSpeaking(false);
      persistPausedState(lastSpokenTextRef.current);
    }
  }, [
    isPaused,
    getAvatar,
    rewindTracker,
    speak,
    persistPausedState,
    clearPausedState,
  ]);

  const handleRewindSpeech = useCallback(() => {
    if (!isSpeaking && !isPaused) return;
    const slice = rewindTracker.computeRewind(REWIND_SECONDS);
    if (!slice) return;

    const avatar = getAvatar();
    if (!avatar || typeof avatar.speakText !== "function") return;

    // Stopping mid-utterance makes the avatar report speech-end; letting that
    // through would run the queued follow-up and skip the lesson forward.
    isManuallyStopped.current = true;
    stopAvatarSpeech(avatar);
    rewindTracker.beginChunk(slice.startIndex);

    // pendingActionRef is deliberately left intact — the rewound line still has
    // to unlock questions / the next lesson when it finishes.
    pausedLiveRef.current = false;
    setIsPaused(false);
    clearPausedState();
    speechStartTimeRef.current = Date.now();
    lastSpeechTextRef.current = slice.text;
    setCurrentSubtitle("");
    setIsSpeaking(true);
    setAwaitingSpeech(true);

    // Keep the AudioContext alive inside this tap (WebKit autoplay policy).
    void (avatar as { resumeAudioContext?: () => Promise<void> })
      .resumeAudioContext?.()
      .catch(() => {
        /* expected on some WebKit builds until speakText */
      });

    window.setTimeout(() => {
      isManuallyStopped.current = false;
      const live = getAvatar();
      if (!live || typeof live.speakText !== "function") {
        setAwaitingSpeech(false);
        return;
      }
      try {
        live.speakText(slice.text);
      } catch (error) {
        console.warn("Error rewinding speech:", error);
        setAwaitingSpeech(false);
      }
    }, REWIND_RESPEAK_DELAY_MS);
  }, [clearPausedState, getAvatar, isPaused, isSpeaking, rewindTracker]);

  useEffect(() => {
    if (!pauseStorageKey) return;
    try {
      const raw = localStorage.getItem(pauseStorageKey);
      if (!raw) return;
      const saved = JSON.parse(raw) as { text?: string };
      if (saved?.text) {
        lastSpokenTextRef.current = saved.text;
        pausedLiveRef.current = false;
        setIsPaused(true);
      }
    } catch {
      // ignore malformed storage
    }
  }, [pauseStorageKey]);

  const handleAvatarReady = useCallback(() => {
    avatarReadyRef.current = true;
    setIsAvatarReady(true);
    if (pendingSpeechQueueRef.current.length === 0) {
      setShowMobileAudioUnlock(false);
      return;
    }
    if (!isLgUp) {
      setShowMobileAudioUnlock(true);
      return;
    }
    flushNextQueuedSpeech();
  }, [isLgUp, flushNextQueuedSpeech]);

  const handleMobileAudioUnlock = useCallback(() => {
    setShowMobileAudioUnlock(false);
    flushNextQueuedSpeech();
  }, [flushNextQueuedSpeech]);

  const stopSubtitles = useCallback(() => {
    setCurrentSubtitle("");
    setIsShowingSubtitles(false);
  }, []);

  const stopFormulaTyping = useCallback(() => {
    isTypingFormulaRef.current = false;
    setIsFormulaTyping(false);
    if (formulaTypingTimeoutRef.current) {
      clearTimeout(formulaTypingTimeoutRef.current);
      formulaTypingTimeoutRef.current = null;
    }
  }, []);

  const stopSpeaking = useCallback(() => {
    stopFormulaTyping();
    stopSubtitles();
    pendingSpeechQueueRef.current = [];
    setHasPendingSpeech(false);
    setAwaitingSpeech(false);
    setShowMobileAudioUnlock(false);
    clearIntroUnlockTimeout();
    pendingIntroUnlockLessonIdRef.current = null;
    isManuallyStopped.current = true;
    stopAvatarSpeech(getAvatar());
    pendingActionRef.current = { type: "none" };
    setIsSpeaking(false);
    setIsPaused(false);
    pausedLiveRef.current = false;
    rewindTracker.reset();
    clearPausedState();
    setTimeout(() => {
      isManuallyStopped.current = false;
    }, 300);
  }, [
    clearIntroUnlockTimeout,
    getAvatar,
    rewindTracker,
    stopFormulaTyping,
    stopSubtitles,
    clearPausedState,
  ]);

  const persistCoursePosition = useCallback(
    (progress: Partial<CourseProgress>) => {
      if (!exercise) return;
      if (typeof progress.lessonIndex === "number") {
        lessonFlatIndexRef.current = progress.lessonIndex;
      }
      updateCourseProgress(exercise, {
        currentLessonId: progress.lessonId ?? null,
        lessonIndex: progress.lessonIndex,
        questionIndex: progress.questionIndex,
        lessonStarted: progress.lessonStarted,
        canStartQuestions: progress.canStartQuestions,
        lastUpdated: Date.now(),
      });
    },
    [exercise, updateCourseProgress],
  );

  const calculateProgress = useCallback(
    (
      lessonIndex: number,
      totalLessons: number,
      questionIndex: number,
      totalQuestions: number,
      hasStarted: boolean,
      isLessonComplete: boolean,
    ): number => {
      if (totalLessons === 0) return 0;
      const lessonWeight = 100 / totalLessons;
      const completedLessonsPct = lessonIndex * lessonWeight;
      let currentLessonPct = 0;
      if (isLessonComplete) currentLessonPct = lessonWeight;
      else if (totalQuestions > 0 && hasStarted)
        currentLessonPct = (questionIndex / totalQuestions) * lessonWeight;
      else if (hasStarted) currentLessonPct = lessonWeight * 0.5;
      return Math.min(100, Math.max(0, Math.round(completedLessonsPct + currentLessonPct)));
    },
    [],
  );

  const speakLessonFormulaOutro = useCallback(
    (hasQuestions: boolean, hasNextLesson: boolean, lesson?: Lesson | null) => {
      if (hasQuestions) {
        const text =
          "Great! Now let's test your understanding with some questions. Click 'Start Questions' when you're ready.";
        if (lesson) scheduleIntroUnlockFallback(lesson, text.length);
        speak(text, { type: "enable_start_questions" });
      } else if (hasNextLesson) {
        const text =
          "You've completed this lesson! Click 'Next Lesson' to continue.";
        if (lesson) scheduleIntroUnlockFallback(lesson, text.length);
        speak(text, { type: "enable_next_lesson" });
      } else {
        const text =
          "Congratulations! You've completed all lessons in this module.";
        if (lesson) scheduleIntroUnlockFallback(lesson, text.length);
        speak(text, { type: "show_completion" });
      }
    },
    [scheduleIntroUnlockFallback, speak],
  );

  const playLessonFormulaTyping = useCallback(
    (detail: FormulaExample, lesson: Lesson) => {
      stopFormulaTyping();
      isTypingFormulaRef.current = true;
      setIsFormulaTyping(true);
      setActiveFormulaExample(detail);
      setDisplayedFormula("");
      setIntroReady(false);

      const formulaToType = detail.formula;
      const typingSpeed = detail.typingSpeed ?? 45;
      let currentIndex = 0;
      const hasQuestions = (lesson.questions?.length ?? 0) > 0;
      const hasNextLesson = curriculum
        ? !!getNextLessonInOrder(lesson, curriculum)
        : !!lesson.next_lesson_id;

      if (detail.explanation) {
        speak(detail.explanation, {
          type: "lesson_formula_outro",
          hasQuestions,
          hasNextLesson,
        });
      }

      const typeNextChar = () => {
        if (!isTypingFormulaRef.current) return;
        if (currentIndex < formulaToType.length) {
          setDisplayedFormula(formulaToType.substring(0, currentIndex + 1));
          currentIndex++;
          formulaTypingTimeoutRef.current = setTimeout(typeNextChar, typingSpeed);
        } else {
          isTypingFormulaRef.current = false;
          setIsFormulaTyping(false);
          if (!detail.explanation) {
            speakLessonFormulaOutro(hasQuestions, hasNextLesson, lesson);
          }
        }
      };

      formulaTypingTimeoutRef.current = setTimeout(typeNextChar, 300);
    },
    [curriculum, speak, speakLessonFormulaOutro, stopFormulaTyping],
  );

  const typeFormulaExample = useCallback(
    (detail: FormulaExample, question: Question) => {
      stopFormulaTyping();
      isTypingFormulaRef.current = true;
      setIsFormulaTyping(true);
      setStudentAnswer("");
      setDisplayedFormula("");
      setActiveFormulaExample(detail);
      setLastAnswerCorrect(null);

      const formulaToType = detail.formula;
      const typingSpeed = detail.typingSpeed ?? 45;
      let currentIndex = 0;

      if (detail.description) speak(detail.description);

      const startTyping = () => {
        const typeNextChar = () => {
          if (!isTypingFormulaRef.current) return;
          if (currentIndex < formulaToType.length) {
            setDisplayedFormula(formulaToType.substring(0, currentIndex + 1));
            currentIndex++;
            formulaTypingTimeoutRef.current = setTimeout(typeNextChar, typingSpeed);
          } else {
            isTypingFormulaRef.current = false;
            setIsFormulaTyping(false);
            if (detail.explanation) {
              setTimeout(() => {
                speak(detail.explanation!, {
                  type: "wait_then_clear_and_ask",
                  question,
                });
              }, 800);
            } else {
              setTimeout(() => {
                speak(
                  "Now it's your turn! Try solving the problem yourself.",
                  { type: "clear_formula_and_ask", question },
                );
              }, 1500);
            }
          }
        };
        formulaTypingTimeoutRef.current = setTimeout(typeNextChar, 500);
      };

      const descriptionDelay = detail.description
        ? Math.max(2000, (detail.description.split(/\s+/).length / 2.5) * 1000)
        : 500;
      setTimeout(startTyping, descriptionDelay);
    },
    [speak, stopFormulaTyping],
  );

  const beginQuestion = useCallback(
    (question: Question) => {
      setStudentAnswer("");
      setDisplayedFormula("");
      setLastAnswerCorrect(null);
      setSelectedAnswer(null);
      setIsAnswerSubmitted(false);

      if (question.type === "formula_test" && question.formula_example) {
        typeFormulaExample(question.formula_example, question);
      } else {
        setActiveFormulaExample(null);
        speak(question.question);
      }
    },
    [speak, typeFormulaExample],
  );

  const recordAnswerResult = useCallback(
    (isCorrect: boolean) => {
      const totalQuestions = currentLesson?.questions?.length ?? 0;
      if (
        totalQuestions === 0 ||
        currentQuestionIndex < 0 ||
        currentQuestionIndex >= totalQuestions
      ) {
        return;
      }

      answerResultsRef.current.set(currentQuestionIndex, isCorrect);
      const validResults = Array.from(answerResultsRef.current.entries()).filter(
        ([index]) => index >= 0 && index < totalQuestions,
      );
      setTotalQuestionsAnswered(validResults.length);
      setCorrectAnswersCount(
        validResults.reduce(
          (count, [, correct]) => count + (correct ? 1 : 0),
          0,
        ),
      );
    },
    [currentLesson, currentQuestionIndex],
  );

  useEffect(() => {
    answerSubmissionInFlightRef.current = false;
  }, [currentLesson?.id, currentQuestionIndex]);

  useEffect(() => {
    if (!isAnswerSubmitted) {
      answerSubmissionInFlightRef.current = false;
    }
  }, [isAnswerSubmitted]);

  useEffect(() => {
    if (totalQuestionsAnswered === 0 && correctAnswersCount === 0) {
      answerResultsRef.current.clear();
    }
  }, [correctAnswersCount, totalQuestionsAnswered]);

  const moveToNextQuestion = useCallback(() => {
    if (!currentLesson?.questions) return;
    stopFormulaTyping();

    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex < currentLesson.questions.length) {
      const nextQuestion = currentLesson.questions[nextIndex];
      setCurrentQuestion(nextQuestion);
      setCurrentQuestionIndex(nextIndex);
      setLessonPhase("questions");
      persistCoursePosition({
        lessonId: currentLesson.id,
        lessonIndex: curriculum
          ? getLessonIndexInCurriculum(currentLesson, curriculum)
          : undefined,
        questionIndex: nextIndex,
        lessonStarted: true,
        canStartQuestions: true,
      });
      beginQuestion(nextQuestion);
      return;
    }

    setCurrentQuestion(null);
    setActiveFormulaExample(null);
    setCurrentQuestionIndex(currentLesson.questions.length);
    setLessonPhase("complete");
    setIntroReady(true);
    setCompletedLessonIds((prev) =>
      withLessonMarkedComplete(
        prev,
        currentLesson.id,
        curriculum
          ? getLessonIndexInCurriculum(
              currentLesson,
              curriculum,
              lessonFlatIndexRef.current,
            )
          : lessonFlatIndexRef.current,
      ),
    );

    const totalQuestions = currentLesson.questions.length;
    const lessonResults = Array.from(answerResultsRef.current.entries()).filter(
      ([index]) => index >= 0 && index < totalQuestions,
    );
    const answeredCount = Math.min(totalQuestions, lessonResults.length);
    const correctCount = Math.min(
      answeredCount,
      lessonResults.reduce(
        (count, [, correct]) => count + (correct ? 1 : 0),
        0,
      ),
    );
    const wrongCount = answeredCount - correctCount;
    const newModuleCorrect = moduleCorrectCount + correctCount;
    const newModuleTotal = moduleTotalAnswered + answeredCount;
    setModuleCorrectCount(newModuleCorrect);
    setModuleTotalAnswered(newModuleTotal);

    const lessonSummary = `In this lesson, you learned about ${currentLesson.title}.`;
    let lessonScore = "";
    if (answeredCount > 0) {
      lessonScore = ` You got ${correctCount} out of ${totalQuestions} questions correct.`;
      if (wrongCount > 0) {
        lessonScore += ` You got ${wrongCount} question${wrongCount > 1 ? "s" : ""} wrong.`;
      }
    }

    const moduleInfo = curriculum
      ? getModuleInfoForLesson(currentLesson.id, curriculum)
      : null;
    const isLastLessonInModule = moduleInfo?.isLastLessonInModule ?? false;
    const hasNext = curriculum
      ? !!getNextLessonInOrder(currentLesson, curriculum)
      : !!currentLesson.next_lesson_id;

    let completionMessage = "";
    if (isLastLessonInModule) {
      completionMessage = `Congratulations! You've completed this module. ${lessonSummary}${lessonScore}`;
      if (newModuleTotal > 0) {
        completionMessage += ` Across all lessons in this module, you answered ${newModuleCorrect} out of ${newModuleTotal} questions correctly.`;
      }
      if (hasNext) {
        completionMessage += " Click 'Next Lesson' to continue.";
      }
    } else {
      completionMessage = `Great job! ${lessonSummary}${lessonScore} Click 'Next Lesson' to continue.`;
    }

    persistCoursePosition({
      lessonId: currentLesson.id,
      lessonIndex: curriculum
        ? getLessonIndexInCurriculum(currentLesson, curriculum)
        : undefined,
      questionIndex: totalQuestions,
      lessonStarted: true,
      canStartQuestions: true,
    });

    setTimeout(() => {
      speak(
        completionMessage,
        hasNext ? { type: "enable_next_lesson" } : { type: "show_completion" },
      );
      setTimeout(() => setIsSpeaking(false), 15000);
    }, 300);
  }, [
    beginQuestion,
    currentLesson,
    currentQuestionIndex,
    curriculum,
    moduleCorrectCount,
    moduleTotalAnswered,
    persistCoursePosition,
    speak,
    stopFormulaTyping,
  ]);

  useEffect(() => {
    moveToNextQuestionRef.current = moveToNextQuestion;
  }, [moveToNextQuestion]);

  const handleSpeechEndInternal = useCallback(() => {
    setIsSpeaking(false);
    setIsPaused(false);
    pausedLiveRef.current = false;
    clearPausedState();
    stopSubtitles();
    const action = pendingActionRef.current;
    pendingActionRef.current = { type: "none" };
    speechStartTimeRef.current = 0;
    lastSpeechTextRef.current = "";

    switch (action.type) {
      case "next_question":
        setTimeout(() => moveToNextQuestionRef.current(), 500);
        break;
      case "enable_start_questions":
        markIntroReady(currentLesson);
        break;
      case "enable_next_lesson":
        markIntroReady(currentLesson);
        setLessonPhase("complete");
        if (currentLesson) {
          setCompletedLessonIds((prev) =>
            withLessonMarkedComplete(
              prev,
              currentLesson.id,
              curriculum
                ? getLessonIndexInCurriculum(
                    currentLesson,
                    curriculum,
                    lessonFlatIndexRef.current,
                  )
                : lessonFlatIndexRef.current,
            ),
          );
        }
        break;
      case "show_completion":
        markIntroReady(currentLesson);
        setLessonPhase("complete");
        if (currentLesson) {
          setCompletedLessonIds((prev) =>
            withLessonMarkedComplete(
              prev,
              currentLesson.id,
              curriculum
                ? getLessonIndexInCurriculum(
                    currentLesson,
                    curriculum,
                    lessonFlatIndexRef.current,
                  )
                : lessonFlatIndexRef.current,
            ),
          );
        }
        break;
      case "ask_question":
        setTimeout(() => speak(action.question.question), 300);
        break;
      case "clear_formula_and_ask":
        setDisplayedFormula("");
        setActiveFormulaExample(null);
        setTimeout(() => speak(action.question.question), 500);
        break;
      case "wait_then_clear_and_ask":
        setTimeout(() => {
          speak(
            "Now it's your turn! Try solving the problem yourself.",
            { type: "clear_formula_and_ask", question: action.question },
          );
        }, 1500);
        break;
      case "start_lesson_formula_demo":
        if (action.lesson.formula_example) {
          playLessonFormulaTyping(action.lesson.formula_example, action.lesson);
        } else {
          speakLessonFormulaOutro(
            (action.lesson.questions?.length ?? 0) > 0,
            curriculum
              ? !!getNextLessonInOrder(action.lesson, curriculum)
              : !!action.lesson.next_lesson_id,
            action.lesson,
          );
        }
        break;
      case "lesson_formula_outro":
        speakLessonFormulaOutro(
          action.hasQuestions,
          action.hasNextLesson,
          currentLesson,
        );
        break;
      default:
        break;
    }
    flushNextQueuedSpeech();
  }, [
    curriculum,
    currentLesson,
    clearPausedState,
    flushNextQueuedSpeech,
    markIntroReady,
    playLessonFormulaTyping,
    speak,
    speakLessonFormulaOutro,
    stopSubtitles,
  ]);

  const handleSpeechStart = useCallback(() => {
    isManuallyStopped.current = false;
    rewindTracker.noteAudioStart();
    setIsSpeaking(true);
    setIsShowingSubtitles(true);
    setAwaitingSpeech(false);
    syncPendingSpeech();
    setIsPaused(false);
    pausedLiveRef.current = false;
    clearPausedState();
  }, [clearPausedState, rewindTracker, syncPendingSpeech]);

  const handleSpeechEnd = useCallback(() => {
    if (isManuallyStopped.current) return;
    const textLength = lastSpeechTextRef.current.length;
    const minDurationMs = Math.max(1000, (textLength / 12.5) * 1000);
    const elapsedMs = Date.now() - speechStartTimeRef.current;
    if (elapsedMs < minDurationMs && speechStartTimeRef.current > 0) {
      setTimeout(() => {
        if (!isManuallyStopped.current) handleSpeechEndInternal();
      }, minDurationMs - elapsedMs);
      return;
    }
    handleSpeechEndInternal();
  }, [handleSpeechEndInternal]);

  const speakLessonContent = useCallback(
    (lesson: Lesson) => {
      const parts: string[] = [];
      parts.push(
        `Welcome! In this lesson, you will be learning about ${lesson.title}.`,
      );
      if (lesson.body) parts.push(lesson.body);
      if (lesson.avatar_script) parts.push(lesson.avatar_script);

      const hasQuestions = (lesson.questions?.length ?? 0) > 0;
      const hasNext = curriculum
        ? !!getNextLessonInOrder(lesson, curriculum)
        : !!lesson.next_lesson_id;
      const introText = parts.join(" ");

      if (lesson.formula_example) {
        setActiveFormulaExample(lesson.formula_example);
        setDisplayedFormula("");
        setIsFormulaTyping(false);
        setIntroReady(false);
        speak(introText, { type: "start_lesson_formula_demo", lesson });
        return;
      }

      setActiveFormulaExample(null);
      setDisplayedFormula("");

      if (introText) {
        const action: PendingAction = hasQuestions
          ? { type: "enable_start_questions" }
          : hasNext
            ? { type: "enable_next_lesson" }
            : { type: "show_completion" };

        let finalText = introText;
        if (hasQuestions) {
          finalText +=
            " Great! Now let's test your understanding with some questions. Click 'Start Questions' when you're ready.";
        } else if (hasNext) {
          finalText += " You've completed this lesson! Click 'Next Lesson' to continue.";
        } else {
          finalText +=
            " Congratulations! You've completed all lessons in this module.";
        }

        scheduleIntroUnlockFallback(lesson, finalText.length);
        speak(finalText, action);
      } else {
        markIntroReady(lesson);
      }
    },
    [curriculum, markIntroReady, scheduleIntroUnlockFallback, speak],
  );

  const handleStartLesson = useCallback(() => {
    if (!curriculum) return;

    const pending = pendingResumeRef.current;
    if (pending) {
      pendingResumeRef.current = null;
      setCanResume(false);
      const { lesson, questionIndex, canStartQuestions, lessonComplete } =
        pending;

      void (avatarRef.current as { resumeAudioContext?: () => Promise<void> } | null)
        ?.resumeAudioContext?.()
        .catch(() => {
          /* expected until speakText on some WebKit builds */
        });

      setLessonStarted(true);

      if (lesson.formula_example) {
        setActiveFormulaExample(lesson.formula_example);
        setDisplayedFormula(lesson.formula_example.formula);
      } else {
        setActiveFormulaExample(null);
        setDisplayedFormula("");
      }

      if (lessonComplete) {
        setCurrentLesson(lesson);
        setCurrentQuestion(null);
        setCurrentQuestionIndex(lesson.questions?.length ?? 0);
        setLessonPhase("complete");
        setIntroReady(true);
        setCompletedLessonIds((prev) =>
          withLessonMarkedComplete(
            prev,
            lesson.id,
            getLessonIndexInCurriculum(
              lesson,
              curriculum,
              lessonFlatIndexRef.current,
            ),
          ),
        );
        persistCoursePosition({
          lessonId: lesson.id,
          lessonIndex: getLessonIndexInCurriculum(lesson, curriculum),
          questionIndex: lesson.questions?.length ?? 0,
          lessonStarted: true,
          canStartQuestions: true,
        });
        return;
      }

      if (!canStartQuestions) {
        enterLessonIntro(lesson);
        persistCoursePosition({
          lessonId: lesson.id,
          lessonIndex: getLessonIndexInCurriculum(lesson, curriculum),
          questionIndex: 0,
          lessonStarted: true,
          canStartQuestions: false,
        });
        speakLessonContent(lesson);
        return;
      }

      const question = lesson.questions?.[questionIndex];
      if (question) {
        setCurrentLesson(lesson);
        setCurrentQuestion(question);
        setCurrentQuestionIndex(questionIndex);
        setLessonPhase("questions");
        setIntroReady(true);
        persistCoursePosition({
          lessonId: lesson.id,
          lessonIndex: getLessonIndexInCurriculum(lesson, curriculum),
          questionIndex,
          lessonStarted: true,
          canStartQuestions: true,
        });
        speak(question.question);
        return;
      }

      enterLessonIntro(lesson);
      persistCoursePosition({
        lessonId: lesson.id,
        lessonIndex: getLessonIndexInCurriculum(lesson, curriculum),
        questionIndex: 0,
        lessonStarted: true,
        canStartQuestions: false,
      });
      speakLessonContent(lesson);
      return;
    }

    const firstLesson = getFirstLesson(curriculum);
    if (!firstLesson) return;

    enterLessonIntro(firstLesson);
    setLessonStarted(true);
    setCorrectAnswersCount(0);
    setTotalQuestionsAnswered(0);
    setModuleCorrectCount(0);
    setModuleTotalAnswered(0);

    persistCoursePosition({
      lessonId: firstLesson.id,
      lessonIndex: getLessonIndexInCurriculum(firstLesson, curriculum),
      questionIndex: 0,
      lessonStarted: true,
      canStartQuestions: false,
    });

    speakLessonContent(firstLesson);
  }, [
    curriculum,
    enterLessonIntro,
    persistCoursePosition,
    speak,
    speakLessonContent,
  ]);

  const handleRestartCourse = useCallback(() => {
    if (!exercise || !curriculum) return;
    stopSpeaking();
    clearIntroUnlockTimeout();
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
    setCurrentLesson(null);
    setCurrentQuestion(null);
    setCurrentQuestionIndex(0);
    setLessonStarted(false);
    setCanResume(false);
    pendingResumeRef.current = null;
    setLessonPhase("intro");
    setIntroReady(false);
    setStudentAnswer("");
    setDisplayedFormula("");
    setActiveFormulaExample(null);
    setCompletedLessonIds(new Set());
    setCorrectAnswersCount(0);
    setTotalQuestionsAnswered(0);
    setModuleCorrectCount(0);
    setModuleTotalAnswered(0);
    courseCompletionSpeechRef.current = false;
  }, [clearIntroUnlockTimeout, curriculum, exercise, stopSpeaking, updateCourseProgress]);

  const handlePreviousLesson = useCallback(() => {
    if (!currentLesson || !curriculum) return;
    stopSpeaking();
    clearIntroUnlockTimeout();

    const prevLesson = getPreviousLessonInOrder(
      currentLesson,
      curriculum,
      lessonFlatIndexRef.current,
    );
    if (!prevLesson) return;

    const flatHint = lessonFlatIndexRef.current;
    const prevFlatHint =
      typeof flatHint === "number" && flatHint > 0 ? flatHint - 1 : undefined;
    const currentModIndex = getModuleIndexForLesson(
      currentLesson,
      curriculum,
      flatHint,
    );
    const prevModIndex = getModuleIndexForLesson(
      prevLesson,
      curriculum,
      prevFlatHint,
    );
    const movingToNewModule =
      currentModIndex !== -1 &&
      prevModIndex !== -1 &&
      currentModIndex !== prevModIndex;

    setCorrectAnswersCount(0);
    setTotalQuestionsAnswered(0);
    if (movingToNewModule) {
      setModuleCorrectCount(0);
      setModuleTotalAnswered(0);
    }

    // Re-teach with normal intro → Start questions controls, even if already completed.
    enterLessonIntro(prevLesson);
    persistCoursePosition({
      lessonId: prevLesson.id,
      lessonIndex: getLessonIndexInCurriculum(
        prevLesson,
        curriculum,
        prevFlatHint,
      ),
      questionIndex: 0,
      lessonStarted: true,
      canStartQuestions: false,
    });
    speakLessonContent(prevLesson);
  }, [
    clearIntroUnlockTimeout,
    currentLesson,
    curriculum,
    enterLessonIntro,
    persistCoursePosition,
    speakLessonContent,
    stopSpeaking,
  ]);

  const handlePreviousQuestion = useCallback(() => {
    if (!currentLesson?.questions || currentQuestionIndex <= 0) return;
    stopSpeaking();
    stopFormulaTyping();
    const prevIndex = currentQuestionIndex - 1;
    const prevQuestion = currentLesson.questions[prevIndex];
    setCurrentQuestion(prevQuestion);
    setCurrentQuestionIndex(prevIndex);
    setLessonPhase("questions");
    persistCoursePosition({
      lessonId: currentLesson.id,
      lessonIndex: curriculum
        ? getLessonIndexInCurriculum(currentLesson, curriculum)
        : undefined,
      questionIndex: prevIndex,
      lessonStarted: true,
      canStartQuestions: true,
    });
    beginQuestion(prevQuestion);
  }, [
    beginQuestion,
    currentLesson,
    currentQuestionIndex,
    curriculum,
    persistCoursePosition,
    stopFormulaTyping,
    stopSpeaking,
  ]);

  const handleBackToLessonIntro = useCallback(() => {
    if (!currentLesson) return;
    stopSpeaking();
    stopFormulaTyping();
    clearIntroUnlockTimeout();
    enterLessonIntro(currentLesson);
    persistCoursePosition({
      lessonId: currentLesson.id,
      lessonIndex: curriculum
        ? getLessonIndexInCurriculum(currentLesson, curriculum)
        : undefined,
      questionIndex: 0,
      lessonStarted: true,
      canStartQuestions: false,
    });
    // Replay avatar teaching the same way as the first pass.
    speakLessonContent(currentLesson);
  }, [
    clearIntroUnlockTimeout,
    currentLesson,
    curriculum,
    enterLessonIntro,
    persistCoursePosition,
    speakLessonContent,
    stopFormulaTyping,
    stopSpeaking,
  ]);

  const handleReviewLastQuestion = useCallback(() => {
    if (!currentLesson?.questions?.length) return;
    stopSpeaking();
    stopFormulaTyping();
    const lastIndex = currentLesson.questions.length - 1;
    const question = currentLesson.questions[lastIndex];
    setCurrentQuestion(question);
    setCurrentQuestionIndex(lastIndex);
    setLessonPhase("questions");
    persistCoursePosition({
      lessonId: currentLesson.id,
      lessonIndex: curriculum
        ? getLessonIndexInCurriculum(currentLesson, curriculum)
        : undefined,
      questionIndex: lastIndex,
      lessonStarted: true,
      canStartQuestions: true,
    });
    beginQuestion(question);
  }, [
    beginQuestion,
    currentLesson,
    curriculum,
    persistCoursePosition,
    stopFormulaTyping,
    stopSpeaking,
  ]);

  const handlePrevious = useCallback(() => {
    if (isSpeaking || !currentLesson) return;

    if (lessonPhase === "questions" && currentQuestionIndex > 0) {
      handlePreviousQuestion();
      return;
    }
    if (lessonPhase === "questions" && currentQuestionIndex === 0) {
      handleBackToLessonIntro();
      return;
    }
    if (lessonPhase === "complete" && (currentLesson.questions?.length ?? 0) > 0) {
      handleReviewLastQuestion();
      return;
    }
    handlePreviousLesson();
  }, [
    currentLesson,
    currentQuestionIndex,
    handleBackToLessonIntro,
    handlePreviousLesson,
    handlePreviousQuestion,
    handleReviewLastQuestion,
    isSpeaking,
    lessonPhase,
  ]);

  const handleStartQuestions = useCallback(() => {
    if (!introReady || lessonPhase !== "intro" || !currentLesson?.questions?.length)
      return;

    stopSpeaking();
    stopFormulaTyping();
    clearIntroUnlockTimeout();
    setIntroReady(false);

    const question = currentLesson.questions[0];
    setCurrentQuestion(question);
    setCurrentQuestionIndex(0);
    setLessonPhase("questions");
    setCorrectAnswersCount(0);
    setTotalQuestionsAnswered(0);

    persistCoursePosition({
      lessonId: currentLesson.id,
      lessonIndex: curriculum
        ? getLessonIndexInCurriculum(currentLesson, curriculum)
        : undefined,
      questionIndex: 0,
      lessonStarted: true,
      canStartQuestions: true,
    });

    beginQuestion(question);
  }, [
    beginQuestion,
    clearIntroUnlockTimeout,
    currentLesson,
    curriculum,
    introReady,
    lessonPhase,
    persistCoursePosition,
    stopFormulaTyping,
    stopSpeaking,
  ]);

  const handleNextLesson = useCallback(() => {
    if (!currentLesson || !curriculum) return;
    const questionCount = currentLesson.questions?.length ?? 0;
    const lessonComplete =
      lessonPhase === "complete" ||
      (questionCount > 0 && currentQuestionIndex >= questionCount) ||
      (questionCount === 0 && introReady);
    if (!lessonComplete) return;

    const nextLesson = getNextLessonInOrder(
      currentLesson,
      curriculum,
      lessonFlatIndexRef.current,
    );
    if (!nextLesson) return;

    stopSpeaking();
    clearIntroUnlockTimeout();

    const flatHint = lessonFlatIndexRef.current;
    const nextFlatHint =
      typeof flatHint === "number" ? flatHint + 1 : undefined;
    const currentModIndex = getModuleIndexForLesson(
      currentLesson,
      curriculum,
      flatHint,
    );
    const nextModIndex = getModuleIndexForLesson(
      nextLesson,
      curriculum,
      nextFlatHint,
    );
    const movingToNewModule =
      currentModIndex !== -1 &&
      nextModIndex !== -1 &&
      currentModIndex !== nextModIndex;

    enterLessonIntro(nextLesson);

    setCorrectAnswersCount(0);
    setTotalQuestionsAnswered(0);
    if (movingToNewModule) {
      setModuleCorrectCount(0);
      setModuleTotalAnswered(0);
    }

    persistCoursePosition({
      lessonId: nextLesson.id,
      lessonIndex: getLessonIndexInCurriculum(
        nextLesson,
        curriculum,
        nextFlatHint,
      ),
      questionIndex: 0,
      lessonStarted: true,
      canStartQuestions: false,
    });

    speakLessonContent(nextLesson);
  }, [
    clearIntroUnlockTimeout,
    currentLesson,
    currentQuestionIndex,
    curriculum,
    enterLessonIntro,
    introReady,
    lessonPhase,
    persistCoursePosition,
    speakLessonContent,
    stopSpeaking,
  ]);

  const handlePrimaryNav = useCallback(
    (kind: PrimaryNavKind) => {
      if (kind === "start_questions") {
        handleStartQuestions();
        return;
      }
      if (kind === "next_lesson" || kind === "next_module") {
        handleNextLesson();
      }
    },
    [handleStartQuestions, handleNextLesson],
  );

  const handleSubmitMcTf = useCallback(() => {
    if (
      isAnswerSubmitted ||
      answerSubmissionInFlightRef.current ||
      selectedAnswer === null ||
      !currentQuestion
    )
      return;
    answerSubmissionInFlightRef.current = true;
    setIsAnswerSubmitted(true);
    let isCorrect = false;
    let feedbackText = "";
    if (currentQuestion.type === "multiple_choice") {
      isCorrect = currentQuestion.answer === selectedAnswer;
      feedbackText = isCorrect
        ? `Correct! Well done. ${currentQuestion.explanation ?? ""}`
        : `Incorrect. The correct answer is ${currentQuestion.answer}. ${currentQuestion.explanation ?? ""}`;
    } else if (currentQuestion.type === "true_false") {
      isCorrect = currentQuestion.answer === selectedAnswer;
      feedbackText = isCorrect
        ? `Correct! Well done. ${currentQuestion.explanation ?? ""}`
        : `Incorrect. The correct answer is ${currentQuestion.answer ? "True" : "False"}. ${currentQuestion.explanation ?? ""}`;
    }
    setLastAnswerCorrect(isCorrect);
    recordAnswerResult(isCorrect);
    speak(feedbackText, { type: "next_question" });
  }, [
    currentQuestion,
    isAnswerSubmitted,
    recordAnswerResult,
    selectedAnswer,
    speak,
  ]);

  const handleSubmitFormula = useCallback(() => {
    if (!currentQuestion || currentQuestion.type !== "formula_test") return;
    if (isAnswerSubmitted || answerSubmissionInFlightRef.current) return;
    answerSubmissionInFlightRef.current = true;
    setIsAnswerSubmitted(true);
    const expected = currentQuestion.testCriteria?.expectedFormula?.trim() ?? "";
    const isCorrect = expected
      ? compareFormulaAnswer(studentAnswer, expected)
      : false;
    setLastAnswerCorrect(isCorrect);
    recordAnswerResult(isCorrect);

    const feedbackText = isCorrect
      ? `Correct! Well done. ${currentQuestion.explanation ?? ""}`
      : `Not quite. The expected answer is ${expected}. ${currentQuestion.explanation ?? ""}`;
    speak(feedbackText, { type: "next_question" });
  }, [
    currentQuestion,
    isAnswerSubmitted,
    recordAnswerResult,
    speak,
    studentAnswer,
  ]);

  // Load saved progress from API when opening or switching courses (deep links included).
  useEffect(() => {
    if (!curriculum || !exercise) return;
    const slug = exercise;
    let cancelled = false;

    void (async () => {
      await useCoursesStore.getState().hydrateCourseProgressFromApi(slug);
      if (cancelled) return;

      const stored = useCoursesStore.getState().getCourseProgress(slug);
      if (!stored) return;

      const completed = new Set(stored.completedLessons ?? []);
      if (completed.size) {
        setCompletedLessonIds(completed);
      }

      const saved: CourseProgress = {
        lessonId: stored.currentLessonId ?? null,
        lessonIndex:
          typeof stored.lessonIndex === "number" ? stored.lessonIndex : undefined,
        questionIndex:
          typeof stored.questionIndex === "number" ? stored.questionIndex : 0,
        lessonStarted: stored.lessonStarted ?? false,
        canStartQuestions: stored.canStartQuestions ?? false,
        lastUpdated:
          typeof stored.lastUpdated === "number" ? stored.lastUpdated : 0,
      };

      const lesson =
        typeof saved.lessonIndex === "number"
          ? getLessonByIndex(saved.lessonIndex, curriculum)
          : saved.lessonId
            ? findLessonById(saved.lessonId, curriculum)
            : null;
      if (!lesson || !saved.lessonStarted) return;

      const questionCount = lesson.questions?.length ?? 0;
      const questionIndex = saved.questionIndex ?? 0;
      const allQuestionsDone = questionCount > 0 && questionIndex >= questionCount;
      const lessonComplete =
        isLessonIdMarkedComplete(
          completed,
          lesson.id,
          typeof saved.lessonIndex === "number" ? saved.lessonIndex : undefined,
          curriculum,
        ) || allQuestionsDone;

      // Park for Continue tap — async hydrate is outside a user gesture for TTS.
      if (typeof saved.lessonIndex === "number") {
        lessonFlatIndexRef.current = saved.lessonIndex;
      }
      setCurrentLesson(lesson);
      setLessonStarted(false);
      setCanResume(true);
      pendingResumeRef.current = {
        lesson,
        questionIndex,
        canStartQuestions: saved.canStartQuestions,
        lessonComplete,
      };
    })();

    return () => {
      cancelled = true;
    };
    // Restore once when curriculum is available; helpers are read from the latest render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [curriculum, exercise]);

  // Keep phase aligned with question/completion state.
  useEffect(() => {
    if (!currentLesson || !lessonStarted) return;
    const nextPhase = resolveLessonPhase({
      lesson: currentLesson,
      questionIndex: currentQuestionIndex,
      hasCurrentQuestion: !!currentQuestion,
      introReady,
      completedLessonIds,
      preferredFlatIndex: lessonFlatIndexRef.current,
      curriculum: curriculum ?? undefined,
    });
    setLessonPhase((prev) => (prev === nextPhase ? prev : nextPhase));
  }, [
    completedLessonIds,
    currentLesson,
    currentQuestion,
    currentQuestionIndex,
    introReady,
    lessonStarted,
    curriculum,
  ]);

  const lessonNav = useMemo(() => {
    if (!currentLesson || !curriculum || !lessonStarted) return null;
    return buildLessonNavSnapshot({
      lesson: currentLesson,
      curriculum,
      phase: lessonPhase,
      introReady,
      questionIndex: currentQuestionIndex,
      isSpeaking,
      completedLessonIds,
      preferredFlatIndex: lessonFlatIndexRef.current,
    });
  }, [
    completedLessonIds,
    currentLesson,
    currentQuestionIndex,
    curriculum,
    introReady,
    isSpeaking,
    lessonPhase,
    lessonStarted,
  ]);

  // Sync progress to store when lesson/question changes
  useEffect(() => {
    if (!currentLesson || !exercise || !curriculum) return;
    const allLessons = curriculum.modules.flatMap((m) => m.lessons);
    const currentIndex = getLessonIndexInCurriculum(
      currentLesson,
      curriculum,
      lessonFlatIndexRef.current,
    );
    if (currentIndex < 0) return;
    const totalQuestions = currentLesson.questions?.length ?? 0;
    const isCurrentLessonComplete = isLessonProgressComplete(
      currentLesson,
      completedLessonIds,
      currentQuestionIndex,
      currentIndex,
      curriculum,
    );
    const progress = calculateProgress(
      currentIndex,
      allLessons.length,
      currentQuestionIndex,
      totalQuestions,
      lessonStarted,
      isCurrentLessonComplete,
    );
    const isCourseFinished = isV1CourseFinished({
      lesson: currentLesson,
      curriculum,
      completedLessonIds,
      questionIndex: currentQuestionIndex,
      preferredFlatIndex: currentIndex,
    });
    const finalProgress = isCourseFinished ? 100 : progress;
    setProgressPct(finalProgress);
    updateCourseProgress(
      exercise,
      {
        progress: finalProgress,
        status: isCourseFinished ? "completed" : finalProgress >= 100 ? "completed" : "ongoing",
        currentLessonId: currentLesson.id,
        lessonIndex: currentIndex,
        questionIndex: currentQuestionIndex,
        lessonStarted,
        canStartQuestions: introReady,
        completedLessons: Array.from(completedLessonIds),
      },
      isCourseFinished ? { immediate: true } : undefined,
    );
  }, [
    calculateProgress,
    completedLessonIds,
    currentLesson,
    currentQuestionIndex,
    curriculum,
    exercise,
    introReady,
    lessonStarted,
    updateCourseProgress,
  ]);

  useEffect(() => {
    if (!isCourseCompleted || !lessonStarted || !curriculum) return;
    if (courseCompletionSpeechRef.current) return;
    courseCompletionSpeechRef.current = true;
    speak(buildCourseCompletionSpeech(curriculum.title));
  }, [curriculum, isCourseCompleted, lessonStarted, speak]);

  // Stop speech when navigating away from this course (before avatar ref is cleared).
  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, [location.pathname, exercise, stopSpeaking]);

  // Cleanup on unmount - stop any ongoing speech and formula typing
  useEffect(() => {
    return () => {
      stopFormulaTyping();
      clearIntroUnlockTimeout();
      pendingSpeechQueueRef.current = [];
      pendingActionRef.current = { type: "none" };
      stopAvatarSpeech(avatarRef.current);
    };
  }, [clearIntroUnlockTimeout, stopFormulaTyping]);

  useEffect(() => {
    avatarReadyRef.current = false;
    setIsAvatarReady(false);
    setShowMobileAudioUnlock(false);
  }, [exercise, isLgUp, selectedInstructor]);

  const isInstructorWaiting = isInstructorWaitActive({
    isPaused,
    isAvatarReady,
    hasPendingSpeech,
    awaitingSpeech,
  });

  const avatarConfig = {
    cameraView: "mid" as const,
    avatarUrl: instructorConfig.avatarUrl,
    avatarBody: instructorConfig.avatarBody,
    ttsService: "deepgram" as const,
    ttsVoice: instructorConfig.ttsVoice,
    ttsApiKey: import.meta.env?.VITE_DEEPGRAM_API_KEY,
    lipsyncModules: ["en"] as const,
    lipsyncLang: "en",
    speechRate: 0.9,
    accurateLipSync: true,
  };

  const renderQuestionResult = (submitted: boolean, explanation?: string) => {
    if (!submitted) return null;
    const correct = lastAnswerCorrect === true;
    const wrong = lastAnswerCorrect === false;
    return (
      <div
        role="status"
        aria-live="polite"
        className={cn(
          "mt-6 min-w-0 max-w-full overflow-hidden rounded-r-lg border-l-4 p-3 shadow-sm backdrop-blur-sm sm:mt-8 sm:p-4",
          correct
            ? "border-green-500 bg-linear-to-br from-green-50 via-green-50/60 to-transparent"
            : wrong
              ? "border-red-500 bg-linear-to-br from-red-50 via-red-50/60 to-transparent"
              : "border-primary bg-linear-to-br from-primary/10 via-primary/5 to-transparent",
        )}
      >
        <p
          className={cn(
            "mb-1 flex items-center gap-1.5 text-sm font-semibold",
            correct ? "text-green-800" : wrong ? "text-red-800" : "text-primary",
          )}
        >
          {correct ? (
            <CheckCircle2 className="size-4 shrink-0" />
          ) : wrong ? (
            <XCircle className="size-4 shrink-0" />
          ) : null}
          {correct ? "Correct!" : wrong ? "Not quite" : "Hint"}
        </p>
        {explanation && (
          <div className="min-w-0 max-w-full text-xs leading-relaxed text-gray-700 wrap-anywhere sm:text-sm">
            <MathText>{explanation}</MathText>
          </div>
        )}
      </div>
    );
  };

  const renderQuestion = () => {
    if (!currentQuestion) return null;
    if (currentQuestion.type === "multiple_choice") {
      return (
        <>
          <h3 className="mb-3 text-lg font-bold leading-snug text-gray-900 sm:mb-4 sm:text-xl lg:text-2xl">
            <MathText>{currentQuestion.question}</MathText>
          </h3>
          <div className="h-1 w-16 rounded-full bg-linear-to-r from-primary via-primary/80 to-primary/60 sm:w-20" />
          <MultipleChoiceQuestion
            question={currentQuestion}
            selectedAnswer={selectedAnswer as string | null}
            onSelect={(v) => !isAnswerSubmitted && setSelectedAnswer(v)}
            disabled={isAnswerSubmitted}
            isSubmitted={isAnswerSubmitted}
          />
          <button
            type="button"
            onClick={handleSubmitMcTf}
            disabled={
              selectedAnswer === null || isAnswerSubmitted || isSpeaking
            }
            className={cn(
              "mt-5 w-full rounded-xl px-4 py-3 text-base font-semibold transition-all sm:mt-6 sm:py-3.5 sm:text-lg",
              selectedAnswer !== null && !isAnswerSubmitted && !isSpeaking
                ? "bg-primary text-white shadow-lg shadow-primary/30 hover:bg-primary/90"
                : "cursor-not-allowed bg-gray-200 text-gray-500",
            )}
          >
            {isAnswerSubmitted ? "Answer submitted" : "Submit answer"}
          </button>
          {renderQuestionResult(isAnswerSubmitted, currentQuestion.explanation)}
        </>
      );
    }
    if (currentQuestion.type === "true_false") {
      return (
        <>
          <h3 className="mb-3 text-lg font-bold leading-snug text-gray-900 sm:mb-4 sm:text-xl lg:text-2xl">
            <MathText>{currentQuestion.question}</MathText>
          </h3>
          <div className="h-1 w-16 rounded-full bg-linear-to-r from-primary via-primary/80 to-primary/60 sm:w-20" />
          <TrueFalseQuestion
            selectedAnswer={selectedAnswer as boolean | null}
            onSelect={(v) => !isAnswerSubmitted && setSelectedAnswer(v)}
            disabled={isAnswerSubmitted}
            isSubmitted={isAnswerSubmitted}
            correctAnswer={
              typeof currentQuestion.answer === "boolean"
                ? currentQuestion.answer
                : undefined
            }
          />
          <button
            type="button"
            onClick={handleSubmitMcTf}
            disabled={
              selectedAnswer === null || isAnswerSubmitted || isSpeaking
            }
            className={cn(
              "mt-5 w-full rounded-xl px-4 py-3 text-base font-semibold transition-all sm:mt-6 sm:py-3.5 sm:text-lg",
              selectedAnswer !== null && !isAnswerSubmitted && !isSpeaking
                ? "bg-primary text-white shadow-lg shadow-primary/30 hover:bg-primary/90"
                : "cursor-not-allowed bg-gray-200 text-gray-500",
            )}
          >
            {isAnswerSubmitted ? "Answer submitted" : "Submit answer"}
          </button>
          {renderQuestionResult(isAnswerSubmitted, currentQuestion.explanation)}
        </>
      );
    }
    if (currentQuestion.type === "formula_test") {
      return (
        <MathAnswerWorkspace
          question={currentQuestion.question}
          value={studentAnswer}
          onChange={setStudentAnswer}
          onSubmit={handleSubmitFormula}
          canSubmit={
            !!studentAnswer.trim() && !isSpeaking && !isAnswerSubmitted
          }
          disabled={isSpeaking}
          isSubmitted={isAnswerSubmitted}
          isCorrect={lastAnswerCorrect}
          expectedAnswer={currentQuestion.testCriteria?.expectedFormula}
        />
      );
    }
    return null;
  };

  return (
    <div className="relative h-full overflow-hidden">
      <Split
        className="flex h-full"
        sizes={isLgUp ? [35, 65] : [0, 100]}
        minSize={isLgUp ? 200 : 0}
        gutterSize={isLgUp ? 8 : 0}
        gutterStyle={(dimension, gutterSize) =>
          dimension === "width" && gutterSize > 0
            ? {
              width: `${gutterSize}px`,
              cursor: "col-resize",
              pointerEvents: "auto",
            }
            : { width: "0px", pointerEvents: "none" }
        }
      >
        <div
          className={cn(
            "relative flex min-h-0 min-w-0 flex-col overflow-hidden",
            isLgUp ? "pr-4" : "",
          )}
        >
          {isLgUp && (
            <>
              <div className="mb-3 flex shrink-0 items-center gap-2 text-primary">
                <Calculator className="size-5 shrink-0" aria-hidden />
                <span className="text-xs font-bold uppercase tracking-wide sm:text-sm">
                  Math classroom
                </span>
              </div>
              {lessonStarted && lessonNav && (
                <>
                  <div className="mb-3 flex items-center gap-3">
                    <LessonProgressBar
                      value={progressPct}
                      label={lessonNav.positionLabel}
                      className="flex-1"
                    />
                    {(isSpeaking || isPaused) && (
                      <>
                        <button
                          type="button"
                          onClick={handleRewindSpeech}
                          title="Rewind 10 seconds"
                          aria-label="Rewind 10 seconds"
                          className="mt-4 flex shrink-0 items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                        >
                          <RotateCcw className="size-3.5" aria-hidden />
                          <span className="hidden min-[420px]:inline">-10s</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleTogglePause}
                          title={isPaused ? "Resume the lesson" : "Pause the lesson"}
                          aria-label={
                            isPaused ? "Resume the lesson" : "Pause the lesson"
                          }
                          aria-pressed={isPaused}
                          className="mt-4 flex shrink-0 items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                        >
                          {isPaused ? (
                            <Play className="size-3.5" aria-hidden />
                          ) : (
                            <Pause className="size-3.5" aria-hidden />
                          )}
                          {isPaused ? "Resume" : "Pause"}
                        </button>
                      </>
                    )}
                  </div>
                  <LessonNavControls
                    nav={lessonNav}
                    onPrevious={handlePrevious}
                    onPrimary={handlePrimaryNav}
                    showRestart={false}
                    onRestart={handleRestartCourse}
                  />
                </>
              )}
              <div className="mt-4 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                <NarratorAvatar
                  key={selectedInstructor}
                  ref={avatarRef}
                  {...avatarConfig}
                  onReady={handleAvatarReady}
                  onError={(error: unknown) =>
                    console.error("Avatar error:", error)
                  }
                  onSpeechStart={handleSpeechStart}
                  onSpeechEnd={handleSpeechEnd}
                  onSubtitle={handleSubtitle}
                  className="h-full min-h-0 w-full min-w-0 max-h-full max-w-full"
                />
              </div>
            </>
          )}
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-l-0 border-primary/20 lg:border-l-2">
          {!isLgUp && (
            <div className="shrink-0 border-b border-primary/10 bg-white/95 shadow-sm backdrop-blur-md supports-backdrop-filter:bg-white/80">
              <PageLoadWaitBanner isLoading={isInstructorWaiting} />
              <div className="flex items-center gap-3 px-3 py-2">
                <InstructorSpeakingIndicator isSpeaking={isSpeaking} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <Calculator className="size-3.5 shrink-0 text-primary sm:size-4" aria-hidden />
                    <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-primary/80">
                      Math instructor
                    </p>
                  </div>
                  <p
                    className="truncate text-xs text-gray-600 sm:text-sm"
                    title={
                      isPaused
                        ? currentSubtitle || "Paused"
                        : isSpeaking
                          ? currentSubtitle || "Speaking…"
                          : "Ready when you are"
                    }
                  >
                    {isPaused
                      ? currentSubtitle || "Paused"
                      : isSpeaking
                        ? currentSubtitle || "Speaking…"
                        : "Ready when you are"}
                  </p>
                </div>
                {lessonStarted && (isSpeaking || isPaused) && (
                  <>
                    <button
                      type="button"
                      onClick={handleRewindSpeech}
                      title="Rewind 10 seconds"
                      aria-label="Rewind 10 seconds"
                      className="flex shrink-0 items-center gap-1 rounded-lg border border-primary/30 bg-primary/10 px-2 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                    >
                      <RotateCcw className="size-3.5" aria-hidden />
                      <span className="hidden min-[360px]:inline">-10s</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleTogglePause}
                      title={isPaused ? "Resume the lesson" : "Pause the lesson"}
                      aria-label={isPaused ? "Resume the lesson" : "Pause the lesson"}
                      aria-pressed={isPaused}
                      className="flex shrink-0 items-center gap-1 rounded-lg border border-primary/30 bg-primary/10 px-2 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                    >
                      {isPaused ? (
                        <Play className="size-3.5" aria-hidden />
                      ) : (
                        <Pause className="size-3.5" aria-hidden />
                      )}
                      <span className="hidden min-[360px]:inline">
                        {isPaused ? "Resume" : "Pause"}
                      </span>
                    </button>
                  </>
                )}
              </div>
              {showMobileAudioUnlock && (
                <div className="border-t border-primary/15 bg-linear-to-b from-primary/10 to-primary/5 px-3 py-3">
                  <p className="mb-2.5 text-center text-[0.7rem] leading-snug text-gray-600 sm:text-xs">
                    {MOBILE_INSTRUCTOR_AUDIO_HINT}
                  </p>
                  <button
                    type="button"
                    onClick={handleMobileAudioUnlock}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-md transition-colors hover:bg-primary/90 active:scale-[0.99]"
                  >
                    <Volume2 className="size-5 shrink-0" aria-hidden />
                    <span className="whitespace-nowrap">
                      {MOBILE_INSTRUCTOR_AUDIO_BUTTON}
                    </span>
                  </button>
                </div>
              )}
              {lessonStarted && lessonNav && (
                <>
                  <div className="px-3 pb-2">
                    <LessonProgressBar
                      value={progressPct}
                      label={lessonNav.positionLabel}
                    />
                  </div>
                  <div className="px-3 pb-3">
                    <LessonNavControls
                      nav={lessonNav}
                      onPrevious={handlePrevious}
                      onPrimary={handlePrimaryNav}
                      showRestart={false}
                      onRestart={handleRestartCourse}
                    />
                  </div>
                </>
              )}
            </div>
          )}

          <div className="scrollbar-hide flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden bg-linear-to-br from-[#F3ECFE] via-[#F8F4FF] to-white p-4 sm:p-5 lg:p-6">
            {currentQuestion ? (
              <div className="mx-auto w-full min-w-0 max-w-3xl">
                <div className="min-w-0 overflow-hidden rounded-2xl border border-primary/15 bg-white/90 p-4 shadow-sm sm:p-5 lg:p-6">
                  {currentQuestion.type === "formula_test" &&
                    activeFormulaExample && (
                      <MathFormulaBoard
                        example={activeFormulaExample}
                        liveFormula={
                          isFormulaTyping ? displayedFormula : undefined
                        }
                        compact
                        className="mb-4 sm:mb-6"
                      />
                    )}
                  {renderQuestion()}
                </div>
              </div>
            ) : isCourseCompleted && currentLesson && lessonStarted ? (
              <CourseCompletionCelebration
                courseTitle={curriculum?.title ?? currentLesson.title}
                instructorMessage={buildCourseCompletionSpeech(
                  curriculum?.title ?? currentLesson.title,
                )}
                currentSubtitle={currentSubtitle}
                isSpeaking={isSpeaking}
                onRestart={handleRestartCourse}
              />
            ) : currentLesson && lessonStarted ? (
              <div className="mx-auto w-full min-w-0 max-w-3xl space-y-4 sm:space-y-5">
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <div className="size-2 animate-pulse rounded-full bg-primary" />
                    <p className="text-xs font-medium uppercase tracking-wide text-primary/70 sm:text-sm">
                      {lessonStarted ? "Lesson in progress" : "Ready"}
                    </p>
                  </div>
                  <h2 className="text-xl font-bold leading-tight text-gray-900 sm:text-2xl lg:text-3xl">
                    {currentLesson.title}
                  </h2>
                  <div className="mt-3 h-1 w-16 rounded-full bg-linear-to-r from-primary via-primary/80 to-primary/60 sm:w-20" />
                </div>

                {isShowingSubtitles ? (
                  <div className="flex min-h-[180px] items-center justify-center sm:min-h-[220px]">
                    <div className="w-full max-w-2xl px-2 sm:px-4">
                      <div className="mb-4 flex items-center justify-center gap-2">
                        <div className="flex items-center gap-1">
                          <div className="size-2 animate-bounce rounded-full bg-primary" style={{ animationDelay: "0ms" }} />
                          <div className="size-2 animate-bounce rounded-full bg-primary" style={{ animationDelay: "150ms" }} />
                          <div className="size-2 animate-bounce rounded-full bg-primary" style={{ animationDelay: "300ms" }} />
                        </div>
                        <span className="text-xs font-medium text-primary/70 sm:text-sm">
                          Your instructor is speaking…
                        </span>
                      </div>
                      <div className="rounded-2xl border-2 border-primary/20 bg-white/90 p-5 text-center shadow-lg sm:p-8">
                        <p className="text-base font-medium leading-relaxed break-words text-gray-800 sm:text-lg lg:text-xl">
                          {currentSubtitle || "…"}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="rounded-2xl border border-primary/10 bg-white/90 p-4 shadow-sm sm:p-5">
                      <p className="text-sm leading-relaxed text-gray-700 sm:text-base">
                        {currentLesson.body}
                      </p>
                    </div>
                    {activeFormulaExample && (
                      <MathFormulaBoard
                        example={activeFormulaExample}
                        liveFormula={
                          isFormulaTyping ? displayedFormula : undefined
                        }
                      />
                    )}
                    {currentLesson.avatar_script && (
                      <div className="rounded-2xl border-l-4 border-primary bg-linear-to-br from-primary/10 via-primary/5 to-transparent p-4 sm:p-5">
                        <p className="text-sm font-semibold text-primary sm:text-base">
                          What you&apos;ll learn
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-gray-700 sm:text-base">
                          {currentLesson.avatar_script}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center px-2 py-8 sm:py-12">
                <div className="w-full max-w-md text-center">
                  <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-primary text-white shadow-lg sm:mb-6 sm:size-16">
                    <Calculator className="size-7 sm:size-8" />
                  </div>
                  <h2 className="mb-2 text-xl font-bold text-gray-900 sm:text-2xl">
                    {canResume ? "Continue your lesson?" : "Ready for math?"}
                  </h2>
                  <p className="mb-6 text-sm leading-relaxed text-gray-600 sm:text-base">
                    {canResume && currentLesson
                      ? `Resume “${currentLesson.title}”. Tap below and your instructor will start speaking again.`
                      : "Your instructor will guide you through formulas, examples, and practice questions — built for learning mathematics."}
                  </p>
                  <button
                    type="button"
                    onClick={handleStartLesson}
                    className="mx-auto flex w-full max-w-xs items-center justify-center gap-3 rounded-full bg-primary px-8 py-3.5 text-base font-bold text-white shadow-lg shadow-primary/30 transition-all hover:bg-primary/90 active:scale-[0.98] sm:max-w-none sm:px-10 sm:py-4"
                  >
                    <Play className="size-5 shrink-0 fill-white" />
                    {canResume ? "Continue learning" : "Start learning"}
                  </button>
                  {canResume ? (
                    <CourseProgressResetLink onReset={handleRestartCourse} />
                  ) : null}
                </div>
              </div>
            )}
          </div>

          {!isLgUp && (
            <div
              className="pointer-events-none fixed bottom-0 right-0 z-0 h-[280px] w-[320px] translate-x-8 translate-y-12 opacity-0"
              aria-hidden
            >
              <NarratorAvatar
                key={selectedInstructor}
                ref={avatarRef}
                {...avatarConfig}
                onReady={handleAvatarReady}
                onError={(error: unknown) =>
                  console.error("Avatar error:", error)
                }
                onSpeechStart={handleSpeechStart}
                onSpeechEnd={handleSpeechEnd}
                onSubtitle={handleSubtitle}
                className="h-full w-full"
              />
            </div>
          )}
        </div>
      </Split>
    </div>
  );
}

export default function MathCourseDetails() {
  return <MathCourseDetailsInner />;
}
