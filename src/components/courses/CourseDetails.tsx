import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import { useParams, useLocation } from "react-router-dom";
import Split from "react-split";
import NarratorAvatar from "narrator-avatar";
import { Volume2, Mic, Play, Pause, CheckCircle2, XCircle } from "lucide-react";
import {
  type Question,
  type Lesson,
  type CodeExample,
  findLessonById,
  getFirstLesson,
  getCurriculumBySlug,
  getModuleInfoForLesson,
  getNextLessonInOrder,
  getPreviousLessonInOrder,
  getModuleIndexForLesson,
  getLessonIndexInCurriculum,
  getLessonByIndex,
} from "../../data/curriculumData";
import { applySubtitleShow } from "@/features/curriculum-preview/v2/subtitleShow";
import {
  QuestionInfo,
  CodeEditor,
  WebCodeWorkspace,
  TestResults,
  MultipleChoiceQuestion,
  TrueFalseQuestion,
  FullscreenModal,
  LessonNavControls,
  MobileCollapsible,
  LessonProgressBar,
  PageLoadWaitBanner,
} from "./exercise";
import MathAnswerWorkspace from "./math/MathAnswerWorkspace";
import MathText from "./math/MathText";
import { isCodeTestQuestion, isFormulaTestQuestion } from "@/utils/curriculumQuestion";
import { compareFormulaAnswer } from "@/utils/formulaAnswer";
import { useInstructorStore, INSTRUCTORS } from "../../stores/instructorStore";
import { useCoursesStore } from "../../stores/coursesStore";
import { cn } from "../../lib/utils";
import {
  buildSubmitCodeResultLines,
  buildTryCodeResultLines,
  evaluateSubmissionCodeTest,
  runSubmissionCodeOutput,
  submissionHasContent,
} from "@/utils/codeTestRunner";
import { normalizeRunLanguage } from "@/utils/codeExecution/languages";
import {
  defaultWebEditorTab,
  EMPTY_WEB_CODE,
  isWebWorkspaceLanguage,
  seedWebCodeFromExample,
  type WebCodeSources,
} from "@/utils/webCodeWorkspace";
import {
  editorConsoleMinSizes,
  editorConsoleSplitSizes,
} from "@/components/courses/exercise/codeWorkspaceLayout";
import { prefetchMonacoEditor } from "./exercise/MonacoEditorLazy";
import { stopAvatarSpeech } from "@/utils/stopAvatarSpeech";
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
  resolveLessonPhase,
  type LessonPhase,
  type PrimaryNavKind,
} from "@/utils/lessonNavigation";
import {
  buildCourseCompletionSpeech,
  isLessonProgressComplete,
  isV1CourseFinished,
} from "@/utils/courseProgress";
import { CourseCompletionCelebration } from "@/components/courses/CourseCompletionCelebration";

function InstructorSpeakingIndicator({ isSpeaking }: { isSpeaking: boolean }) {
  return (
    <div className="relative flex size-11 shrink-0 items-center justify-center sm:size-12">
      {isSpeaking && (
        <>
          <span className="absolute inline-flex size-[120%] animate-ping rounded-full bg-primary/30" />
          <span
            className="absolute inline-flex size-full rounded-full bg-primary/20"
            style={{
              animation: "pulse 1.4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
            }}
          />
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

// ============================================================================
// TYPES
// ============================================================================

interface NarratorAvatarRef {
  speakText: (text: string, options?: Record<string, unknown>) => void;
  pauseSpeaking: () => void;
  resumeSpeaking: () => void;
  stopSpeaking: () => void;
}

interface CourseProgress {
  lessonId: string | null;
  /** Flat index in curriculum (all modules in order). Used to restore correct lesson when IDs repeat across modules. */
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

// Action to perform after speech ends
type PendingAction =
  | { type: "none" }
  | { type: "next_question" }
  | { type: "enable_start_questions" }
  | { type: "enable_next_lesson" }
  | { type: "show_completion" }
  | { type: "ask_question"; question: Question }
  | { type: "clear_code_and_ask"; question: Question }
  | { type: "wait_then_clear_and_ask"; question: Question }
  | { type: "start_lesson_code_demo"; lesson: Lesson }
  | { type: "start_code_example_typing" }
  | {
    type: "lesson_code_outro";
    hasQuestions: boolean;
    hasNextLesson: boolean;
  };

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function CourseDetailInner({
  slugOverride,
  onCourseCompleted,
}: {
  slugOverride?: string;
  onCourseCompleted?: () => void;
}) {
  const { exercise: exerciseParam } = useParams<{ exercise: string }>();
  const exercise = slugOverride ?? exerciseParam;
  const location = useLocation();
  const selectedInstructor = useInstructorStore((s) => s.selectedInstructor);
  const instructorConfig = INSTRUCTORS[selectedInstructor];
  const { updateCourseProgress } = useCoursesStore();
  const isCourseCompleted = useCoursesStore((state) =>
    exercise ? state.courseProgress[exercise]?.status === "completed" : false
  );

  // ============================================================================
  // REFS (values that shouldn't trigger re-renders)
  // ============================================================================

  const avatarRef = useRef<NarratorAvatarRef | null>(null);
  /** False until NarratorAvatar fires onReady (WebGL + TTS ready). Mobile needs this before speak. */
  const avatarReadyRef = useRef(false);
  const [isAvatarReady, setIsAvatarReady] = useState(false);
  const [awaitingSpeech, setAwaitingSpeech] = useState(false);
  const [hasPendingSpeech, setHasPendingSpeech] = useState(false);
  /** Speech requested before avatar was ready; desktop flushes on ready, mobile after tap-to-unlock. */
  const pendingSpeechQueueRef = useRef<
    Array<{ text: string; action: PendingAction }>
  >([]);
  const pendingActionRef = useRef<PendingAction>({ type: "none" });
  const isManuallyStopped = useRef(false);
  const codeTypingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingCodeRef = useRef(false);
  const speechStartTimeRef = useRef<number>(0);
  const lastSpeechTextRef = useRef<string>("");
  /** Last text spoken by the instructor, kept for the "Replay" control. */
  const lastSpokenTextRef = useRef<string>("");
  /** Runs after the avatar finishes the current speech chunk (reliable multi-step lesson flow). */
  const afterSpeechRef = useRef<(() => void) | null>(null);
  const pendingTypingStartRef = useRef<(() => void) | null>(null);
  const courseCompletedNotifiedRef = useRef(false);
  const courseCompletionSpeechRef = useRef(false);
  const introUnlockTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  /** Lesson id waiting for intro unlock (speech end or fallback). */
  const pendingIntroUnlockLessonIdRef = useRef<string | null>(null);
  /** Progress to apply on Continue tap so speech starts inside a user gesture. */
  const pendingResumeRef = useRef<PendingResume | null>(null);
  const [canResume, setCanResume] = useState(false);

  // ============================================================================
  // STATE
  // ============================================================================

  // Lesson & Question state
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const currentLessonRef = useRef<Lesson | null>(null);
  currentLessonRef.current = currentLesson;
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [lessonStarted, setLessonStarted] = useState(false);
  const [isLessonCodeDemoActive, setIsLessonCodeDemoActive] = useState(false);

  // Progress-driven nav: phase + introReady (not speech-gated button flags)
  const [lessonPhase, setLessonPhase] = useState<LessonPhase>("intro");
  const [introReady, setIntroReady] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Answer state
  const [selectedAnswer, setSelectedAnswer] = useState<string | boolean | null>(
    null
  );
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [studentAnswer, setStudentAnswer] = useState("");
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(
    null,
  );

  // Track correct answers for the current lesson
  const [correctAnswersCount, setCorrectAnswersCount] = useState(0);

  // Overall course completion %, surfaced as a progress bar in the header.
  const [progressPct, setProgressPct] = useState(0);

  // Instructor pause/resume. `pausedLiveRef` distinguishes an in-session pause
  // (resume mid-phrase) from one restored from a previous visit (replay line).
  const [isPaused, setIsPaused] = useState(false);
  const pausedLiveRef = useRef(false);
  const [totalQuestionsAnswered, setTotalQuestionsAnswered] = useState(0);
  // Track correct answers across the current module (for module completion message)
  const [moduleCorrectCount, setModuleCorrectCount] = useState(0);
  const [moduleTotalAnswered, setModuleTotalAnswered] = useState(0);
  // Track completed lesson IDs for accurate progress persistence
  const [completedLessonIds, setCompletedLessonIds] = useState<Set<string>>(new Set());

  // Code editor state
  const [code, setCode] = useState("");
  const [webCode, setWebCode] = useState<WebCodeSources>(EMPTY_WEB_CODE);
  const [previewRefreshKey, setPreviewRefreshKey] = useState(0);
  const [isExecutingCode, setIsExecutingCode] = useState(false);
  const [runLanguage, setRunLanguage] = useState("javascript");
  const [results, setResults] = useState<string[]>([]);
  const [fullscreen, setFullscreen] = useState<"editor" | "results" | null>(
    null
  );

  // Subtitle state for synced text display
  const [currentSubtitle, setCurrentSubtitle] = useState<string>("");
  const [isShowingSubtitles, setIsShowingSubtitles] = useState(false);

  /** iOS/Safari: audio must start from a user tap; onReady runs outside that gesture, so we prompt. */
  const [showMobileAudioUnlock, setShowMobileAudioUnlock] = useState(false);

  // ============================================================================
  // DERIVED VALUES
  // ============================================================================

  const curriculum = exercise
    ? getCurriculumBySlug(exercise)?.curriculum || null
    : null;
  const isCodeTestQuestionActive = isCodeTestQuestion(currentQuestion);
  const showCodePanel = isCodeTestQuestionActive || isLessonCodeDemoActive;
  const codePanelLanguage =
    (isCodeTestQuestionActive
      ? currentQuestion?.code_example?.language
      : currentLesson?.code_example?.language) || "javascript";
  const normalizedCodePanelLanguage = normalizeRunLanguage(codePanelLanguage);
  const useWebWorkspace = useMemo(() => {
    if (isLessonCodeDemoActive && currentLesson?.code_example) {
      return isWebWorkspaceLanguage(currentLesson.code_example.language);
    }
    if (isCodeTestQuestionActive && currentQuestion) {
      return isWebWorkspaceLanguage(
        currentQuestion.code_example?.language,
        currentQuestion.testCriteria,
      );
    }
    return false;
  }, [
    currentLesson,
    currentQuestion,
    isCodeTestQuestionActive,
    isLessonCodeDemoActive,
  ]);
  const webEditorTab = useMemo(
    () => defaultWebEditorTab(normalizedCodePanelLanguage),
    [normalizedCodePanelLanguage],
  );
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
        setCompletedLessonIds((prev) => {
          const next = new Set(prev);
          next.add(target.id);
          return next;
        });
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
    setIsLessonCodeDemoActive(false);
  }, []);

  useEffect(() => {
    setRunLanguage(normalizedCodePanelLanguage);
  }, [normalizedCodePanelLanguage]);

  const resetCodeState = useCallback(() => {
    setCode("");
    setWebCode(EMPTY_WEB_CODE);
    setResults([]);
    setPreviewRefreshKey(0);
  }, []);

  const getCodeSubmission = useCallback(
    () => ({
      code,
      webCode: useWebWorkspace ? webCode : undefined,
      language: runLanguage,
    }),
    [code, runLanguage, useWebWorkspace, webCode],
  );

  const activeTestCriteria = isCodeTestQuestionActive
    ? currentQuestion?.testCriteria
    : undefined;

  const runLessonExampleCode = useCallback(
    async (submission: ReturnType<typeof getCodeSubmission>) => {
      setIsExecutingCode(true);
      setResults(["⏳ Running code..."]);
      try {
        const runOutput = await runSubmissionCodeOutput(submission, undefined);
        setResults(
          runOutput.length > 0 ? runOutput : ["✓ Code ran successfully."],
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        setResults([`⚠️ Error: ${errorMessage}`]);
      } finally {
        setIsExecutingCode(false);
      }
    },
    [],
  );

  const handleRunLessonCode = useCallback(() => {
    if (!currentLesson?.code_example || isExecutingCode) return;

    if (useWebWorkspace) {
      setPreviewRefreshKey((key) => key + 1);
      setResults(["✓ Preview updated."]);
      return;
    }

    void runLessonExampleCode(getCodeSubmission());
  }, [
    currentLesson?.code_example,
    getCodeSubmission,
    isExecutingCode,
    runLessonExampleCode,
    useWebWorkspace,
  ]);

  useEffect(() => {
    if (!curriculum) return;
    const hasCodeExamples = curriculum.modules.some((mod) =>
      mod.lessons.some(
        (les) =>
          !!les.code_example ||
          les.questions.some((q) => q.type === "code_test"),
      ),
    );
    if (hasCodeExamples) prefetchMonacoEditor();
  }, [curriculum]);

  // ============================================================================
  // AVATAR HELPERS
  // ============================================================================

  const getAvatar = useCallback(() => avatarRef.current, []);

  const syncPendingSpeech = useCallback(() => {
    setHasPendingSpeech(pendingSpeechQueueRef.current.length > 0);
  }, []);

  /** If readiness was cleared without remounting, recover from the live avatar ref. */
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

  /** Speak immediately; only call when avatar is ready (or from mobile unlock tap = valid gesture). */
  const speakImmediate = useCallback(
    (text: string, action: PendingAction = { type: "none" }) => {
      try {
        const avatar = getAvatar();
        if (avatar && text && typeof avatar.speakText === "function") {
          pendingActionRef.current = action;
          speechStartTimeRef.current = Date.now();
          lastSpeechTextRef.current = text;
          // Persist for the "Replay" button (lastSpeechTextRef is cleared on speech end).
          lastSpokenTextRef.current = text;
          setAwaitingSpeech(true);
          avatar.speakText(text);
        }
      } catch (error) {
        console.warn("Error speaking text:", error);
        setAwaitingSpeech(false);
      }
    },
    [getAvatar]
  );

  const speak = useCallback(
    (text: string, action: PendingAction = { type: "none" }) => {
      try {
        if (!ensureAvatarReady()) {
          pendingSpeechQueueRef.current.push({ text, action });
          syncPendingSpeech();
          setAwaitingSpeech(true);
          return;
        }
        speakImmediate(text, action);
      } catch (error) {
        console.warn("Error speaking text:", error);
      }
    },
    [ensureAvatarReady, speakImmediate, syncPendingSpeech]
  );

  const flushNextQueuedSpeech = useCallback(() => {
    const q = pendingSpeechQueueRef.current;
    if (q.length === 0) {
      syncPendingSpeech();
      return;
    }
    const next = q.shift()!;
    syncPendingSpeech();
    speakImmediate(next.text, next.action);
  }, [speakImmediate, syncPendingSpeech]);

  // Persist a paused lesson so learners can resume after leaving/reloading.
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
        // ignore storage errors (private mode, quota)
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

  /** Pause the instructor mid-sentence, or resume from where it stopped. */
  const handleTogglePause = useCallback(() => {
    const avatar = getAvatar();
    if (isPaused) {
      // Resume
      if (pausedLiveRef.current && typeof avatar?.resumeSpeaking === "function") {
        avatar.resumeSpeaking();
        setIsSpeaking(true);
      } else if (lastSpokenTextRef.current) {
        // Restored from a previous visit — replay the last line from the start.
        speak(lastSpokenTextRef.current);
      }
      pausedLiveRef.current = false;
      setIsPaused(false);
      clearPausedState();
    } else {
      // Pause
      if (typeof avatar?.pauseSpeaking === "function") avatar.pauseSpeaking();
      pausedLiveRef.current = true;
      setIsPaused(true);
      setIsSpeaking(false);
      persistPausedState(lastSpokenTextRef.current);
    }
  }, [isPaused, getAvatar, speak, persistPausedState, clearPausedState]);

  // Restore a previously paused lesson on mount so the button offers "Resume".
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
    const q = pendingSpeechQueueRef.current;
    if (q.length === 0) {
      setShowMobileAudioUnlock(false);
      return;
    }

    if (!isLgUp) {
      // Mobile WebKit: onReady is async — not in the user gesture that tapped "Start".
      // Ask for one tap so speakText runs inside a gesture (autoplay / AudioContext policy).
      setShowMobileAudioUnlock(true);
      return;
    }

    // Desktop: play first chunk now; rest chain on speech end
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

  const stopSpeaking = useCallback(() => {
    try {
      // Stop any code typing animation
      isTypingCodeRef.current = false;
      if (codeTypingTimeoutRef.current) {
        clearTimeout(codeTypingTimeoutRef.current);
        codeTypingTimeoutRef.current = null;
      }

      // Stop subtitles
      stopSubtitles();

      pendingSpeechQueueRef.current = [];
      setHasPendingSpeech(false);
      setAwaitingSpeech(false);
      setShowMobileAudioUnlock(false);
      setIsLessonCodeDemoActive(false);
      afterSpeechRef.current = null;
      pendingTypingStartRef.current = null;
      clearIntroUnlockTimeout();
      pendingIntroUnlockLessonIdRef.current = null;

      isManuallyStopped.current = true;
      stopAvatarSpeech(getAvatar());
      pendingActionRef.current = { type: "none" };
      setIsSpeaking(false);
      setIsPaused(false);
      pausedLiveRef.current = false;
      clearPausedState();
      setTimeout(() => {
        isManuallyStopped.current = false;
      }, 300);
    } catch (error) {
      console.warn("Error stopping speech:", error);
      stopAvatarSpeech(getAvatar());
      pendingActionRef.current = { type: "none" };
      setIsSpeaking(false);
      setIsPaused(false);
      pausedLiveRef.current = false;
      clearPausedState();
      pendingSpeechQueueRef.current = [];
      setHasPendingSpeech(false);
      setAwaitingSpeech(false);
      setShowMobileAudioUnlock(false);
    }
  }, [getAvatar, stopSubtitles, clearIntroUnlockTimeout, clearPausedState]);

  // Subtitle comes from NarratorAvatar's onSubtitle callback (real-time spoken word)
  const handleSubtitle = useCallback((text: string) => {
    setCurrentSubtitle(
      applySubtitleShow(text, currentLessonRef.current?.avatar_show),
    );
  }, []);

  // ============================================================================
  // CODE EXAMPLE TYPING (lesson demos + question teaching)
  // ============================================================================

  const stopCodeTyping = useCallback(() => {
    isTypingCodeRef.current = false;
    if (codeTypingTimeoutRef.current) {
      clearTimeout(codeTypingTimeoutRef.current);
      codeTypingTimeoutRef.current = null;
    }
  }, []);

  const speakLessonCodeOutro = useCallback(
    (hasQuestions: boolean, hasNextLesson: boolean, lesson?: Lesson | null) => {
      setIsLessonCodeDemoActive(false);
      resetCodeState();

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
    [speak, resetCodeState, scheduleIntroUnlockFallback],
  );

  const runCodeExampleTyping = useCallback(
    (
      example: CodeExample,
      onTypingComplete: () => void,
    ) => {
      stopCodeTyping();
      isTypingCodeRef.current = true;

      const isWeb = isWebWorkspaceLanguage(example.language);
      const webTab = defaultWebEditorTab(example.language);
      const codeToType = example.code;
      const typingSpeed = example.typingSpeed ?? 30;
      let currentIndex = 0;

      const startTyping = () => {
        const typeNextChar = () => {
          if (!isTypingCodeRef.current) return;

          if (currentIndex < codeToType.length) {
            const partial = codeToType.substring(0, currentIndex + 1);
            if (isWeb) {
              setWebCode((prev) => ({ ...prev, [webTab]: partial }));
            } else {
              setCode(partial);
            }
            currentIndex++;
            codeTypingTimeoutRef.current = setTimeout(
              typeNextChar,
              typingSpeed,
            );
          } else {
            isTypingCodeRef.current = false;
            onTypingComplete();
          }
        };

        codeTypingTimeoutRef.current = setTimeout(typeNextChar, 500);
      };

      if (example.description) {
        pendingTypingStartRef.current = startTyping;
        speak(example.description, { type: "start_code_example_typing" });
      } else {
        setTimeout(startTyping, 500);
      }
    },
    [speak, stopCodeTyping],
  );

  const playLessonCodeExample = useCallback(
    (example: CodeExample, lesson: Lesson) => {
      stopCodeTyping();
      setIsLessonCodeDemoActive(true);
      setIntroReady(false);
      resetCodeState();

      const hasQuestions = (lesson.questions?.length ?? 0) > 0;
      const hasNextLesson = curriculum
        ? !!getNextLessonInOrder(lesson, curriculum)
        : !!lesson.next_lesson_id;
      const isWeb = isWebWorkspaceLanguage(example.language);

      const proceedAfterExample = () => {
        if (example.explanation) {
          speak(example.explanation);
          afterSpeechRef.current = () =>
            speakLessonCodeOutro(hasQuestions, hasNextLesson, lesson);
        } else {
          speakLessonCodeOutro(hasQuestions, hasNextLesson, lesson);
        }
      };

      runCodeExampleTyping(example, () => {
        if (example.autoRun) {
          if (isWeb) {
            setPreviewRefreshKey((key) => key + 1);
            setResults(["✓ Preview updated."]);
            proceedAfterExample();
          } else {
            void runLessonExampleCode({
              code: example.code,
              webCode: isWeb
                ? seedWebCodeFromExample(example.code, example.language)
                : undefined,
              language: normalizeRunLanguage(example.language),
            }).then(proceedAfterExample);
          }
        } else {
          proceedAfterExample();
        }
      });
    },
    [
      curriculum,
      resetCodeState,
      runCodeExampleTyping,
      runLessonExampleCode,
      speak,
      speakLessonCodeOutro,
      stopCodeTyping,
    ],
  );

  const typeCourseDetail = useCallback(
    (example: CodeExample, question: Question) => {
      setIsLessonCodeDemoActive(false);
      resetCodeState();

      const announceStudentTurn = () => {
        setTimeout(() => {
          speak(
            "Now it's your turn! I've cleared the example. Try solving the problem yourself.",
            { type: "clear_code_and_ask", question },
          );
        }, 1500);
      };

      runCodeExampleTyping(example, () => {
        if (example.explanation) {
          speak(example.explanation);
          afterSpeechRef.current = announceStudentTurn;
        } else {
          announceStudentTurn();
        }
      });
    },
    [resetCodeState, runCodeExampleTyping, speak],
  );

  // ============================================================================
  // PROGRESS HELPERS
  // ============================================================================

  const persistCoursePosition = useCallback(
    (progress: Partial<CourseProgress>) => {
      if (!exercise) return;
      updateCourseProgress(exercise, {
        currentLessonId: progress.lessonId ?? null,
        lessonIndex: progress.lessonIndex,
        questionIndex: progress.questionIndex,
        lessonStarted: progress.lessonStarted,
        canStartQuestions: progress.canStartQuestions,
        lastUpdated: Date.now(),
      });
    },
    [exercise, updateCourseProgress]
  );

  const calculateProgress = useCallback(
    (
      lessonIndex: number,
      totalLessons: number,
      questionIndex: number,
      totalQuestions: number,
      hasStarted: boolean,
      isLessonComplete: boolean
    ): number => {
      if (totalLessons === 0) return 0;
      if (lessonIndex < 0 || lessonIndex >= totalLessons) return 0;

      // Each lesson contributes equally to total progress
      const lessonWeight = 100 / totalLessons;

      // Progress from fully completed lessons
      const completedLessonsPct = lessonIndex * lessonWeight;

      // Progress within the current lesson
      let currentLessonPct = 0;
      if (isLessonComplete) {
        // Lesson fully done (all questions answered)
        currentLessonPct = lessonWeight;
      } else if (totalQuestions > 0 && hasStarted) {
        // Partial progress based on questions answered
        currentLessonPct = (questionIndex / totalQuestions) * lessonWeight;
      } else if (hasStarted) {
        // Lesson started but no questions (or before questions) — count as half
        currentLessonPct = lessonWeight * 0.5;
      }

      const total = completedLessonsPct + currentLessonPct;
      return Math.min(100, Math.max(0, Math.round(total)));
    },
    []
  );

  // ============================================================================
  // SPEECH EVENT HANDLERS
  // ============================================================================

  const handleSpeechStart = useCallback(() => {
    isManuallyStopped.current = false;
    setIsSpeaking(true);
    setIsShowingSubtitles(true);
    setCurrentSubtitle("");
    setAwaitingSpeech(false);
    syncPendingSpeech();
    // A fresh line is playing — clear any paused state.
    setIsPaused(false);
    pausedLiveRef.current = false;
    clearPausedState();
  }, [clearPausedState, syncPendingSpeech]);

  // Ref to hold the moveToNextQuestion function to avoid circular dependency
  const moveToNextQuestionRef = useRef<() => void>(() => { });

  // Internal handler that executes the pending action after speech
  const handleSpeechEndInternal = useCallback(() => {
    setIsSpeaking(false);

    // Speech finished — clear paused state.
    setIsPaused(false);
    pausedLiveRef.current = false;
    clearPausedState();

    // Stop subtitles when speech ends
    stopSubtitles();

    // Execute pending action
    const action = pendingActionRef.current;
    pendingActionRef.current = { type: "none" };
    speechStartTimeRef.current = 0;
    lastSpeechTextRef.current = "";

    switch (action.type) {
      case "next_question":
        // Small delay before moving to next question for better UX
        setTimeout(() => {
          moveToNextQuestionRef.current();
        }, 500);
        break;
      case "enable_start_questions":
        markIntroReady(currentLesson);
        break;
      case "enable_next_lesson":
        markIntroReady(currentLesson);
        setLessonPhase("complete");
        if (currentLesson) {
          setCompletedLessonIds((prev) => {
            const next = new Set(prev);
            next.add(currentLesson.id);
            return next;
          });
        }
        break;
      case "show_completion":
        markIntroReady(currentLesson);
        setLessonPhase("complete");
        if (currentLesson) {
          setCompletedLessonIds((prev) => {
            const next = new Set(prev);
            next.add(currentLesson.id);
            return next;
          });
        }
        break;
      case "ask_question":
        // Just speak the question (used after code example for non-code questions)
        setTimeout(() => {
          speak(action.question.question);
        }, 300);
        break;
      case "clear_code_and_ask":
        resetCodeState();
        setTimeout(() => {
          speak(action.question.question);
        }, 500);
        break;
      case "wait_then_clear_and_ask":
        // After explanation finishes, wait a moment so student can absorb,
        // then announce we're clearing and ask the question
        setTimeout(() => {
          // Announce that we're clearing the example and it's the student's turn
          speak(
            "Now it's your turn! I've cleared the example. Try solving the problem yourself.",
            { type: "clear_code_and_ask", question: action.question }
          );
        }, 1500); // 1.5 second pause after explanation before clearing
        break;
      case "start_lesson_code_demo":
        if (action.lesson.code_example) {
          playLessonCodeExample(action.lesson.code_example, action.lesson);
        } else {
          speakLessonCodeOutro(
            (action.lesson.questions?.length ?? 0) > 0,
            curriculum
              ? !!getNextLessonInOrder(action.lesson, curriculum)
              : !!action.lesson.next_lesson_id,
            action.lesson,
          );
        }
        break;
      case "start_code_example_typing": {
        const startTyping = pendingTypingStartRef.current;
        pendingTypingStartRef.current = null;
        startTyping?.();
        break;
      }
      case "lesson_code_outro":
        speakLessonCodeOutro(
          action.hasQuestions,
          action.hasNextLesson,
          currentLesson,
        );
        break;
      default:
        break;
    }

    // Continue any speech queued before avatar was ready (multi-chunk flush)
    flushNextQueuedSpeech();
  }, [
    speak,
    stopSubtitles,
    clearPausedState,
    flushNextQueuedSpeech,
    playLessonCodeExample,
    speakLessonCodeOutro,
    resetCodeState,
    markIntroReady,
    currentLesson,
    curriculum,
  ]);

  const handleSpeechEnd = useCallback(() => {
    // Ignore if manually stopped
    if (isManuallyStopped.current) return;

    // Calculate minimum expected duration based on text length
    // Average speaking rate is ~150 words per minute, so ~2.5 words per second
    // Each word averages ~5 characters, so ~12.5 characters per second
    const textLength = lastSpeechTextRef.current.length;
    const minDurationMs = Math.max(1000, (textLength / 12.5) * 1000);
    const elapsedMs = Date.now() - speechStartTimeRef.current;

    // If speech ended too quickly, wait for the minimum duration
    if (elapsedMs < minDurationMs && speechStartTimeRef.current > 0) {
      const remainingDelay = minDurationMs - elapsedMs;
      setTimeout(() => {
        // Re-check if still valid (not manually stopped)
        if (!isManuallyStopped.current) {
          handleSpeechEndInternal();
        }
      }, remainingDelay);
      return;
    }

    handleSpeechEndInternal();
  }, [handleSpeechEndInternal]);

  // Chain lesson speech steps after each avatar utterance finishes (e.g. explanation → start questions).
  useEffect(() => {
    if (isSpeaking || !afterSpeechRef.current) return;
    const fn = afterSpeechRef.current;
    afterSpeechRef.current = null;
    fn();
  }, [isSpeaking]);

  // ============================================================================
  // QUESTION NAVIGATION
  // ============================================================================

  const moveToNextQuestion = useCallback(() => {
    if (!currentLesson?.questions) return;

    // Stop any ongoing code typing
    stopCodeTyping();

    const nextIndex = currentQuestionIndex + 1;

    if (nextIndex < currentLesson.questions.length) {
      // Move to next question
      const nextQuestion = currentLesson.questions[nextIndex];
      setCurrentQuestion(nextQuestion);
      setCurrentQuestionIndex(nextIndex);
      setLessonPhase("questions");
      setSelectedAnswer(null);
      setIsAnswerSubmitted(false);
      setStudentAnswer("");
      setLastAnswerCorrect(null);
      resetCodeState();

      persistCoursePosition({
        lessonId: currentLesson.id,
        lessonIndex: curriculum ? getLessonIndexInCurriculum(currentLesson, curriculum) : undefined,
        questionIndex: nextIndex,
        lessonStarted: true,
        canStartQuestions: true,
      });

      // Teach worked example first, then ask the question
      if (
        nextQuestion.type === "code_test" &&
        nextQuestion.code_example
      ) {
        typeCourseDetail(nextQuestion.code_example, nextQuestion);
      } else {
        speak(nextQuestion.question);
      }
    } else {
      // All questions completed
      setCurrentQuestion(null);
      setCurrentQuestionIndex(currentLesson.questions.length);
      setLessonPhase("complete");
      setIntroReady(true);

      // Mark this lesson as completed
      setCompletedLessonIds((prev) => {
        const next = new Set(prev);
        next.add(currentLesson.id);
        return next;
      });

      // Add this lesson's score to module totals
      const totalQuestions = currentLesson.questions.length;
      const correctCount = correctAnswersCount;
      const wrongCount = totalQuestionsAnswered - correctCount;
      const newModuleCorrect = moduleCorrectCount + correctCount;
      const newModuleTotal = moduleTotalAnswered + totalQuestionsAnswered;
      setModuleCorrectCount(newModuleCorrect);
      setModuleTotalAnswered(newModuleTotal);

      // Build lesson completion message: "In this lesson, you learned about X. You got Y/Z correct."
      const lessonSummary = `In this lesson, you learned about ${currentLesson.title}.`;
      let lessonScore = "";
      if (totalQuestionsAnswered > 0) {
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

      // Persist "lesson completed" state so returning users see completion screen, not first lesson
      persistCoursePosition({
        lessonId: currentLesson.id,
        lessonIndex: curriculum ? getLessonIndexInCurriculum(currentLesson, curriculum) : undefined,
        questionIndex: totalQuestions,
        lessonStarted: true,
        canStartQuestions: true,
      });

      // Delay speech to allow React to re-render and mount the correct avatar
      setTimeout(() => {
        speak(
          completionMessage,
          hasNext ? { type: "enable_next_lesson" } : { type: "show_completion" },
        );

        // Fallback: ensure isSpeaking is reset after a reasonable timeout
        // in case the speech system fails to trigger onSpeechEnd
        setTimeout(() => {
          setIsSpeaking(false);
        }, 15000); // 15 seconds max for any speech
      }, 300);
    }
  }, [
    currentLesson,
    currentQuestionIndex,
    correctAnswersCount,
    totalQuestionsAnswered,
    moduleCorrectCount,
    moduleTotalAnswered,
    curriculum,
    persistCoursePosition,
    speak,
    stopCodeTyping,
    typeCourseDetail,
    resetCodeState,
  ]);
  useEffect(() => {
    moveToNextQuestionRef.current = moveToNextQuestion;
  }, [moveToNextQuestion]);

  // ============================================================================
  // LESSON FLOW HANDLERS
  // ============================================================================

  const speakLessonContent = useCallback(
    (lesson: Lesson) => {
      const parts: string[] = [];
      const intro = `Welcome! In this lesson, you will be learning about ${lesson.title}.`;
      parts.push(intro);

      if (lesson.body) parts.push(lesson.body);
      if (lesson.avatar_script) parts.push(lesson.avatar_script);

      const introText = parts.join(" ");
      const hasQuestions = (lesson.questions?.length ?? 0) > 0;
      const hasNext = curriculum
        ? !!getNextLessonInOrder(lesson, curriculum)
        : !!lesson.next_lesson_id;

      if (lesson.code_example) {
        setIsLessonCodeDemoActive(false);
        setIntroReady(false);
        if (introText) {
          speak(introText, { type: "start_lesson_code_demo", lesson });
        } else {
          playLessonCodeExample(lesson.code_example, lesson);
        }
        return;
      }

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
          finalText +=
            " You've completed this lesson! Click 'Next Lesson' to continue.";
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
    [
      curriculum,
      markIntroReady,
      playLessonCodeExample,
      scheduleIntroUnlockFallback,
      speak,
    ],
  );

  const handleStartLesson = useCallback(() => {
    if (!curriculum) return;

    // Resume path: continue the saved lesson and start avatar speech in this tap.
    const pending = pendingResumeRef.current;
    if (pending) {
      pendingResumeRef.current = null;
      setCanResume(false);
      const { lesson, questionIndex, canStartQuestions, lessonComplete } =
        pending;

      void (avatarRef.current as { resumeAudioContext?: () => Promise<void> } | null)
        ?.resumeAudioContext?.()
        .catch(() => {
          /* expected on some WebKit builds until speakText */
        });

      setLessonStarted(true);
      setShowMobileAudioUnlock(false);

      if (lessonComplete) {
        setCurrentLesson(lesson);
        setCurrentQuestion(null);
        setCurrentQuestionIndex(lesson.questions?.length ?? 0);
        setLessonPhase("complete");
        setIntroReady(true);
        setCompletedLessonIds((prev) => {
          const next = new Set(prev);
          next.add(lesson.id);
          return next;
        });
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

    // Reset answer tracking for new lesson and module (starting fresh)
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
    resetCodeState();
    setCorrectAnswersCount(0);
    setTotalQuestionsAnswered(0);
    setModuleCorrectCount(0);
    setModuleTotalAnswered(0);
    setCompletedLessonIds(new Set());
    courseCompletionSpeechRef.current = false;
  }, [
    exercise,
    curriculum,
    updateCourseProgress,
    stopSpeaking,
    clearIntroUnlockTimeout,
    resetCodeState,
  ]);

  const handlePreviousLesson = useCallback(() => {
    if (!currentLesson || !curriculum) return;

    stopSpeaking();
    clearIntroUnlockTimeout();

    const prevLesson = getPreviousLessonInOrder(currentLesson, curriculum);
    if (!prevLesson) return;

    const currentModIndex = getModuleIndexForLesson(currentLesson, curriculum);
    const prevModIndex = getModuleIndexForLesson(prevLesson, curriculum);
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
    resetCodeState();

    // Re-teach even if already completed — keep completion status for nav.
    enterLessonIntro(prevLesson);
    persistCoursePosition({
      lessonId: prevLesson.id,
      lessonIndex: getLessonIndexInCurriculum(prevLesson, curriculum),
      questionIndex: 0,
      lessonStarted: true,
      canStartQuestions: false,
    });
    speakLessonContent(prevLesson);
  }, [
    currentLesson,
    curriculum,
    persistCoursePosition,
    speakLessonContent,
    stopSpeaking,
    clearIntroUnlockTimeout,
    enterLessonIntro,
    resetCodeState,
  ]);

  const handlePreviousQuestion = useCallback(() => {
    if (!currentLesson?.questions || currentQuestionIndex <= 0) return;

    stopSpeaking();
    stopCodeTyping();

    const prevIndex = currentQuestionIndex - 1;
    const prevQuestion = currentLesson.questions[prevIndex];

    setCurrentQuestion(prevQuestion);
    setCurrentQuestionIndex(prevIndex);
    setLessonPhase("questions");
    setSelectedAnswer(null);
    setIsAnswerSubmitted(false);
    setStudentAnswer("");
    setLastAnswerCorrect(null);
    resetCodeState();

    persistCoursePosition({
      lessonId: currentLesson.id,
      lessonIndex: curriculum
        ? getLessonIndexInCurriculum(currentLesson, curriculum)
        : undefined,
      questionIndex: prevIndex,
      lessonStarted: true,
      canStartQuestions: true,
    });

    if (prevQuestion.type === "code_test" && prevQuestion.code_example) {
      typeCourseDetail(prevQuestion.code_example, prevQuestion);
    } else {
      speak(prevQuestion.question);
    }
  }, [
    currentLesson,
    currentQuestionIndex,
    curriculum,
    persistCoursePosition,
    speak,
    stopSpeaking,
    stopCodeTyping,
    typeCourseDetail,
    resetCodeState,
  ]);

  const handleBackToLessonIntro = useCallback(() => {
    if (!currentLesson) return;
    stopSpeaking();
    stopCodeTyping();
    clearIntroUnlockTimeout();
    enterLessonIntro(currentLesson);
    setSelectedAnswer(null);
    setIsAnswerSubmitted(false);
    setStudentAnswer("");
    setLastAnswerCorrect(null);
    resetCodeState();
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
    resetCodeState,
    speakLessonContent,
    stopCodeTyping,
    stopSpeaking,
  ]);

  const handleReviewLastQuestion = useCallback(() => {
    if (!currentLesson?.questions?.length) return;
    stopSpeaking();
    stopCodeTyping();
    const lastIndex = currentLesson.questions.length - 1;
    const question = currentLesson.questions[lastIndex];
    setCurrentQuestion(question);
    setCurrentQuestionIndex(lastIndex);
    setLessonPhase("questions");
    setSelectedAnswer(null);
    setIsAnswerSubmitted(false);
    setStudentAnswer("");
    setLastAnswerCorrect(null);
    resetCodeState();
    persistCoursePosition({
      lessonId: currentLesson.id,
      lessonIndex: curriculum
        ? getLessonIndexInCurriculum(currentLesson, curriculum)
        : undefined,
      questionIndex: lastIndex,
      lessonStarted: true,
      canStartQuestions: true,
    });
    if (question.type === "code_test" && question.code_example) {
      typeCourseDetail(question.code_example, question);
    } else {
      speak(question.question);
    }
  }, [
    currentLesson,
    curriculum,
    persistCoursePosition,
    resetCodeState,
    speak,
    stopCodeTyping,
    stopSpeaking,
    typeCourseDetail,
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
    isSpeaking,
    currentLesson,
    lessonPhase,
    currentQuestionIndex,
    handlePreviousQuestion,
    handleBackToLessonIntro,
    handleReviewLastQuestion,
    handlePreviousLesson,
  ]);

  const handleStartQuestions = useCallback(() => {
    if (!introReady || lessonPhase !== "intro" || !currentLesson?.questions?.length)
      return;

    stopSpeaking();
    stopCodeTyping();
    clearIntroUnlockTimeout();
    setIsLessonCodeDemoActive(false);
    setIntroReady(false);

    const question = currentLesson.questions[0];
    setCurrentQuestion(question);
    setCurrentQuestionIndex(0);
    setLessonPhase("questions");
    setSelectedAnswer(null);
    setIsAnswerSubmitted(false);
    setStudentAnswer("");
    setLastAnswerCorrect(null);
    resetCodeState();

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

    if (question.type === "code_test" && question.code_example) {
      typeCourseDetail(question.code_example, question);
    } else {
      speak(question.question);
    }
  }, [
    introReady,
    lessonPhase,
    currentLesson,
    curriculum,
    persistCoursePosition,
    speak,
    stopSpeaking,
    stopCodeTyping,
    typeCourseDetail,
    clearIntroUnlockTimeout,
    resetCodeState,
  ]);

  const handleNextLesson = useCallback(() => {
    if (!currentLesson || !curriculum) return;
    const lessonComplete =
      lessonPhase === "complete" ||
      completedLessonIds.has(currentLesson.id) ||
      ((currentLesson.questions?.length ?? 0) === 0 && introReady);
    if (!lessonComplete) return;

    const nextLesson = getNextLessonInOrder(currentLesson, curriculum);
    if (!nextLesson) return;

    stopSpeaking();
    clearIntroUnlockTimeout();

    const currentModIndex = getModuleIndexForLesson(currentLesson, curriculum);
    const nextModIndex = getModuleIndexForLesson(nextLesson, curriculum);
    const movingToNewModule =
      currentModIndex !== -1 &&
      nextModIndex !== -1 &&
      currentModIndex !== nextModIndex;

    enterLessonIntro(nextLesson);
    resetCodeState();

    setCorrectAnswersCount(0);
    setTotalQuestionsAnswered(0);
    if (movingToNewModule) {
      setModuleCorrectCount(0);
      setModuleTotalAnswered(0);
    }

    persistCoursePosition({
      lessonId: nextLesson.id,
      lessonIndex: getLessonIndexInCurriculum(nextLesson, curriculum),
      questionIndex: 0,
      lessonStarted: true,
      canStartQuestions: false,
    });

    speakLessonContent(nextLesson);
  }, [
    currentLesson,
    curriculum,
    lessonPhase,
    completedLessonIds,
    introReady,
    persistCoursePosition,
    speakLessonContent,
    stopSpeaking,
    clearIntroUnlockTimeout,
    enterLessonIntro,
    resetCodeState,
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

  // ============================================================================
  // ANSWER HANDLERS
  // ============================================================================

  const handleMultipleChoiceSelect = useCallback(
    (option: string) => {
      if (isAnswerSubmitted) return;
      setSelectedAnswer(option);
    },
    [isAnswerSubmitted]
  );

  const handleTrueFalseSelect = useCallback(
    (value: boolean) => {
      if (isAnswerSubmitted) return;
      setSelectedAnswer(value);
    },
    [isAnswerSubmitted]
  );

  const handleSubmitAnswer = useCallback(() => {
    if (isAnswerSubmitted || selectedAnswer === null || !currentQuestion)
      return;

    setIsAnswerSubmitted(true);

    let feedbackText = "";
    let isCorrect = false;

    if (currentQuestion.type === "multiple_choice") {
      isCorrect = currentQuestion.answer === selectedAnswer;
      feedbackText = isCorrect
        ? `Correct! Well done. ${currentQuestion.explanation || ""}`
        : `Incorrect. The correct answer is ${currentQuestion.answer}. ${currentQuestion.explanation || ""
        }`;
    } else if (currentQuestion.type === "true_false") {
      isCorrect = currentQuestion.answer === selectedAnswer;
      feedbackText = isCorrect
        ? `Correct! Well done. ${currentQuestion.explanation || ""}`
        : `Incorrect. The correct answer is ${currentQuestion.answer ? "True" : "False"
        }. ${currentQuestion.explanation || ""}`;
    }

    // Track the answer result
    setTotalQuestionsAnswered((prev) => prev + 1);
    if (isCorrect) {
      setCorrectAnswersCount((prev) => prev + 1);
    }

    // Speak feedback, then auto-progress to next question
    speak(feedbackText, { type: "next_question" });
  }, [isAnswerSubmitted, selectedAnswer, currentQuestion, speak]);

  const handleSubmitFormula = useCallback(() => {
    if (!currentQuestion || !isFormulaTestQuestion(currentQuestion)) return;
    if (isAnswerSubmitted) return;

    setIsAnswerSubmitted(true);
    const expected =
      currentQuestion.testCriteria?.expectedFormula?.trim() ?? "";
    const isCorrect = expected
      ? compareFormulaAnswer(studentAnswer, expected)
      : false;
    setLastAnswerCorrect(isCorrect);
    setTotalQuestionsAnswered((prev) => prev + 1);
    if (isCorrect) setCorrectAnswersCount((prev) => prev + 1);

    const feedbackText = isCorrect
      ? `Correct! Well done. ${currentQuestion.explanation ?? ""}`
      : `Not quite. The expected answer is ${expected}. ${currentQuestion.explanation ?? ""}`;
    speak(feedbackText, { type: "next_question" });
  }, [currentQuestion, isAnswerSubmitted, speak, studentAnswer]);

  /** Check code against test criteria without recording a final answer. */
  const handleTryCodeTest = useCallback(async () => {
    if (!currentQuestion || currentQuestion.type !== "code_test") return;

    const submission = getCodeSubmission();

    if (useWebWorkspace) {
      setPreviewRefreshKey((key) => key + 1);
    } else {
      setIsExecutingCode(true);
      setResults(["⏳ Running code..."]);
    }

    try {
      const runOutput = useWebWorkspace
        ? []
        : await runSubmissionCodeOutput(
          submission,
          currentQuestion.testCriteria,
        );
      const { passed, testResults } = evaluateSubmissionCodeTest(
        submission,
        currentQuestion.testCriteria,
      );
      setResults(
        buildTryCodeResultLines(runOutput, passed, testResults, {
          web: useWebWorkspace,
        }),
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      setResults([`⚠️ Error: ${errorMessage}`]);
    } finally {
      if (!useWebWorkspace) {
        setIsExecutingCode(false);
      }
    }
  }, [currentQuestion, getCodeSubmission, useWebWorkspace]);

  const handleSubmitCodeAnswer = useCallback(async () => {
    if (!currentQuestion || currentQuestion.type !== "code_test") return;
    if (isAnswerSubmitted) return;

    const submission = getCodeSubmission();

    if (useWebWorkspace) {
      setPreviewRefreshKey((key) => key + 1);
    } else {
      setIsExecutingCode(true);
      setResults(["⏳ Running code..."]);
    }

    try {
      const runOutput = useWebWorkspace
        ? []
        : await runSubmissionCodeOutput(
          submission,
          currentQuestion.testCriteria,
        );
      const { passed, testResults } = evaluateSubmissionCodeTest(
        submission,
        currentQuestion.testCriteria,
      );
      setResults(buildSubmitCodeResultLines(runOutput, passed, testResults));
      setIsAnswerSubmitted(true);

      const passedCount = testResults.filter((r) => r.passed).length;
      const totalCount = testResults.length;
      const feedbackText = passed
        ? `Excellent! You passed this coding test. ${passedCount} out of ${totalCount} tests correct. ${currentQuestion.explanation || ""}`
        : `You failed this coding test. ${passedCount} out of ${totalCount} tests passed. ${currentQuestion.explanation || ""}`;

      setTotalQuestionsAnswered((prev) => prev + 1);
      if (passed) {
        setCorrectAnswersCount((prev) => prev + 1);
      }

      speak(feedbackText, { type: "next_question" });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      setResults([`⚠️ Error: ${errorMessage}`]);
      setIsAnswerSubmitted(true);
      setTotalQuestionsAnswered((prev) => prev + 1);

      speak(`There was an error running your code: ${errorMessage}`, {
        type: "next_question",
      });
    } finally {
      if (!useWebWorkspace) {
        setIsExecutingCode(false);
      }
    }
  }, [
    currentQuestion,
    getCodeSubmission,
    isAnswerSubmitted,
    speak,
    useWebWorkspace,
  ]);

  // ============================================================================
  // EFFECTS
  // ============================================================================

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
      const allQuestionsDone =
        questionCount > 0 && questionIndex >= questionCount;
      const lessonComplete =
        completed.has(lesson.id) || allQuestionsDone;

      // Park the lesson for Continue — do not auto-speak (async hydrate is outside a user gesture).
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
    });
    setLessonPhase((prev) => (prev === nextPhase ? prev : nextPhase));
  }, [
    currentLesson,
    currentQuestion,
    currentQuestionIndex,
    introReady,
    completedLessonIds,
    lessonStarted,
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
    });
  }, [
    currentLesson,
    curriculum,
    lessonStarted,
    lessonPhase,
    introReady,
    currentQuestionIndex,
    isSpeaking,
    completedLessonIds,
  ]);

  // Avatar remounts when the course, instructor, or viewport layout changes.
  // Desktop also swaps avatar instances when entering/leaving code-test layout.
  // Never clear pendingSpeechQueueRef here — onReady should flush queued lines.
  useEffect(() => {
    avatarReadyRef.current = false;
    setIsAvatarReady(false);
    setShowMobileAudioUnlock(false);
  }, [exercise, selectedInstructor, isLgUp]);

  useEffect(() => {
    if (!isLgUp) return;
    avatarReadyRef.current = false;
    setIsAvatarReady(false);
    setShowMobileAudioUnlock(false);
  }, [isCodeTestQuestionActive, isLgUp]);

  const isInstructorWaiting = isInstructorWaitActive({
    isPaused,
    isAvatarReady,
    hasPendingSpeech,
    awaitingSpeech,
  });

  // Sync progress to store when lesson/question changes
  useEffect(() => {
    if (!currentLesson || !exercise || !curriculum) return;

    const allLessons: Lesson[] = [];
    curriculum.modules.forEach((m) => allLessons.push(...m.lessons));
    if (allLessons.length === 0) return;

    // Use lesson index in curriculum (not lesson ID) so progress is correct when IDs repeat across modules
    const currentIndex = getLessonIndexInCurriculum(currentLesson, curriculum);
    if (currentIndex < 0) return;

    const totalQuestions = currentLesson.questions?.length ?? 0;
    const isCurrentLessonComplete = isLessonProgressComplete(
      currentLesson,
      completedLessonIds,
      currentQuestionIndex,
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
    });
    const finalProgress = isCourseFinished ? 100 : progress;

    setProgressPct(finalProgress);

    const status: "not-started" | "ongoing" | "completed" = !lessonStarted
      ? "not-started"
      : isCourseFinished
        ? "completed"
        : "ongoing";

    updateCourseProgress(
      exercise,
      {
        status,
        progress: finalProgress,
        currentLessonId: currentLesson.id,
        completedLessons: Array.from(completedLessonIds),
      },
      // Flush immediately when course is completed to avoid data loss
      { immediate: status === "completed" }
    );

    if (status === "completed" && !courseCompletedNotifiedRef.current) {
      courseCompletedNotifiedRef.current = true;
      onCourseCompleted?.();
    }
    if (status !== "completed") {
      courseCompletedNotifiedRef.current = false;
    }
  }, [
    currentLesson,
    currentQuestionIndex,
    lessonStarted,
    exercise,
    curriculum,
    completedLessonIds,
    calculateProgress,
    updateCourseProgress,
    onCourseCompleted,
  ]);

  // Instructor celebrates when the course is fully complete.
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

  // Cleanup on unmount - stop any ongoing speech and code typing
  useEffect(() => {
    return () => {
      // Clear code typing animation
      isTypingCodeRef.current = false;
      if (codeTypingTimeoutRef.current) {
        clearTimeout(codeTypingTimeoutRef.current);
        codeTypingTimeoutRef.current = null;
      }

      pendingSpeechQueueRef.current = [];
      pendingActionRef.current = { type: "none" };
      stopAvatarSpeech(avatarRef.current);
    };
  }, []);

  // ============================================================================
  // AVATAR CONFIG
  // ============================================================================

  const avatarConfig = {
    cameraView: "mid" as const,
    avatarUrl: instructorConfig.avatarUrl,
    avatarBody: instructorConfig.avatarBody,
    ttsService: "deepgram" as const,
    ttsVoice: instructorConfig.ttsVoice,
    ttsApiKey:
      import.meta.env?.VITE_DEEPGRAM_API_KEY,
    lipsyncModules: ["en"] as const,
    lipsyncLang: "en",
    speechRate: 0.9,
    accurateLipSync: true,
  };

  const lessonChromePanel = (
    <div className="shrink-0 relative z-10">
      {lessonStarted && lessonNav && (
        <LessonNavControls
          nav={lessonNav}
          onPrevious={handlePrevious}
          onPrimary={handlePrimaryNav}
          showRestart={isCourseCompleted}
          onRestart={handleRestartCourse}
        />
      )}

      {currentQuestion?.type === "code_test" && (
        <QuestionInfo question={currentQuestion} />
      )}

      {isCodeTestQuestionActive && (
        <div className="my-4 hidden min-h-[100px] items-center justify-center lg:flex lg:my-6">
          <div className="relative flex items-center justify-center">
            {isSpeaking && (
              <>
                <div className="absolute h-16 w-16 animate-ping rounded-full bg-primary/20"></div>
                <div
                  className="absolute h-14 w-14 animate-ping rounded-full bg-primary/30"
                  style={{ animationDelay: "0.2s" }}
                ></div>
                <div
                  className="absolute h-12 w-12 animate-ping rounded-full bg-primary/40"
                  style={{ animationDelay: "0.4s" }}
                ></div>
              </>
            )}
            <div
              className={`relative rounded-full border-2 bg-white/90 p-3 shadow-lg backdrop-blur-sm transition-all duration-300 ${isSpeaking
                ? "scale-110 border-primary shadow-primary/50"
                : "scale-100 border-primary/30"
                }`}
            >
              <Volume2
                className={`h-6 w-6 text-primary ${isSpeaking ? "animate-pulse" : ""
                  }`}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ============================================================================
  // RENDER
  // ============================================================================

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
        {/* LEFT SIDE: lesson chrome + avatar (desktop only); narrow viewports use 0% width */}
        <div
          className={cn(
            "relative flex min-h-0 flex-col overflow-y-auto scrollbar-hide",
            isLgUp ? "pr-4" : "min-w-0 overflow-hidden",
          )}
        >
          {isLgUp && (
            <>
              {lessonStarted && lessonNav && (
                <div className="mb-3 flex items-center gap-3">
                  <LessonProgressBar
                    value={progressPct}
                    label={lessonNav.positionLabel}
                    className="flex-1"
                  />
                  {(isSpeaking || isPaused) && (
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
                  )}
                </div>
              )}

              {lessonChromePanel}

              {!isCodeTestQuestionActive && curriculum && (
                <div className="mt-4 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                  <div className="flex justify-start items-center w-full h-full min-h-0 min-w-0">
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
                      className="w-full h-full min-w-0 min-h-0 max-h-full max-w-full"
                    />
                  </div>
                </div>
              )}

              {isCodeTestQuestionActive && curriculum && (
                <div className="pointer-events-none invisible absolute inset-0">
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
            </>
          )}
        </div>

        {/* RIGHT SIDE */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {/* Mobile: Instructor audio header + control buttons at top */}
          {!isLgUp && (
            <div className="shrink-0 border-b border-primary/10 bg-white/95 shadow-sm backdrop-blur-md supports-backdrop-filter:bg-white/80">
              <PageLoadWaitBanner isLoading={isInstructorWaiting} />
              {/* Instructor audio indicator */}
              <div className="flex items-center gap-3 px-3 py-2">
                <InstructorSpeakingIndicator isSpeaking={isSpeaking} />
                <div className="min-w-0 flex-1">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-primary/80">
                    Instructor audio
                  </p>
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
                )}
              </div>
              {lessonStarted && lessonNav && (
                <div className="px-3 pb-2">
                  <LessonProgressBar
                    value={progressPct}
                    label={lessonNav.positionLabel}
                  />
                </div>
              )}
              {/* Mobile WebKit: first speech after avatar loads must run inside a tap (see handleAvatarReady). */}
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
                    <Volume2 className="h-5 w-5 shrink-0" aria-hidden />
                    <span className="whitespace-nowrap">
                      {MOBILE_INSTRUCTOR_AUDIO_BUTTON}
                    </span>
                  </button>
                </div>
              )}
              {/* Lesson controls / code question info — hidden until lesson starts (start lives in main content).
                  On mobile we keep the nav visible but collapse the (potentially long) question
                  prompt by default so the code editor below gets the full remaining height. */}
              {(lessonStarted || isLessonCodeDemoActive || currentQuestion?.type === "code_test") && (
                <div className="space-y-2 px-3 pb-3">
                  {lessonStarted && lessonNav && (
                    <LessonNavControls
                      nav={lessonNav}
                      onPrevious={handlePrevious}
                      onPrimary={handlePrimaryNav}
                      showRestart={isCourseCompleted}
                      onRestart={handleRestartCourse}
                    />
                  )}
                  {currentQuestion?.type === "code_test" && (
                    <MobileCollapsible label="question">
                      <QuestionInfo question={currentQuestion} />
                    </MobileCollapsible>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="scrollbar-hide flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
            {showCodePanel ? (
              <div className="flex min-h-0 h-full w-full flex-1 flex-col">
                {isLessonCodeDemoActive && currentLesson && (
                  <div className="border-b border-primary/10 bg-white/90 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">
                      Code example
                    </p>
                    <h3 className="font-solway text-lg font-bold text-gray-900">
                      {currentLesson.title}
                    </h3>
                    {currentLesson.code_example?.description && (
                      <p className="mt-1 text-sm text-gray-600">
                        {currentLesson.code_example.description}
                      </p>
                    )}
                  </div>
                )}
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                  {useWebWorkspace ? (
                    <WebCodeWorkspace
                      sources={webCode}
                      onSourcesChange={setWebCode}
                      onTestCode={
                        isLessonCodeDemoActive
                          ? handleRunLessonCode
                          : () => void handleSubmitCodeAnswer()
                      }
                      onTryOut={
                        isLessonCodeDemoActive
                          ? undefined
                          : () => void handleTryCodeTest()
                      }
                      onToggleFullscreen={() =>
                        setFullscreen(
                          fullscreen === "editor" ? null : "editor",
                        )
                      }
                      isFullscreen={fullscreen === "editor"}
                      canTest={
                        isLessonCodeDemoActive
                          ? submissionHasContent(
                            getCodeSubmission(),
                            undefined,
                          ) && !isExecutingCode
                          : submissionHasContent(
                            getCodeSubmission(),
                            activeTestCriteria,
                          ) &&
                          !isAnswerSubmitted &&
                          !isExecutingCode
                      }
                      canSubmit={
                        !isLessonCodeDemoActive &&
                        submissionHasContent(
                          getCodeSubmission(),
                          activeTestCriteria,
                        ) &&
                        !isSpeaking &&
                        !isAnswerSubmitted &&
                        !isExecutingCode
                      }
                      isRunning={isExecutingCode}
                      results={results}
                      previewRefreshKey={previewRefreshKey}
                      initialTab={webEditorTab}
                    />
                  ) : (
                    <Split
                      direction="vertical"
                      className="flex h-full w-full flex-col"
                      sizes={editorConsoleSplitSizes(!isLgUp)}
                      minSize={editorConsoleMinSizes(!isLgUp)}
                      gutterSize={8}
                      gutterStyle={(dimension, gutterSize) =>
                        dimension === "height"
                          ? {
                            height: `${gutterSize}px`,
                            cursor: "row-resize",
                            pointerEvents: "auto",
                          }
                          : {}
                      }
                    >
                      <CodeEditor
                        code={code}
                        onCodeChange={setCode}
                        onTestCode={
                          isLessonCodeDemoActive
                            ? handleRunLessonCode
                            : () => void handleSubmitCodeAnswer()
                        }
                        onTryOut={
                          isLessonCodeDemoActive
                            ? undefined
                            : () => void handleTryCodeTest()
                        }
                        language={runLanguage}
                        onLanguageChange={setRunLanguage}
                        onToggleFullscreen={() =>
                          setFullscreen(
                            fullscreen === "editor" ? null : "editor",
                          )
                        }
                        isFullscreen={fullscreen === "editor"}
                        canTest={
                          isLessonCodeDemoActive
                            ? submissionHasContent(
                              getCodeSubmission(),
                              undefined,
                            ) && !isExecutingCode
                            : submissionHasContent(
                              getCodeSubmission(),
                              activeTestCriteria,
                            ) &&
                            !isAnswerSubmitted &&
                            !isExecutingCode
                        }
                        canSubmit={
                          !isLessonCodeDemoActive &&
                          submissionHasContent(
                            getCodeSubmission(),
                            activeTestCriteria,
                          ) &&
                          !isSpeaking &&
                          !isAnswerSubmitted &&
                          !isExecutingCode
                        }
                        isRunning={isExecutingCode}
                        onReset={() =>
                          setCode(
                            (isLessonCodeDemoActive
                              ? currentLesson?.code_example?.code
                              : currentQuestion?.code_example?.starterCode) ??
                              "",
                          )
                        }
                        testDisabledReason="Write some code first"
                        submitDisabledReason={
                          isSpeaking
                            ? "Wait for the instructor to finish"
                            : isAnswerSubmitted
                              ? "You already submitted this answer"
                              : "Write some code first"
                        }
                      />
                      <TestResults
                        results={results}
                        code={code}
                        onToggleFullscreen={() =>
                          setFullscreen(
                            fullscreen === "results" ? null : "results",
                          )
                        }
                        isFullscreen={fullscreen === "results"}
                      />
                    </Split>
                  )}
                </div>
              </div>
            ) : (
              <div className="relative flex w-full min-h-0 flex-1 flex-col overflow-y-auto border-l-0 border-primary/20 bg-linear-to-br from-[#F3ECFE] via-[#F8F4FF] to-white p-4 sm:p-6 lg:min-h-screen lg:border-l-2">
                {/* Decorative background */}
                <div className="absolute inset-0 opacity-5 pointer-events-none">
                  <div className="absolute top-20 right-10 w-32 h-32 bg-primary rounded-full blur-3xl"></div>
                  <div className="absolute bottom-20 left-10 w-40 h-40 bg-primary/60 rounded-full blur-3xl"></div>
                </div>

                <div className="relative z-10">
                  {currentQuestion ? (
                    <>
                      {isFormulaTestQuestion(currentQuestion) ? (
                        <MathAnswerWorkspace
                          question={currentQuestion.question}
                          value={studentAnswer}
                          onChange={setStudentAnswer}
                          onSubmit={handleSubmitFormula}
                          canSubmit={
                            !!studentAnswer.trim() &&
                            !isSpeaking &&
                            !isAnswerSubmitted
                          }
                          disabled={isSpeaking}
                          isSubmitted={isAnswerSubmitted}
                          isCorrect={lastAnswerCorrect}
                          expectedAnswer={
                            currentQuestion.testCriteria?.expectedFormula
                          }
                        />
                      ) : (
                        <>
                          <div className="mb-6">
                            <h3 className="mb-3 text-xl font-bold leading-tight text-gray-900 sm:text-2xl">
                              <MathText>{currentQuestion.question}</MathText>
                            </h3>
                            <div className="h-1 w-20 bg-linear-to-r from-primary via-primary/80 to-primary/60 rounded-full"></div>
                          </div>

                          {/* Multiple Choice UI */}
                          {currentQuestion.type === "multiple_choice" && (
                            <MultipleChoiceQuestion
                              question={currentQuestion}
                              selectedAnswer={selectedAnswer as string | null}
                              onSelect={handleMultipleChoiceSelect}
                              disabled={isAnswerSubmitted}
                              isSubmitted={isAnswerSubmitted}
                            />
                          )}

                          {/* True/False UI */}
                          {currentQuestion.type === "true_false" && (
                            <TrueFalseQuestion
                              selectedAnswer={selectedAnswer as boolean | null}
                              onSelect={handleTrueFalseSelect}
                              disabled={isAnswerSubmitted}
                              isSubmitted={isAnswerSubmitted}
                              correctAnswer={
                                typeof currentQuestion.answer === "boolean"
                                  ? currentQuestion.answer
                                  : undefined
                              }
                            />
                          )}

                          {/* Submit Button */}
                          {(currentQuestion.type === "multiple_choice" ||
                            currentQuestion.type === "true_false") && (
                              <div className="mt-6">
                                <button
                                  onClick={handleSubmitAnswer}
                                  disabled={
                                    selectedAnswer === null ||
                                    isAnswerSubmitted ||
                                    isSpeaking
                                  }
                                  className={`w-full transform rounded-xl px-4 py-3 text-base font-semibold transition-all duration-200 sm:py-3.5 sm:text-lg ${selectedAnswer !== null &&
                                    !isAnswerSubmitted &&
                                    !isSpeaking
                                    ? "bg-linear-to-r from-primary via-primary/90 to-primary/80 text-white shadow-lg shadow-primary/40 hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/50"
                                    : "bg-gray-300 text-gray-500 cursor-not-allowed opacity-60"
                                    }`}
                                >
                                  {isAnswerSubmitted
                                    ? "Answer Submitted"
                                    : "Submit Answer"}
                                </button>
                              </div>
                            )}

                          {/* Result + explanation after submit — colored by correctness,
                              announced to screen readers, and always visible even if the
                              spoken feedback was missed/muted. */}
                          {isAnswerSubmitted &&
                            (currentQuestion.type === "multiple_choice" ||
                              currentQuestion.type === "true_false") && (
                              <div
                                role="status"
                                aria-live="polite"
                                className={cn(
                                  "mt-8 min-w-0 max-w-full overflow-hidden rounded-r-lg border-l-4 p-4 shadow-sm backdrop-blur-sm",
                                  lastAnswerCorrect
                                    ? "border-green-500 bg-linear-to-br from-green-50 via-green-50/60 to-transparent"
                                    : lastAnswerCorrect === false
                                      ? "border-red-500 bg-linear-to-br from-red-50 via-red-50/60 to-transparent"
                                      : "border-primary bg-linear-to-br from-primary/10 via-primary/5 to-transparent",
                                )}
                              >
                                <div className="flex min-w-0 items-start gap-3">
                                  <div className="mt-0.5 shrink-0">
                                    {lastAnswerCorrect ? (
                                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                                    ) : lastAnswerCorrect === false ? (
                                      <XCircle className="h-5 w-5 text-red-600" />
                                    ) : (
                                      <svg
                                        className="h-5 w-5 text-primary"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                        />
                                      </svg>
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1 overflow-hidden">
                                    <strong
                                      className={cn(
                                        "mb-1 block font-semibold",
                                        lastAnswerCorrect
                                          ? "text-green-800"
                                          : lastAnswerCorrect === false
                                            ? "text-red-800"
                                            : "text-primary",
                                      )}
                                    >
                                      {lastAnswerCorrect
                                        ? "Correct!"
                                        : lastAnswerCorrect === false
                                          ? "Not quite"
                                          : "Hint:"}
                                    </strong>
                                    {currentQuestion.explanation && (
                                      <div className="min-w-0 max-w-full text-sm leading-relaxed text-gray-700 wrap-anywhere">
                                        <MathText>
                                          {currentQuestion.explanation}
                                        </MathText>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                        </>
                      )}
                    </>
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
                    <div className="space-y-6">
                      <div className="mb-6">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                          <span className="text-sm font-medium text-primary/70 uppercase tracking-wide">
                            Lesson in Progress
                          </span>
                        </div>
                        <h2 className="mb-3 text-2xl font-bold leading-tight text-gray-900 sm:text-3xl">
                          {currentLesson.title}
                        </h2>
                        <div className="h-1 w-24 bg-linear-to-r from-primary via-primary/80 to-primary/60 rounded-full"></div>
                      </div>

                      {/* Subtitle Mode - Show when avatar is speaking */}
                      {isShowingSubtitles ? (
                        <div className="flex min-h-[200px] flex-1 items-center justify-center sm:min-h-[260px] lg:min-h-[300px]">
                          <div className="max-w-2xl mx-auto px-6">
                            {/* Subtitle container */}
                            <div className="relative">
                              {/* Speaking indicator */}
                              <div className="flex items-center justify-center gap-2 mb-6">
                                <div className="flex items-center gap-1">
                                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                                </div>
                                <span className="text-sm font-medium text-primary/70">
                                  Your instructor is speaking...
                                </span>
                              </div>

                              {/* Main subtitle text — no key/animation per word update */}
                              <div className="rounded-2xl border-2 border-primary/20 bg-white/80 p-5 shadow-xl backdrop-blur-md sm:p-8">
                                <p className="text-center text-lg font-medium leading-relaxed text-gray-800 sm:text-2xl md:text-3xl">
                                  {currentSubtitle || "…"}
                                </p>
                              </div>

                              {/* Decorative elements */}
                              <div className="absolute -top-4 -left-4 w-8 h-8 bg-primary/20 rounded-full blur-xl"></div>
                              <div className="absolute -bottom-4 -right-4 w-12 h-12 bg-primary/30 rounded-full blur-xl"></div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* Static content - Show when not speaking */
                        <div className="space-y-4">
                          <div className="p-5 bg-white/60 backdrop-blur-sm rounded-xl border border-primary/20 shadow-sm">
                            <div className="flex items-start gap-3 mb-3">
                              <div className="mt-1">
                                <svg
                                  className="w-6 h-6 text-primary"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                                  />
                                </svg>
                              </div>
                              <div className="flex-1">
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                  Overview
                                </h3>
                                <p className="text-gray-700 leading-relaxed">
                                  {currentLesson.body}
                                </p>
                              </div>
                            </div>
                          </div>

                          {currentLesson.avatar_script && (
                            <div className="p-5 bg-linear-to-br from-primary/10 via-primary/5 to-transparent rounded-xl border-l-4 border-primary shadow-sm backdrop-blur-sm">
                              <div className="flex items-start gap-3">
                                <div className="mt-1">
                                  <svg
                                    className="w-6 h-6 text-primary"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                                    />
                                  </svg>
                                </div>
                                <div className="flex-1">
                                  <h3 className="text-lg font-semibold text-primary mb-2">
                                    What You'll Learn
                                  </h3>
                                  <p className="text-gray-700 leading-relaxed">
                                    {currentLesson.avatar_script}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full min-h-[300px]">
                      <div className="text-center max-w-md mx-auto px-6">
                        {/* Animated icon */}
                        <div className="relative inline-flex items-center justify-center mb-6">
                          <div className="absolute h-20 w-20 rounded-full bg-primary/10 animate-ping"></div>
                          <div className="absolute h-16 w-16 rounded-full bg-primary/20 animate-pulse"></div>
                          <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-linear-to-br from-primary to-primary/80 shadow-lg shadow-primary/30">
                            <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                        </div>

                        {/* Welcome text */}
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">
                          {canResume ? "Continue your lesson?" : "Ready to Learn?"}
                        </h2>
                        <p className="text-gray-500 mb-6 leading-relaxed">
                          {canResume && currentLesson
                            ? `Resume “${currentLesson.title}”. Tap below and your instructor will start speaking again.`
                            : "Your learning adventure awaits! Click the button below to begin your lesson and start building amazing things."}
                        </p>

                        {/* Start course — same action as former StartLessonButton; label stays on one line */}
                        <button
                          type="button"
                          onClick={handleStartLesson}
                          className="group mx-auto flex w-full max-w-xs shrink-0 items-center justify-center gap-3 whitespace-nowrap rounded-full bg-linear-to-r from-primary via-primary to-primary/90 px-10 py-4 text-base font-bold tracking-tight text-white shadow-lg shadow-primary/35 ring-2 ring-primary/20 transition-all duration-200 hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/40 active:scale-[0.98] sm:max-w-none sm:px-12"
                        >
                          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/20 ring-1 ring-white/30">
                            <Play className="size-5 fill-white text-white" aria-hidden />
                          </span>
                          <span className="pr-1">
                            {canResume ? "Continue learning" : "Start learning"}
                          </span>
                        </button>

                        {/* Decorative elements */}
                        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-gray-400">
                          <span className="h-1 w-1 rounded-full bg-primary/40"></span>
                          <span>Interactive lessons</span>
                          <span className="h-1 w-1 rounded-full bg-primary/40"></span>
                          <span>Fun quizzes</span>
                          <span className="h-1 w-1 rounded-full bg-primary/40"></span>
                          <span>Hands-on coding</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {!isLgUp && curriculum && (
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

      {/* Fullscreen Overlay */}
      {fullscreen && showCodePanel && !useWebWorkspace && (
        <FullscreenModal
          type={fullscreen}
          code={code}
          results={results}
          onClose={() => setFullscreen(null)}
          onCodeChange={setCode}
        />
      )}
    </div>
  );
}

// ============================================================================
// EXPORT
// ============================================================================

export default function CourseDetail({
  slugOverride,
  onCourseCompleted,
}: {
  slugOverride?: string;
  onCourseCompleted?: () => void;
} = {}) {
  return (
    <CourseDetailInner
      slugOverride={slugOverride}
      onCourseCompleted={onCourseCompleted}
    />
  );
}
