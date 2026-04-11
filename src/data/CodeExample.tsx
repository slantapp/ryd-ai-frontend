import { useRef, useState, useCallback, useEffect } from "react";
import { useParams } from "react-router-dom";
import Split from "react-split";
import NarratorAvatar from "narrator-avatar";
import { Volume2, RotateCcw, Mic, Play } from "lucide-react";
import {
  type Question,
  type Lesson,
  findLessonById,
  getFirstLesson,
  getCurriculumBySlug,
  getModuleInfoForLesson,
  getNextLessonInOrder,
  getPreviousLessonInOrder,
  getModuleIndexForLesson,
  getLessonIndexInCurriculum,
  getLessonByIndex,
} from "../data/curriculumData";
import {
  QuestionInfo,
  CodeEditor,
  TestResults,
  MultipleChoiceQuestion,
  TrueFalseQuestion,
  FullscreenModal,
} from "../components/exercise";
import { useInstructorStore } from "../stores/instructorStore";
import { useCoursesStore } from "../stores/coursesStore";
import { cn } from "../lib/utils";

function useMediaQueryMinLg() {
  const [matches, setMatches] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(min-width: 1024px)").matches
      : false,
  );
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = () => setMatches(mq.matches);
    mq.addEventListener("change", onChange);
    onChange();
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return matches;
}

/** Compact mic + pulses for narrow viewports (avatar hidden; stays in sync with `isSpeaking`). */
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

// Action to perform after speech ends
type PendingAction =
  | { type: "none" }
  | { type: "next_question" }
  | { type: "enable_start_questions" }
  | { type: "enable_next_lesson" }
  | { type: "show_completion" }
  | { type: "ask_question"; question: Question }
  | { type: "clear_code_and_ask"; question: Question }
  | { type: "wait_then_clear_and_ask"; question: Question };

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function CodeExampleInner() {
  const { exercise } = useParams<{ exercise: string }>();
  const { getInstructorConfig } = useInstructorStore();
  const instructorConfig = getInstructorConfig();
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

  // ============================================================================
  // STATE
  // ============================================================================

  // Lesson & Question state
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [lessonStarted, setLessonStarted] = useState(false);

  // UI control state
  const [canStartQuestions, setCanStartQuestions] = useState(false);
  const [canNextLesson, setCanNextLesson] = useState(false);
  const [canPreviousLesson, setCanPreviousLesson] = useState(false);
  const [canPrevious, setCanPrevious] = useState(false); // Can go to previous question OR previous lesson
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Answer state
  const [selectedAnswer, setSelectedAnswer] = useState<string | boolean | null>(
    null
  );
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);

  // Track correct answers for the current lesson
  const [correctAnswersCount, setCorrectAnswersCount] = useState(0);
  const [totalQuestionsAnswered, setTotalQuestionsAnswered] = useState(0);
  // Track correct answers across the current module (for module completion message)
  const [moduleCorrectCount, setModuleCorrectCount] = useState(0);
  const [moduleTotalAnswered, setModuleTotalAnswered] = useState(0);

  // Code editor state
  const [code, setCode] = useState("");
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
  const progressKey = exercise ? `course-progress-${exercise}` : null;
  const isCodeTestQuestion = currentQuestion?.type === "code_test";
  const isLgUp = useMediaQueryMinLg();

  // ============================================================================
  // AVATAR HELPERS
  // ============================================================================

  const getAvatar = useCallback(() => avatarRef.current, []);

  /** Speak immediately; only call when avatar is ready (or from mobile unlock tap = valid gesture). */
  const speakImmediate = useCallback(
    (text: string, action: PendingAction = { type: "none" }) => {
      try {
        const avatar = getAvatar();
        if (avatar && text && typeof avatar.speakText === "function") {
          pendingActionRef.current = action;
          speechStartTimeRef.current = Date.now();
          lastSpeechTextRef.current = text;
          avatar.speakText(text);
        }
      } catch (error) {
        console.warn("Error speaking text:", error);
      }
    },
    [getAvatar]
  );

  const speak = useCallback(
    (text: string, action: PendingAction = { type: "none" }) => {
      try {
        if (!avatarReadyRef.current) {
          pendingSpeechQueueRef.current.push({ text, action });
          return;
        }
        speakImmediate(text, action);
      } catch (error) {
        console.warn("Error speaking text:", error);
      }
    },
    [speakImmediate]
  );

  const flushNextQueuedSpeech = useCallback(() => {
    const q = pendingSpeechQueueRef.current;
    if (q.length === 0) return;
    const next = q.shift()!;
    speakImmediate(next.text, next.action);
  }, [speakImmediate]);

  const handleAvatarReady = useCallback(() => {
    avatarReadyRef.current = true;
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
      setShowMobileAudioUnlock(false);

      const avatar = getAvatar();
      if (avatar && typeof avatar.stopSpeaking === "function") {
        isManuallyStopped.current = true;
        avatar.stopSpeaking();
        pendingActionRef.current = { type: "none" };
        setIsSpeaking(false);
        // Reset manual stop flag after a short delay
        setTimeout(() => {
          isManuallyStopped.current = false;
        }, 300);
      }
    } catch (error) {
      console.warn("Error stopping speech:", error);
      pendingActionRef.current = { type: "none" };
      setIsSpeaking(false);
      pendingSpeechQueueRef.current = [];
      setShowMobileAudioUnlock(false);
    }
  }, [getAvatar, stopSubtitles]);

  // Subtitle comes from NarratorAvatar's onSubtitle callback (real-time spoken word)
  const handleSubtitle = useCallback((text: string) => {
    setCurrentSubtitle(text);
  }, []);

  // ============================================================================
  // CODE EXAMPLE TYPING (for teaching code before questions)
  // ============================================================================

  const typeCodeExample = useCallback(
    (
      codeExample: { code: string; description?: string; explanation?: string },
      question: Question
    ) => {
      // Clear any existing typing
      if (codeTypingTimeoutRef.current) {
        clearTimeout(codeTypingTimeoutRef.current);
        codeTypingTimeoutRef.current = null;
      }

      isTypingCodeRef.current = true;
      setCode("");
      setResults([]);

      const codeToType = codeExample.code;
      const typingSpeed = 30; // ms per character
      let currentIndex = 0;

      // First, speak the description if available
      if (codeExample.description) {
        speak(codeExample.description);
      }

      // Start typing after a short delay (to let speech begin)
      const startTyping = () => {
        const typeNextChar = () => {
          if (!isTypingCodeRef.current) return; // Stop if cancelled

          if (currentIndex < codeToType.length) {
            setCode(codeToType.substring(0, currentIndex + 1));
            currentIndex++;
            codeTypingTimeoutRef.current = setTimeout(
              typeNextChar,
              typingSpeed
            );
          } else {
            // Typing complete
            isTypingCodeRef.current = false;
            console.log("Typing complete", codeExample);

            // After typing, speak the explanation if available
            // The explanation teaches what the code does - student sees code while listening
            if (codeExample.explanation) {
              // Wait a moment for the code to be fully visible before explaining
              setTimeout(() => {
                // Speak the explanation - when done, we'll wait a bit, then clear and ask
                speak(codeExample.explanation!, {
                  type: "wait_then_clear_and_ask",
                  question,
                });
              }, 800);
            } else {
              // No explanation, just announce we're clearing and ask the question
              setTimeout(() => {
                speak(
                  "Now it's your turn! I've cleared the example. Try solving the problem yourself.",
                  { type: "clear_code_and_ask", question }
                );
              }, 1500);
            }
          }
        };

        codeTypingTimeoutRef.current = setTimeout(typeNextChar, 500);
      };

      // Start typing after description speech delay (estimate)
      const descriptionDelay = codeExample.description
        ? Math.max(
          2000,
          (codeExample.description.split(/\s+/).length / 2.5) * 1000
        )
        : 500;

      setTimeout(startTyping, descriptionDelay);
    },
    [speak]
  );

  const stopCodeTyping = useCallback(() => {
    isTypingCodeRef.current = false;
    if (codeTypingTimeoutRef.current) {
      clearTimeout(codeTypingTimeoutRef.current);
      codeTypingTimeoutRef.current = null;
    }
  }, []);

  // ============================================================================
  // PROGRESS HELPERS
  // ============================================================================

  const loadProgress = useCallback((): CourseProgress | null => {
    if (!progressKey) return null;
    try {
      const saved = localStorage.getItem(progressKey);
      if (saved) {
        const raw = JSON.parse(saved) as Partial<CourseProgress> & {
          lastUpdated?: number;
        };
        // Only expire if lastUpdated exists and is older than 30 days (backwards compatible with old saves)
        const lastUpdated = raw.lastUpdated;
        if (typeof lastUpdated === "number") {
          const daysSinceUpdate =
            (Date.now() - lastUpdated) / (1000 * 60 * 60 * 24);
          if (daysSinceUpdate >= 30) return null;
        }
        return {
          lessonId: raw.lessonId ?? null,
          lessonIndex: typeof raw.lessonIndex === "number" ? raw.lessonIndex : undefined,
          questionIndex: typeof raw.questionIndex === "number" ? raw.questionIndex : 0,
          lessonStarted: raw.lessonStarted ?? false,
          canStartQuestions: raw.canStartQuestions ?? false,
          lastUpdated: typeof raw.lastUpdated === "number" ? raw.lastUpdated : 0,
        };
      }
    } catch (error) {
      console.warn("Failed to load course progress:", error);
    }
    return null;
  }, [progressKey]);

  const saveProgress = useCallback(
    (progress: Partial<CourseProgress>) => {
      if (!progressKey) return;
      try {
        const current = loadProgress();
        const updated: CourseProgress = {
          lessonId: progress.lessonId ?? current?.lessonId ?? null,
          lessonIndex: progress.lessonIndex ?? current?.lessonIndex,
          questionIndex: progress.questionIndex ?? current?.questionIndex ?? 0,
          lessonStarted:
            progress.lessonStarted ?? current?.lessonStarted ?? false,
          canStartQuestions:
            progress.canStartQuestions ?? current?.canStartQuestions ?? false,
          lastUpdated: Date.now(),
        };
        localStorage.setItem(progressKey, JSON.stringify(updated));
      } catch (error) {
        console.warn("Failed to save course progress:", error);
      }
    },
    [progressKey, loadProgress]
  );

  const calculateProgress = useCallback(
    (
      lessonIndex: number,
      totalLessons: number,
      hasStarted: boolean
    ): number => {
      if (totalLessons === 0) return 0;
      if (lessonIndex < 0 || lessonIndex >= totalLessons) return 0;

      // When on the last lesson and started, treat as 100% so status can become "completed"
      if (hasStarted && lessonIndex === totalLessons - 1) return 100;

      const progress = hasStarted
        ? Math.round(((lessonIndex + 0.5) / totalLessons) * 100)
        : Math.round((lessonIndex / totalLessons) * 100);

      return Math.min(100, Math.max(0, progress));
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
  }, []);

  // Ref to hold the moveToNextQuestion function to avoid circular dependency
  const moveToNextQuestionRef = useRef<() => void>(() => { });

  // Internal handler that executes the pending action after speech
  const handleSpeechEndInternal = useCallback(() => {
    setIsSpeaking(false);

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
        setCanStartQuestions(true);
        break;
      case "enable_next_lesson":
        setCanNextLesson(true);
        break;
      case "show_completion":
        // Just shows completion message, no further action needed
        break;
      case "ask_question":
        // Just speak the question (used after code example for non-code questions)
        setTimeout(() => {
          speak(action.question.question);
        }, 300);
        break;
      case "clear_code_and_ask":
        // Clear the code and then ask the question
        setCode("");
        setResults([]);
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
      default:
        break;
    }

    // Continue any speech queued before avatar was ready (multi-chunk flush)
    flushNextQueuedSpeech();
  }, [speak, stopSubtitles, flushNextQueuedSpeech]);

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
      setSelectedAnswer(null);
      setIsAnswerSubmitted(false);
      setCode("");
      setResults([]);

      saveProgress({
        lessonId: currentLesson.id,
        lessonIndex: curriculum ? getLessonIndexInCurriculum(currentLesson, curriculum) : undefined,
        questionIndex: nextIndex,
        lessonStarted: true,
        canStartQuestions: false,
      });

      // Keep Previous enabled when advancing questions on a non-first lesson
      const hasPrevLesson = curriculum ? !!getPreviousLessonInOrder(currentLesson, curriculum) : false;
      setCanPreviousLesson(hasPrevLesson);
      // Enable Previous button - we can always go back since nextIndex > 0
      setCanPrevious(true);

      // Check if this is a code_test question with a code example to teach first
      if (nextQuestion.type === "code_test" && nextQuestion.code_example) {
        // Teach the code example first, then ask the question
        typeCodeExample(nextQuestion.code_example, nextQuestion);
      } else {
        // For non-code questions or code questions without examples, just ask
        speak(nextQuestion.question);
      }
    } else {
      // All questions completed - enable next lesson
      setCurrentQuestion(null);

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

      let completionMessage = "";
      if (isLastLessonInModule) {
        // Module completion: lesson summary + module totals
        completionMessage = `Congratulations! You've completed this module. ${lessonSummary}${lessonScore}`;
        if (newModuleTotal > 0) {
          completionMessage += ` Across all lessons in this module, you answered ${newModuleCorrect} out of ${newModuleTotal} questions correctly.`;
        }
        if (currentLesson.next_lesson_id) {
          completionMessage += " Click 'Next Lesson' to continue.";
        }
      } else {
        // Lesson completion (more lessons in module): lesson summary + prompt
        completionMessage = `Great job! ${lessonSummary}${lessonScore} Click 'Next Lesson' to continue.`;
      }

      // Enable Next/Previous lesson buttons (Next blocked by isSpeaking until speech completes)
      if (curriculum) {
        if (getNextLessonInOrder(currentLesson, curriculum)) {
          setCanNextLesson(true);
        }
        if (getPreviousLessonInOrder(currentLesson, curriculum)) {
          setCanPreviousLesson(true);
        }
      }

      // Persist "lesson completed" state so returning users see completion screen, not first lesson
      saveProgress({
        lessonId: currentLesson.id,
        lessonIndex: curriculum ? getLessonIndexInCurriculum(currentLesson, curriculum) : undefined,
        questionIndex: totalQuestions,
        lessonStarted: true,
        canStartQuestions: false,
      });

      // Delay speech to allow React to re-render and mount the correct avatar
      setTimeout(() => {
        if (currentLesson.next_lesson_id) {
          speak(completionMessage, { type: "enable_next_lesson" });
        } else {
          speak(completionMessage, { type: "show_completion" });
        }

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
    saveProgress,
    speak,
    stopCodeTyping,
    typeCodeExample,
  ]);

  // Keep ref updated with latest function
  useEffect(() => {
    moveToNextQuestionRef.current = moveToNextQuestion;
  }, [moveToNextQuestion]);

  // ============================================================================
  // LESSON FLOW HANDLERS
  // ============================================================================

  const speakLessonContent = useCallback(
    (lesson: Lesson, onComplete: () => void) => {
      // Combine all lesson content into one speech
      const parts: string[] = [];

      // Add a teacher-like introduction with the lesson title
      const intro = `Welcome! In this lesson, you will be learning about ${lesson.title}.`;
      parts.push(intro);

      if (lesson.body) parts.push(lesson.body);
      if (lesson.avatar_script) parts.push(lesson.avatar_script);
      if (lesson.code_example?.description)
        parts.push(lesson.code_example.description);

      const fullText = parts.join(" ");

      if (fullText) {
        // Set pending action based on what happens after lesson content
        const hasQuestions = lesson.questions && lesson.questions.length > 0;
        const action: PendingAction = hasQuestions
          ? { type: "enable_start_questions" }
          : lesson.next_lesson_id
            ? { type: "enable_next_lesson" }
            : { type: "show_completion" };

        // Add transition message
        let finalText = fullText;
        if (hasQuestions) {
          finalText +=
            " Great! Now let's test your understanding with some questions. Click 'Start Questions' when you're ready.";
        } else if (lesson.next_lesson_id) {
          finalText +=
            " You've completed this lesson! Click 'Next Lesson' to continue.";
        } else {
          finalText +=
            " Congratulations! You've completed all lessons in this module.";
        }

        speak(finalText, action);
      } else {
        onComplete();
      }
    },
    [speak]
  );

  const handleStartLesson = useCallback(() => {
    if (!curriculum) return;

    const firstLesson = getFirstLesson(curriculum);
    if (!firstLesson) return;

    setCurrentLesson(firstLesson);
    setCurrentQuestion(null);
    setCurrentQuestionIndex(0);
    setCanStartQuestions(false);
    setCanNextLesson(false);
    setLessonStarted(true);

    // Reset answer tracking for new lesson and module (starting fresh)
    setCorrectAnswersCount(0);
    setTotalQuestionsAnswered(0);
    setModuleCorrectCount(0);
    setModuleTotalAnswered(0);

    saveProgress({
      lessonId: firstLesson.id,
      lessonIndex: curriculum ? getLessonIndexInCurriculum(firstLesson, curriculum) : undefined,
      questionIndex: 0,
      lessonStarted: true,
      canStartQuestions: false,
    });

    speakLessonContent(firstLesson, () => {
      if (firstLesson.questions?.length) {
        setCanStartQuestions(true);
      }
      // First lesson has no previous, but check for next
      if (getNextLessonInOrder(firstLesson, curriculum)) {
        setCanNextLesson(true);
      }
    });
  }, [curriculum, saveProgress, speakLessonContent]);

  const handleRestartCourse = useCallback(() => {
    if (!exercise || !curriculum || !progressKey) return;
    stopSpeaking();
    localStorage.removeItem(progressKey);
    updateCourseProgress(exercise, {
      status: "not-started",
      progress: 0,
      currentLessonId: null,
      completedLessons: [],
    });
    setCurrentLesson(null);
    setCurrentQuestion(null);
    setCurrentQuestionIndex(0);
    setLessonStarted(false);
    setCanStartQuestions(false);
    setCanNextLesson(false);
    setCanPreviousLesson(false);
    setCanPrevious(false);
    setCode("");
    setResults([]);
    setCorrectAnswersCount(0);
    setTotalQuestionsAnswered(0);
    setModuleCorrectCount(0);
    setModuleTotalAnswered(0);
  }, [exercise, curriculum, progressKey, updateCourseProgress, stopSpeaking]);

  const handlePreviousLesson = useCallback(() => {
    if (!currentLesson || !curriculum) return;

    stopSpeaking();

    // Resolve previous lesson by position in curriculum
    const prevLesson = getPreviousLessonInOrder(currentLesson, curriculum);
    if (!prevLesson) return;

    // Determine if we're moving to a different module
    const currentModIndex = getModuleIndexForLesson(currentLesson, curriculum);
    const prevModIndex = getModuleIndexForLesson(prevLesson, curriculum);
    const movingToNewModule = currentModIndex !== -1 && prevModIndex !== -1 && currentModIndex !== prevModIndex;

    setCurrentLesson(prevLesson);
    setCurrentQuestion(null);
    setCurrentQuestionIndex(0);
    setCanStartQuestions(false);
    setCanNextLesson(false);
    setCanPreviousLesson(false);
    setCanPrevious(false);
    setCode("");
    setResults([]);

    // Reset answer tracking for new lesson
    setCorrectAnswersCount(0);
    setTotalQuestionsAnswered(0);
    if (movingToNewModule) {
      setModuleCorrectCount(0);
      setModuleTotalAnswered(0);
    }

    saveProgress({
      lessonId: prevLesson.id,
      lessonIndex: curriculum ? getLessonIndexInCurriculum(prevLesson, curriculum) : undefined,
      questionIndex: 0,
      lessonStarted: true,
      canStartQuestions: false,
    });

    speakLessonContent(prevLesson, () => {
      if (prevLesson.questions?.length) {
        setCanStartQuestions(true);
      }
      // Enable previous lesson/question button if there's a lesson before this one
      const hasPrevLesson = !!getPreviousLessonInOrder(prevLesson, curriculum);
      setCanPreviousLesson(hasPrevLesson);
      setCanPrevious(hasPrevLesson); // At lesson start (no questions yet), can only go to prev lesson
      // Enable next lesson button if there's a lesson after this one
      if (getNextLessonInOrder(prevLesson, curriculum)) {
        setCanNextLesson(true);
      }
    });
  }, [
    currentLesson,
    curriculum,
    saveProgress,
    speakLessonContent,
    stopSpeaking,
  ]);

  const handlePreviousQuestion = useCallback(() => {
    if (!currentLesson?.questions || currentQuestionIndex <= 0) return;

    stopSpeaking();
    stopCodeTyping();

    const prevIndex = currentQuestionIndex - 1;
    const prevQuestion = currentLesson.questions[prevIndex];

    setCurrentQuestion(prevQuestion);
    setCurrentQuestionIndex(prevIndex);
    setSelectedAnswer(null);
    setIsAnswerSubmitted(false);
    setCode("");
    setResults([]);

    saveProgress({
      lessonId: currentLesson.id,
      lessonIndex: curriculum ? getLessonIndexInCurriculum(currentLesson, curriculum) : undefined,
      questionIndex: prevIndex,
      lessonStarted: true,
      canStartQuestions: false,
    });

    // Update canPrevious based on whether there's still a previous question or lesson
    const hasPrevQuestion = prevIndex > 0;
    const hasPrevLesson = curriculum ? !!getPreviousLessonInOrder(currentLesson, curriculum) : false;
    setCanPrevious(hasPrevQuestion || hasPrevLesson);

    // Check if this is a code_test question with a code example to teach first
    if (prevQuestion.type === "code_test" && prevQuestion.code_example) {
      typeCodeExample(prevQuestion.code_example, prevQuestion);
    } else {
      speak(prevQuestion.question);
    }
  }, [
    currentLesson,
    currentQuestionIndex,
    curriculum,
    saveProgress,
    speak,
    stopSpeaking,
    stopCodeTyping,
    typeCodeExample,
  ]);

  const handlePrevious = useCallback(() => {
    if (!canPrevious || isSpeaking) return;

    // If we have a current question and it's not the first one, go to previous question
    if (currentQuestion && currentQuestionIndex > 0) {
      handlePreviousQuestion();
    } else if (canPreviousLesson) {
      // Otherwise, go to previous lesson
      handlePreviousLesson();
    }
  }, [
    canPrevious,
    isSpeaking,
    currentQuestion,
    currentQuestionIndex,
    canPreviousLesson,
    handlePreviousQuestion,
    handlePreviousLesson,
  ]);

  const handleStartQuestions = useCallback(() => {
    if (!canStartQuestions || !currentLesson?.questions?.length) return;

    stopSpeaking();
    stopCodeTyping();
    setCanStartQuestions(false);

    const question = currentLesson.questions[0];
    setCurrentQuestion(question);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setIsAnswerSubmitted(false);
    setCode("");
    setResults([]);

    // Reset answer tracking when starting questions
    setCorrectAnswersCount(0);
    setTotalQuestionsAnswered(0);

    saveProgress({
      lessonId: currentLesson.id,
      lessonIndex: curriculum ? getLessonIndexInCurriculum(currentLesson, curriculum) : undefined,
      questionIndex: 0,
      lessonStarted: true,
      canStartQuestions: false,
    });

    // Enable Previous whenever we have a previous lesson (regardless of completion)
    // At question index 0, we can only go to previous lesson
    const hasPrevLesson = curriculum ? !!getPreviousLessonInOrder(currentLesson, curriculum) : false;
    setCanPreviousLesson(hasPrevLesson);
    setCanPrevious(hasPrevLesson); // At first question, can only go to prev lesson

    // Check if this is a code_test question with a code example to teach first
    if (question.type === "code_test" && question.code_example) {
      // Teach the code example first, then ask the question
      typeCodeExample(question.code_example, question);
    } else {
      // For non-code questions or code questions without examples, just ask
      speak(question.question);
    }
  }, [
    canStartQuestions,
    currentLesson,
    curriculum,
    saveProgress,
    speak,
    stopSpeaking,
    stopCodeTyping,
    typeCodeExample,
  ]);

  const handleNextLesson = useCallback(() => {
    if (!canNextLesson || !currentLesson || !curriculum) return;

    stopSpeaking();
    setCanNextLesson(false);

    // Resolve next lesson by position in curriculum (not by ID) so we don't jump to wrong module
    // when lesson IDs are reused across modules (e.g. css_lesson_01 in each module).
    const nextLesson = getNextLessonInOrder(currentLesson, curriculum);
    if (!nextLesson) return;

    // Reset module stats when moving to a new module (different module index)
    const currentModIndex = getModuleIndexForLesson(currentLesson, curriculum);
    const nextModIndex = getModuleIndexForLesson(nextLesson, curriculum);
    const movingToNewModule = currentModIndex !== -1 && nextModIndex !== -1 && currentModIndex !== nextModIndex;

    setCurrentLesson(nextLesson);
    setCurrentQuestion(null);
    setCurrentQuestionIndex(0);
    setCanStartQuestions(false);
    setCanNextLesson(false);
    setCanPreviousLesson(false);
    setCanPrevious(false);
    setCode("");
    setResults([]);

    // Reset answer tracking for new lesson
    setCorrectAnswersCount(0);
    setTotalQuestionsAnswered(0);
    if (movingToNewModule) {
      setModuleCorrectCount(0);
      setModuleTotalAnswered(0);
    }

    saveProgress({
      lessonId: nextLesson.id,
      lessonIndex: curriculum ? getLessonIndexInCurriculum(nextLesson, curriculum) : undefined,
      questionIndex: 0,
      lessonStarted: true,
      canStartQuestions: false,
    });

    speakLessonContent(nextLesson, () => {
      if (nextLesson.questions?.length) {
        setCanStartQuestions(true);
      }
      // Enable previous lesson/question button if there's a lesson before this one
      const hasPrevLesson = !!getPreviousLessonInOrder(nextLesson, curriculum);
      setCanPreviousLesson(hasPrevLesson);
      setCanPrevious(hasPrevLesson); // At lesson start (no questions yet), can only go to prev lesson
      // Enable next lesson button if there's a lesson after this one
      if (getNextLessonInOrder(nextLesson, curriculum)) {
        setCanNextLesson(true);
      }
    });
  }, [
    canNextLesson,
    currentLesson,
    curriculum,
    saveProgress,
    speakLessonContent,
    stopSpeaking,
  ]);

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

  /** Run code without checking the answer – e.g. during explanation or when code is cleared. Just executes and shows success/error. */
  const handleRunCodeTryOut = useCallback(() => {
    try {
      eval(code || "");
      setResults(["✓ Code ran successfully."]);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      setResults([`⚠️ Error: ${msg}`]);
    }
  }, [code]);

  /** Deep equality for test results - handles primitives, arrays, and objects */
  const valuesEqual = useCallback((a: unknown, b: unknown): boolean => {
    if (a === b) return true;
    if (a === null || b === null) return a === b;
    if (typeof a === "number" && typeof b === "number" && Number.isNaN(a) && Number.isNaN(b))
      return true;
    if (typeof a === "object" && typeof b === "object")
      return JSON.stringify(a) === JSON.stringify(b);
    return false;
  }, []);

  const handleCodeTest = useCallback(() => {
    if (!currentQuestion || currentQuestion.type !== "code_test") return;

    let passed = false;
    const testResults: Array<{
      test: string;
      passed: boolean;
      actual?: unknown;
      expected?: unknown;
    }> = [];

    try {
      const criteria = currentQuestion.testCriteria;

      if (criteria?.expectedVariable && criteria.expectedValues) {
        const testCode = `${code}; Array.isArray(${criteria.expectedVariable})`;
        const isArray = eval(testCode) as boolean;
        if (isArray) {
          const actualArray = eval(`${code}; ${criteria.expectedVariable}`);
          passed =
            JSON.stringify(actualArray) ===
            JSON.stringify(criteria.expectedValues);
          testResults.push({
            test: `Array '${criteria.expectedVariable}' matches expected values`,
            passed,
            actual: actualArray,
            expected: criteria.expectedValues,
          });
        }
      } else if (criteria?.expectedVariable) {
        const varExists = eval(
          `${code}; typeof ${criteria.expectedVariable} !== 'undefined'`
        ) as boolean;
        if (varExists && criteria.expectedValue !== undefined) {
          const actualValue = eval(`${code}; ${criteria.expectedVariable}`);
          passed = valuesEqual(actualValue, criteria.expectedValue);
          testResults.push({
            test: `Variable '${criteria.expectedVariable}' has value '${criteria.expectedValue}'`,
            passed,
            actual: actualValue,
            expected: criteria.expectedValue,
          });
        } else {
          passed = varExists;
          testResults.push({
            test: `Variable '${criteria.expectedVariable}' exists`,
            passed,
          });
        }
      } else if (criteria?.expectedHTML) {
        const normalizedExpected = criteria.expectedHTML
          .toLowerCase()
          .replace(/\s+/g, " ")
          .replace(/'/g, '"')
          .trim();
        const normalizedCode = code
          .toLowerCase()
          .replace(/\s+/g, " ")
          .replace(/'/g, '"')
          .trim();
        passed = normalizedCode.includes(normalizedExpected);
        testResults.push({
          test: `Code contains expected HTML: ${criteria.expectedHTML}`,
          passed,
          actual: code.trim() || "(empty)",
          expected: criteria.expectedHTML,
        });
      } else if (criteria?.expectedCSS) {
        const normalizedExpected = criteria.expectedCSS
          .toLowerCase()
          .replace(/\s+/g, " ")
          .replace(/'/g, '"')
          .trim();
        const normalizedCode = code
          .toLowerCase()
          .replace(/\s+/g, " ")
          .replace(/'/g, '"')
          .trim();
        passed = normalizedCode.includes(normalizedExpected);
        testResults.push({
          test: `Code contains expected CSS: ${criteria.expectedCSS}`,
          passed,
          actual: code.trim() || "(empty)",
          expected: criteria.expectedCSS,
        });
      } else if (criteria?.expectedFunction) {
        const funcExists = eval(
          `${code}; typeof ${criteria.expectedFunction} === 'function'`
        ) as boolean;
        if (!funcExists) {
          testResults.push({
            test: `Function '${criteria.expectedFunction}' exists`,
            passed: false,
          });
        } else if (criteria.testCases?.length) {
          passed = true;
          criteria.testCases.forEach((testCase, index) => {
            try {
              const funcCall = `${criteria.expectedFunction}(${testCase.input
                .map((v: unknown) =>
                  typeof v === "string" ? `"${v}"` : String(v)
                )
                .join(", ")})`;
              const actualResult = eval(`${code}; ${funcCall}`);
              const testPassed = valuesEqual(actualResult, testCase.expected);
              passed = passed && testPassed;
              testResults.push({
                test: `Test case ${index + 1}: ${funcCall} === ${JSON.stringify(
                  testCase.expected
                )}`,
                passed: testPassed,
                actual: actualResult,
                expected: testCase.expected,
              });
            } catch {
              passed = false;
              testResults.push({
                test: `Test case ${index + 1}: Execution error`,
                passed: false,
              });
            }
          });
        } else {
          passed = true;
          testResults.push({
            test: `Function '${criteria.expectedFunction}' exists`,
            passed: true,
          });
        }
      }

      if (testResults.length === 0) {
        testResults.push({ test: "Code test execution", passed: false });
        passed = false;
      }

      const displayResults = testResults.map((r) =>
        r.passed
          ? `✅ PASS: ${r.test}`
          : `❌ FAIL: ${r.test}${r.actual !== undefined
            ? ` (got: ${JSON.stringify(
              r.actual
            )}, expected: ${JSON.stringify(r.expected)})`
            : ""
          }`
      );

      setResults(displayResults);

      const passedCount = testResults.filter((r) => r.passed).length;
      const totalCount = testResults.length;
      const feedbackText = passed
        ? `Excellent! You passed this coding test. ${passedCount} out of ${totalCount} tests correct. ${currentQuestion.explanation || ""}`
        : `You failed this coding test. ${passedCount} out of ${totalCount} tests passed. ${currentQuestion.explanation || ""}`;

      // Track the answer result (code test is considered correct if all tests passed)
      setTotalQuestionsAnswered((prev) => prev + 1);
      if (passed) {
        setCorrectAnswersCount((prev) => prev + 1);
      }

      speak(feedbackText, { type: "next_question" });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      setResults([`⚠️ Error: ${errorMessage}`]);

      // Track the answer result (code test with error is considered incorrect)
      setTotalQuestionsAnswered((prev) => prev + 1);

      speak(`There was an error running your code: ${errorMessage}`, {
        type: "next_question",
      });
    }
  }, [currentQuestion, code, speak, valuesEqual]);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Track last exercise we restored for (so we re-run when switching courses)
  const lastRestoredExerciseRef = useRef<string | null>(null);

  // Load saved progress on mount and when switching to a different course
  useEffect(() => {
    if (!curriculum || !exercise) return;
    // Re-run when exercise (course slug) changes so we load the right course's progress
    if (lastRestoredExerciseRef.current === exercise) return;
    lastRestoredExerciseRef.current = exercise;

    const saved = loadProgress();
    // Prefer lessonIndex (position in curriculum) so we restore the correct lesson when IDs repeat across modules
    const lesson =
      typeof saved?.lessonIndex === "number"
        ? getLessonByIndex(saved.lessonIndex, curriculum)
        : saved?.lessonId
          ? findLessonById(saved.lessonId, curriculum)
          : null;
    if (lesson && saved) {
      setCurrentLesson(lesson);
      setCurrentQuestionIndex(saved.questionIndex ?? 0);
      setLessonStarted(saved.lessonStarted ?? false);
      setCanStartQuestions(saved.canStartQuestions ?? false);

      const questionCount = lesson.questions?.length ?? 0;
      const allQuestionsDone = questionCount > 0 && (saved.questionIndex ?? 0) >= questionCount;

      const hasPrevLesson = !!getPreviousLessonInOrder(lesson, curriculum);
      const questionIndex = saved.questionIndex ?? 0;

      if (allQuestionsDone) {
        // Restore "lesson completed" state: no current question, enable Next/Previous Lesson
        setCurrentQuestion(null);
        if (getNextLessonInOrder(lesson, curriculum)) {
          setCanNextLesson(true);
        }
        setCanPreviousLesson(hasPrevLesson);
        setCanPrevious(hasPrevLesson); // No current question, can only go to prev lesson
      } else if (
        questionIndex >= 0 &&
        lesson.questions?.[questionIndex]
      ) {
        setCurrentQuestion(lesson.questions[questionIndex]);
        // Enable Previous when restoring to lesson mid-flow
        setCanPreviousLesson(hasPrevLesson);
        // Can go to previous question if not on first question, or to previous lesson
        setCanPrevious(questionIndex > 0 || hasPrevLesson);
      } else {
        // Restored at start of lesson (no current question yet) - enable Previous if applicable
        setCanPreviousLesson(hasPrevLesson);
        setCanPrevious(hasPrevLesson);
      }
    }
  }, [curriculum, exercise, loadProgress]);

  // Keep Previous/Next lesson buttons in sync whenever we're on a lesson.
  // Previous: enabled whenever there's a previous question OR previous lesson.
  // Next: enabled by enable_next_lesson or when lesson has no questions.
  useEffect(() => {
    if (!currentLesson || !curriculum || !lessonStarted) return;
    const hasPrevLesson = !!getPreviousLessonInOrder(currentLesson, curriculum);
    const hasPrevQuestion = currentQuestionIndex > 0;
    // Previous is only disabled when on the first question of the first lesson
    setCanPreviousLesson(hasPrevLesson);
    setCanPrevious(hasPrevQuestion || hasPrevLesson);
    // canNextLesson is set by handleSpeechEnd (enable_next_lesson) or moveToNextQuestion (completion)
    // so we only update it when lesson has no questions - otherwise user must complete first
    if (!currentLesson.questions?.length && getNextLessonInOrder(currentLesson, curriculum)) {
      setCanNextLesson(true);
    }
  }, [currentLesson, curriculum, lessonStarted, currentQuestionIndex]);

  // Avatar remounts when layout or code-test mode changes — reset readiness until onReady fires again.
  useEffect(() => {
    avatarReadyRef.current = false;
    pendingSpeechQueueRef.current = [];
    setShowMobileAudioUnlock(false);
  }, [exercise, isLgUp, isCodeTestQuestion]);

  // Sync progress to store when lesson changes
  useEffect(() => {
    if (!currentLesson || !exercise || !curriculum) return;

    const allLessons: Lesson[] = [];
    curriculum.modules.forEach((m) => allLessons.push(...m.lessons));
    if (allLessons.length === 0) return;

    // Use lesson index in curriculum (not lesson ID) so progress is correct when IDs repeat across modules
    const currentIndex = getLessonIndexInCurriculum(currentLesson, curriculum);
    if (currentIndex < 0) return;

    const progress = calculateProgress(
      currentIndex,
      allLessons.length,
      lessonStarted
    );

    const isLastLesson = currentIndex === allLessons.length - 1;

    const status: "not-started" | "ongoing" | "completed" = !lessonStarted
      ? "not-started"
      : isLastLesson && !currentLesson.next_lesson_id && progress >= 100
        ? "completed"
        : "ongoing";

    updateCourseProgress(exercise, {
      status,
      progress,
      currentLessonId: currentLesson.id,
      completedLessons: [],
    });
  }, [
    currentLesson,
    lessonStarted,
    exercise,
    curriculum,
    calculateProgress,
    updateCourseProgress,
  ]);

  // Cleanup on unmount - stop any ongoing speech and code typing
  useEffect(() => {
    const avatarInstance = avatarRef.current;

    return () => {
      isTypingCodeRef.current = false;
      if (codeTypingTimeoutRef.current) {
        clearTimeout(codeTypingTimeoutRef.current);
        codeTypingTimeoutRef.current = null;
      }

      try {
        if (
          avatarInstance &&
          typeof avatarInstance.stopSpeaking === "function"
        ) {
          avatarInstance.stopSpeaking();
        }
      } catch {
        // Ignore cleanup errors - avatar may already be destroyed
      }
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
      {lessonStarted && (
        <div className="mb-4 rounded-2xl border border-primary/10 bg-white/60 p-3 shadow-sm backdrop-blur sm:p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">
                Lesson Controls
              </p>
              <p className="text-xs text-gray-500 sm:text-sm">
                Navigate through lessons and modules.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <button
              type="button"
              onClick={handlePrevious}
              disabled={!canPrevious || isSpeaking}
              className={`rounded-xl px-2 py-2 text-xs font-semibold transition-colors sm:px-3 sm:text-sm ${canPrevious && !isSpeaking
                ? "bg-red-500 text-white shadow hover:bg-red-600"
                : "cursor-not-allowed bg-gray-200 text-gray-500"
                }`}
            >
              Previous
            </button>
            <button
              type="button"
              onClick={handleStartQuestions}
              disabled={!canStartQuestions || isSpeaking}
              className={`rounded-xl px-2 py-2 text-xs font-semibold transition-colors sm:px-3 sm:text-sm ${canStartQuestions && !isSpeaking
                ? "bg-primary text-white shadow hover:bg-primary/90"
                : "cursor-not-allowed bg-gray-200 text-gray-500"
                }`}
            >
              Start
            </button>
            <button
              type="button"
              onClick={handleNextLesson}
              disabled={!canNextLesson || isSpeaking}
              className={`rounded-xl px-2 py-2 text-xs font-semibold transition-colors sm:px-3 sm:text-sm ${canNextLesson && !isSpeaking
                ? "bg-green-500 text-white shadow hover:bg-green-600"
                : "cursor-not-allowed bg-gray-200 text-gray-500"
                }`}
            >
              Next
            </button>
          </div>
          {isCourseCompleted && (
            <button
              type="button"
              onClick={handleRestartCourse}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold bg-amber-500 text-white shadow transition-colors hover:bg-amber-600"
            >
              <RotateCcw className="h-4 w-4" />
              Restart course
            </button>
          )}
        </div>
      )}

      {currentQuestion?.type === "code_test" && (
        <QuestionInfo question={currentQuestion} />
      )}

      {isCodeTestQuestion && (
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
              {lessonChromePanel}

              {!isCodeTestQuestion && curriculum && (
                <div className="mt-4 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                  <div className="flex justify-start items-center w-full h-full min-h-0 min-w-0">
                    <NarratorAvatar
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

              {isCodeTestQuestion && curriculum && (
                <div className="pointer-events-none invisible absolute inset-0">
                  <NarratorAvatar
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
                      isSpeaking
                        ? currentSubtitle || "Speaking…"
                        : "Ready when you are"
                    }
                  >
                    {isSpeaking
                      ? currentSubtitle || "Speaking…"
                      : "Ready when you are"}
                  </p>
                </div>
              </div>
              {/* Mobile WebKit: first speech after avatar loads must run inside a tap (see handleAvatarReady). */}
              {showMobileAudioUnlock && (
                <div className="border-t border-primary/15 bg-linear-to-b from-primary/10 to-primary/5 px-3 py-3">
                  <p className="mb-2.5 text-center text-[0.7rem] leading-snug text-gray-600 sm:text-xs">
                    Your phone needs one tap to allow instructor voice. This is normal on Safari and Chrome mobile.
                  </p>
                  <button
                    type="button"
                    onClick={handleMobileAudioUnlock}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-md transition-colors hover:bg-primary/90 active:scale-[0.99]"
                  >
                    <Volume2 className="h-5 w-5 shrink-0" aria-hidden />
                    <span className="whitespace-nowrap">Tap to start voice</span>
                  </button>
                </div>
              )}
              {/* Lesson controls / code question info — hidden until lesson starts (start lives in main content) */}
              {(lessonStarted || currentQuestion?.type === "code_test") && (
                <div className="px-3 pb-3">
                  {lessonChromePanel}
                </div>
              )}
            </div>
          )}

          <div className="scrollbar-hide flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
            {isCodeTestQuestion ? (
              <div className="flex flex-col min-h-0 h-full flex-1 w-full">
                <Split
                  direction="vertical"
                  className="flex flex-col h-full w-full"
                  sizes={[35, 65]}
                  minSize={100}
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
                    onTestCode={handleCodeTest}
                    onTryOut={handleRunCodeTryOut}
                    onToggleFullscreen={() =>
                      setFullscreen(fullscreen === "editor" ? null : "editor")
                    }
                    isFullscreen={fullscreen === "editor"}
                    canTest={
                      !!currentQuestion &&
                      currentQuestion.type === "code_test"
                    }
                    canSubmit={
                      !!currentQuestion &&
                      currentQuestion.type === "code_test" &&
                      !!code.trim() &&
                      !isSpeaking
                    }
                  />
                  <TestResults
                    results={results}
                    code={code}
                    onToggleFullscreen={() =>
                      setFullscreen(fullscreen === "results" ? null : "results")
                    }
                    isFullscreen={fullscreen === "results"}
                  />
                </Split>
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
                      <div className="mb-6">
                        <h3 className="mb-3 text-xl font-bold leading-tight text-gray-900 sm:text-2xl">
                          {currentQuestion.question}
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
                        />
                      )}

                      {/* True/False UI */}
                      {currentQuestion.type === "true_false" && (
                        <TrueFalseQuestion
                          selectedAnswer={selectedAnswer as boolean | null}
                          onSelect={handleTrueFalseSelect}
                          disabled={isAnswerSubmitted}
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
                              className={`w-full py-3 px-6 rounded-xl font-semibold text-lg transition-all duration-200 transform ${selectedAnswer !== null &&
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

                      {/* Hint */}
                      {currentQuestion.explanation && (
                        <div className="mt-8 p-4 bg-linear-to-br from-primary/10 via-primary/5 to-transparent border-l-4 border-primary rounded-r-lg shadow-sm backdrop-blur-sm">
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5">
                              <svg
                                className="w-5 h-5 text-primary"
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
                            </div>
                            <div className="flex-1">
                              <strong className="text-primary font-semibold block mb-1">
                                Hint:
                              </strong>
                              <p className="text-gray-700 text-sm leading-relaxed">
                                {currentQuestion.explanation}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  ) : currentLesson ? (
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
                      {isShowingSubtitles && currentSubtitle ? (
                        <div className="flex min-h-[200px] flex-1 items-center justify-center sm:min-h-[260px] lg:min-h-[300px]">
                          <div className="max-w-2xl mx-auto px-6">
                            {/* Subtitle container with animation */}
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

                              {/* Main subtitle text */}
                              <div
                                className="rounded-2xl border-2 border-primary/20 bg-white/80 p-5 shadow-xl backdrop-blur-md transition-all duration-500 ease-out sm:p-8"
                                key={currentSubtitle}
                              >
                                <p
                                  className="animate-fade-in text-center text-lg font-medium leading-relaxed text-gray-800 sm:text-2xl md:text-3xl"
                                  style={{
                                    animation: "fadeIn 0.5s ease-out forwards"
                                  }}
                                >
                                  {currentSubtitle}
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
                          Ready to Learn?
                        </h2>
                        <p className="text-gray-500 mb-6 leading-relaxed">
                          Your learning adventure awaits! Click the button below to begin your lesson and start building amazing things.
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
                          <span className="pr-1">Start learning</span>
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
      {fullscreen && isCodeTestQuestion && (
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

export default function CodeExample() {
  return <CodeExampleInner />;
}
