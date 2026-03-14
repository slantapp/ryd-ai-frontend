import { useRef, useState, useCallback, useEffect } from "react";
import { useParams } from "react-router-dom";
import Split from "react-split";
import NarratorAvatar from "narrator-avatar";
import { Volume2, RotateCcw } from "lucide-react";
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
  StartLessonButton,
  QuestionInfo,
  CodeEditor,
  TestResults,
  MultipleChoiceQuestion,
  TrueFalseQuestion,
  FullscreenModal,
} from "../components/exercise";
import { useInstructorStore } from "../stores/instructorStore";
import { useCoursesStore } from "../stores/coursesStore";

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
  | { type: "clear_code_and_ask"; question: Question };

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

  // ============================================================================
  // DERIVED VALUES
  // ============================================================================

  const curriculum = exercise
    ? getCurriculumBySlug(exercise)?.curriculum || null
    : null;
  const progressKey = exercise ? `course-progress-${exercise}` : null;
  const isCodeTestQuestion = currentQuestion?.type === "code_test";

  // ============================================================================
  // AVATAR HELPERS
  // ============================================================================

  const getAvatar = useCallback(() => avatarRef.current, []);

  const speak = useCallback(
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

            // After typing, speak the explanation if available
            if (codeExample.explanation) {
              // Wait a moment for the code to be visible
              setTimeout(() => {
                speak(codeExample.explanation!, {
                  type: "clear_code_and_ask",
                  question,
                });
              }, 500);
            } else {
              // No explanation, just clear and ask the question
              setTimeout(() => {
                speak(
                  "Now it's your turn! I've cleared the example. Try solving the problem yourself.",
                  { type: "clear_code_and_ask", question }
                );
              }, 1000);
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
      default:
        break;
    }
  }, [speak, stopSubtitles]);

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
      if (curriculum && getPreviousLessonInOrder(currentLesson, curriculum)) {
        setCanPreviousLesson(true);
      }

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
      // Enable previous lesson button if there's a lesson before this one
      if (getPreviousLessonInOrder(prevLesson, curriculum)) {
        setCanPreviousLesson(true);
      }
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
    if (curriculum && getPreviousLessonInOrder(currentLesson, curriculum)) {
      setCanPreviousLesson(true);
    }

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
      // Enable previous lesson button if there's a lesson before this one
      if (getPreviousLessonInOrder(nextLesson, curriculum)) {
        setCanPreviousLesson(true);
      }
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

      if (allQuestionsDone) {
        // Restore "lesson completed" state: no current question, enable Next/Previous Lesson
        setCurrentQuestion(null);
        if (getNextLessonInOrder(lesson, curriculum)) {
          setCanNextLesson(true);
        }
        if (getPreviousLessonInOrder(lesson, curriculum)) {
          setCanPreviousLesson(true);
        }
      } else if (
        saved.questionIndex >= 0 &&
        lesson.questions?.[saved.questionIndex]
      ) {
        setCurrentQuestion(lesson.questions[saved.questionIndex]);
        // Enable Previous when restoring to lesson mid-flow
        if (getPreviousLessonInOrder(lesson, curriculum)) {
          setCanPreviousLesson(true);
        }
      } else {
        // Restored at start of lesson (no current question yet) - enable Previous if applicable
        if (getPreviousLessonInOrder(lesson, curriculum)) {
          setCanPreviousLesson(true);
        }
      }
    }
  }, [curriculum, exercise, loadProgress]);

  // Keep Previous/Next lesson buttons in sync whenever we're on a lesson.
  // Previous: enabled whenever there's a previous lesson (regardless of current lesson completion).
  // Next: enabled by enable_next_lesson or when lesson has no questions.
  useEffect(() => {
    if (!currentLesson || !curriculum || !lessonStarted) return;
    // Previous is only disabled when on the first lesson (no previous to go back to)
    setCanPreviousLesson(!!getPreviousLessonInOrder(currentLesson, curriculum));
    // canNextLesson is set by handleSpeechEnd (enable_next_lesson) or moveToNextQuestion (completion)
    // so we only update it when lesson has no questions - otherwise user must complete first
    if (!currentLesson.questions?.length && getNextLessonInOrder(currentLesson, curriculum)) {
      setCanNextLesson(true);
    }
  }, [currentLesson, curriculum, lessonStarted]);

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

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="relative h-full overflow-hidden">
      <Split
        className="flex h-full"
        sizes={[35, 65]}
        minSize={200}
        gutterSize={8}
        gutterStyle={(dimension, gutterSize) =>
          dimension === "width"
            ? {
              width: `${gutterSize}px`,
              cursor: "col-resize",
              pointerEvents: "auto",
            }
            : {}
        }
      >
        {/* LEFT SIDE: Question Info + Avatar */}
        <div className="relative pr-4 overflow-y-auto min-h-0 flex flex-col scrollbar-hide">
          {/* Controls and buttons - shrink-0 keeps them visible and never overlapped by avatar */}
          <div className="shrink-0 relative z-10">
            {/* Start Lesson Button */}
            {!lessonStarted && (
              <div className="mb-4 pb-4">
                <StartLessonButton onStart={handleStartLesson} />
              </div>
            )}

            {/* Lesson Controls */}
            {lessonStarted && (
              <div className="mb-4 rounded-2xl border border-primary/10 bg-white/60 p-4 shadow-sm backdrop-blur">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">
                      Lesson Controls
                    </p>
                    <p className="text-sm text-gray-500">
                      Navigate through lessons and modules.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={handlePreviousLesson}
                    disabled={!canPreviousLesson || isSpeaking}
                    className={`rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${canPreviousLesson && !isSpeaking
                      ? "bg-red-500 text-white shadow hover:bg-red-600"
                      : "bg-gray-200 text-gray-500 cursor-not-allowed"
                      }`}
                  >
                    Previous
                  </button>
                  <button
                    onClick={handleStartQuestions}
                    disabled={!canStartQuestions || isSpeaking}
                    className={`rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${canStartQuestions && !isSpeaking
                      ? "bg-primary text-white shadow hover:bg-primary/90"
                      : "bg-gray-200 text-gray-500 cursor-not-allowed"
                      }`}
                  >
                    Start Questions
                  </button>
                  <button
                    onClick={handleNextLesson}
                    disabled={!canNextLesson || isSpeaking}
                    className={`rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${canNextLesson && !isSpeaking
                      ? "bg-green-500 text-white shadow hover:bg-green-600"
                      : "bg-gray-200 text-gray-500 cursor-not-allowed"
                      }`}
                  >
                    Next
                  </button>
                </div>
                {isCourseCompleted && (
                  <button
                    onClick={handleRestartCourse}
                    className="mt-3 flex items-center justify-center gap-2 w-full rounded-xl px-3 py-2.5 text-sm font-semibold bg-amber-500 text-white shadow hover:bg-amber-600 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Restart course
                  </button>
                )}
              </div>
            )}

            {/* Question Info for Code Tests */}
            {currentQuestion?.type === "code_test" && (
              <QuestionInfo question={currentQuestion} />
            )}

            {/* Speaker Icon for Code Test Questions */}
            {isCodeTestQuestion && (
              <div className="flex items-center justify-center my-6 min-h-[100px]">
                <div className="relative flex items-center justify-center">
                  {/* Pulsating rings - only when speaking */}
                  {isSpeaking && (
                    <>
                      <div className="absolute w-16 h-16 bg-primary/20 rounded-full animate-ping"></div>
                      <div
                        className="absolute w-14 h-14 bg-primary/30 rounded-full animate-ping"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                      <div
                        className="absolute w-12 h-12 bg-primary/40 rounded-full animate-ping"
                        style={{ animationDelay: "0.4s" }}
                      ></div>
                    </>
                  )}
                  {/* Speaker icon - always visible for code test questions */}
                  <div
                    className={`relative bg-white/90 rounded-full p-3 backdrop-blur-sm border-2 shadow-lg transition-all duration-300 ${isSpeaking
                      ? "border-primary scale-110 shadow-primary/50"
                      : "border-primary/30 scale-100"
                      }`}
                  >
                    <Volume2
                      className={`w-6 h-6 text-primary ${isSpeaking ? "animate-pulse" : ""
                        }`}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Avatar - flex-1 min-h-0 keeps it below controls; never overlaps buttons */}
          {!isCodeTestQuestion && curriculum && (
            <div className="flex-1 min-h-0 flex flex-col mt-4 overflow-hidden min-w-0">
              <div className="flex justify-start items-center w-full h-full min-h-0 min-w-0">
                <NarratorAvatar
                  ref={avatarRef}
                  {...avatarConfig}
                  onReady={() => console.log("Avatar is ready!")}
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

          {/* Hidden avatar for code test questions - still functional for speech */}
          {isCodeTestQuestion && curriculum && (
            <div className="invisible absolute inset-0 pointer-events-none">
              <NarratorAvatar
                ref={avatarRef}
                {...avatarConfig}
                onReady={() => console.log("Avatar is ready!")}
                onError={(error: unknown) =>
                  console.error("Avatar error:", error)
                }
                onSpeechStart={handleSpeechStart}
                onSpeechEnd={handleSpeechEnd}
                onSubtitle={handleSubtitle}
                className="w-full h-full"
              />
            </div>
          )}
        </div>

        {/* RIGHT SIDE */}
        <div className="overflow-y-auto min-h-0 flex flex-col scrollbar-hide w-full">
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
            <div className="w-full bg-linear-to-br from-[#F3ECFE] via-[#F8F4FF] to-white p-6 overflow-y-auto border-l-2 border-primary/20 min-h-screen flex flex-col relative">
              {/* Decorative background */}
              <div className="absolute inset-0 opacity-5 pointer-events-none">
                <div className="absolute top-20 right-10 w-32 h-32 bg-primary rounded-full blur-3xl"></div>
                <div className="absolute bottom-20 left-10 w-40 h-40 bg-primary/60 rounded-full blur-3xl"></div>
              </div>

              <div className="relative z-10">
                {currentQuestion ? (
                  <>
                    <div className="mb-6">
                      <h3 className="text-2xl font-bold mb-3 text-gray-900 leading-tight">
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
                      <h2 className="text-3xl font-bold mb-3 text-gray-900 leading-tight">
                        {currentLesson.title}
                      </h2>
                      <div className="h-1 w-24 bg-linear-to-r from-primary via-primary/80 to-primary/60 rounded-full"></div>
                    </div>

                    {/* Subtitle Mode - Show when avatar is speaking */}
                    {isShowingSubtitles && currentSubtitle ? (
                      <div className="flex-1 flex items-center justify-center min-h-[300px]">
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
                              className="p-8 bg-white/80 backdrop-blur-md rounded-2xl border-2 border-primary/20 shadow-xl transition-all duration-500 ease-out"
                              key={currentSubtitle}
                            >
                              <p
                                className="text-2xl md:text-3xl font-medium text-gray-800 leading-relaxed text-center animate-fade-in"
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
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary/30 border-t-primary mb-4"></div>
                      <p className="text-gray-400 text-lg font-medium">
                        Waiting to start lesson...
                      </p>
                    </div>
                  </div>
                )}
              </div>
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
