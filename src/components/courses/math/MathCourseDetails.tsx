import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import Split from "react-split";
import NarratorAvatar from "narrator-avatar";
import {
  Calculator,
  Mic,
  Play,
  RotateCcw,
  Volume2,
} from "lucide-react";
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
import {
  MultipleChoiceQuestion,
  TrueFalseQuestion,
} from "@/components/courses/exercise";
import MathFormulaBoard from "./MathFormulaBoard";
import MathAnswerWorkspace from "./MathAnswerWorkspace";
import MathText from "./MathText";
import { compareFormulaAnswer } from "@/utils/formulaAnswer";
import { useInstructorStore } from "@/stores/instructorStore";
import { useCoursesStore } from "@/stores/coursesStore";
import { cn } from "@/lib/utils";
import { stopAvatarSpeech } from "@/utils/stopAvatarSpeech";

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
          "relative flex size-9 items-center justify-center rounded-xl border-2 bg-white shadow-md sm:size-10",
          isSpeaking ? "border-primary shadow-primary/25" : "border-primary/25",
        )}
      >
        <Mic className="size-5 text-primary" aria-hidden />
      </div>
    </div>
  );
}

function MathCourseDetailsInner() {
  const { exercise } = useParams<{ exercise: string }>();
  const location = useLocation();
  const { getInstructorConfig } = useInstructorStore();
  const instructorConfig = getInstructorConfig();
  const { updateCourseProgress } = useCoursesStore();
  const isCourseCompleted = useCoursesStore((state) =>
    exercise ? state.courseProgress[exercise]?.status === "completed" : false,
  );

  const avatarRef = useRef<NarratorAvatarRef | null>(null);
  const avatarReadyRef = useRef(false);
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
  const moveToNextQuestionRef = useRef<() => void>(() => {});

  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [lessonStarted, setLessonStarted] = useState(false);
  const [canStartQuestions, setCanStartQuestions] = useState(false);
  const [canNextLesson, setCanNextLesson] = useState(false);
  const [canPreviousLesson, setCanPreviousLesson] = useState(false);
  const [canPrevious, setCanPrevious] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | boolean | null>(
    null,
  );
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [correctAnswersCount, setCorrectAnswersCount] = useState(0);
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
  const [isShowingSubtitles, setIsShowingSubtitles] = useState(false);
  const [showMobileAudioUnlock, setShowMobileAudioUnlock] = useState(false);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(
    null,
  );

  const curriculum = exercise
    ? getCurriculumBySlug(exercise)?.curriculum ?? null
    : null;
  const isLgUp = useMediaQueryMinLg();

  const getAvatar = useCallback(() => avatarRef.current, []);

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
    [getAvatar],
  );

  const speak = useCallback(
    (text: string, action: PendingAction = { type: "none" }) => {
      if (!avatarReadyRef.current) {
        pendingSpeechQueueRef.current.push({ text, action });
        return;
      }
      speakImmediate(text, action);
    },
    [speakImmediate],
  );

  const flushNextQueuedSpeech = useCallback(() => {
    const next = pendingSpeechQueueRef.current.shift();
    if (next) speakImmediate(next.text, next.action);
  }, [speakImmediate]);

  const handleAvatarReady = useCallback(() => {
    avatarReadyRef.current = true;
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
    setShowMobileAudioUnlock(false);
    isManuallyStopped.current = true;
    stopAvatarSpeech(getAvatar());
    pendingActionRef.current = { type: "none" };
    setIsSpeaking(false);
    setTimeout(() => {
      isManuallyStopped.current = false;
    }, 300);
  }, [getAvatar, stopFormulaTyping, stopSubtitles]);

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
    (hasQuestions: boolean, hasNextLesson: boolean) => {
      if (hasQuestions) {
        speak(
          "Great! Now let's test your understanding with some questions. Click 'Start Questions' when you're ready.",
          { type: "enable_start_questions" },
        );
      } else if (hasNextLesson) {
        speak(
          "You've completed this lesson! Click 'Next Lesson' to continue.",
          { type: "enable_next_lesson" },
        );
      } else {
        speak(
          "Congratulations! You've completed all lessons in this module.",
          { type: "show_completion" },
        );
      }
    },
    [speak],
  );

  const playLessonFormulaTyping = useCallback(
    (detail: FormulaExample, lesson: Lesson) => {
      stopFormulaTyping();
      isTypingFormulaRef.current = true;
      setIsFormulaTyping(true);
      setActiveFormulaExample(detail);
      setDisplayedFormula("");

      const formulaToType = detail.formula;
      const typingSpeed = detail.typingSpeed ?? 45;
      let currentIndex = 0;
      const hasQuestions = (lesson.questions?.length ?? 0) > 0;
      const hasNextLesson = !!lesson.next_lesson_id;

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
            speakLessonFormulaOutro(hasQuestions, hasNextLesson);
          }
        }
      };

      formulaTypingTimeoutRef.current = setTimeout(typeNextChar, 300);
    },
    [speak, speakLessonFormulaOutro, stopFormulaTyping],
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

  const moveToNextQuestion = useCallback(() => {
    if (!currentLesson?.questions) return;
    stopFormulaTyping();

    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex < currentLesson.questions.length) {
      const nextQuestion = currentLesson.questions[nextIndex];
      setCurrentQuestion(nextQuestion);
      setCurrentQuestionIndex(nextIndex);
      persistCoursePosition({
        lessonId: currentLesson.id,
        lessonIndex: curriculum
          ? getLessonIndexInCurriculum(currentLesson, curriculum)
          : undefined,
        questionIndex: nextIndex,
        lessonStarted: true,
        canStartQuestions: false,
      });
      const hasPrevLesson = curriculum
        ? !!getPreviousLessonInOrder(currentLesson, curriculum)
        : false;
      setCanPreviousLesson(hasPrevLesson);
      setCanPrevious(true);
      beginQuestion(nextQuestion);
      return;
    }

    setCurrentQuestion(null);
    setActiveFormulaExample(null);
    setCompletedLessonIds((prev) => new Set(prev).add(currentLesson.id));

    const totalQuestions = currentLesson.questions.length;
    const correctCount = correctAnswersCount;
    const wrongCount = totalQuestionsAnswered - correctCount;
    const newModuleCorrect = moduleCorrectCount + correctCount;
    const newModuleTotal = moduleTotalAnswered + totalQuestionsAnswered;
    setModuleCorrectCount(newModuleCorrect);
    setModuleTotalAnswered(newModuleTotal);

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
      completionMessage = `Congratulations! You've completed this module. ${lessonSummary}${lessonScore}`;
      if (newModuleTotal > 0) {
        completionMessage += ` Across all lessons in this module, you answered ${newModuleCorrect} out of ${newModuleTotal} questions correctly.`;
      }
      if (currentLesson.next_lesson_id) {
        completionMessage += " Click 'Next Lesson' to continue.";
      }
    } else {
      completionMessage = `Great job! ${lessonSummary}${lessonScore} Click 'Next Lesson' to continue.`;
    }

    if (curriculum) {
      if (getNextLessonInOrder(currentLesson, curriculum)) setCanNextLesson(true);
      if (getPreviousLessonInOrder(currentLesson, curriculum)) {
        setCanPreviousLesson(true);
      }
    }

    persistCoursePosition({
      lessonId: currentLesson.id,
      lessonIndex: curriculum
        ? getLessonIndexInCurriculum(currentLesson, curriculum)
        : undefined,
      questionIndex: totalQuestions,
      lessonStarted: true,
      canStartQuestions: false,
    });

    setTimeout(() => {
      speak(completionMessage, {
        type: currentLesson.next_lesson_id ? "enable_next_lesson" : "show_completion",
      });
      setTimeout(() => setIsSpeaking(false), 15000);
    }, 300);
  }, [
    beginQuestion,
    correctAnswersCount,
    currentLesson,
    currentQuestionIndex,
    curriculum,
    moduleCorrectCount,
    moduleTotalAnswered,
    persistCoursePosition,
    speak,
    stopFormulaTyping,
    totalQuestionsAnswered,
  ]);

  useEffect(() => {
    moveToNextQuestionRef.current = moveToNextQuestion;
  }, [moveToNextQuestion]);

  const handleSpeechEndInternal = useCallback(() => {
    setIsSpeaking(false);
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
        setCanStartQuestions(true);
        break;
      case "enable_next_lesson":
        setCanNextLesson(true);
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
            !!action.lesson.next_lesson_id,
          );
        }
        break;
      case "lesson_formula_outro":
        speakLessonFormulaOutro(action.hasQuestions, action.hasNextLesson);
        break;
      default:
        break;
    }
    flushNextQueuedSpeech();
  }, [
    flushNextQueuedSpeech,
    playLessonFormulaTyping,
    speak,
    speakLessonFormulaOutro,
    stopSubtitles,
  ]);

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
      const introText = parts.join(" ");

      if (lesson.formula_example) {
        setActiveFormulaExample(lesson.formula_example);
        setDisplayedFormula("");
        setIsFormulaTyping(false);
        speak(introText, { type: "start_lesson_formula_demo", lesson });
        return;
      }

      setActiveFormulaExample(null);
      setDisplayedFormula("");

      const action: PendingAction = hasQuestions
        ? { type: "enable_start_questions" }
        : lesson.next_lesson_id
          ? { type: "enable_next_lesson" }
          : { type: "show_completion" };

      let finalText = introText;
      if (hasQuestions) {
        finalText +=
          " Great! Now let's test your understanding with some questions. Click 'Start Questions' when you're ready.";
      } else if (lesson.next_lesson_id) {
        finalText += " You've completed this lesson! Click 'Next Lesson' to continue.";
      } else {
        finalText +=
          " Congratulations! You've completed all lessons in this module.";
      }

      speak(finalText, action);
    },
    [speak],
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
    setCorrectAnswersCount(0);
    setTotalQuestionsAnswered(0);
    setModuleCorrectCount(0);
    setModuleTotalAnswered(0);
    setStudentAnswer("");
    setLastAnswerCorrect(null);

    persistCoursePosition({
      lessonId: firstLesson.id,
      lessonIndex: getLessonIndexInCurriculum(firstLesson, curriculum),
      questionIndex: 0,
      lessonStarted: true,
      canStartQuestions: false,
    });

    speakLessonContent(firstLesson);
  }, [curriculum, persistCoursePosition, speakLessonContent]);

  const handleStartQuestions = useCallback(() => {
    if (!canStartQuestions || !currentLesson?.questions?.length) return;
    stopSpeaking();
    stopFormulaTyping();
    setCanStartQuestions(false);
    const question = currentLesson.questions[0];
    setCurrentQuestion(question);
    setCurrentQuestionIndex(0);
    setCorrectAnswersCount(0);
    setTotalQuestionsAnswered(0);
    persistCoursePosition({
      lessonId: currentLesson.id,
      lessonIndex: curriculum
        ? getLessonIndexInCurriculum(currentLesson, curriculum)
        : undefined,
      questionIndex: 0,
      lessonStarted: true,
      canStartQuestions: false,
    });
    const hasPrevLesson = curriculum
      ? !!getPreviousLessonInOrder(currentLesson, curriculum)
      : false;
    setCanPreviousLesson(hasPrevLesson);
    setCanPrevious(hasPrevLesson);
    beginQuestion(question);
  }, [
    beginQuestion,
    canStartQuestions,
    currentLesson,
    curriculum,
    persistCoursePosition,
    stopFormulaTyping,
    stopSpeaking,
  ]);

  const handleNextLesson = useCallback(() => {
    if (!canNextLesson || !currentLesson || !curriculum) return;
    stopSpeaking();
    setCanNextLesson(false);
    const nextLesson = getNextLessonInOrder(currentLesson, curriculum);
    if (!nextLesson) return;

    const currentModIndex = getModuleIndexForLesson(currentLesson, curriculum);
    const nextModIndex = getModuleIndexForLesson(nextLesson, curriculum);
    const movingToNewModule =
      currentModIndex !== -1 &&
      nextModIndex !== -1 &&
      currentModIndex !== nextModIndex;

    setCurrentLesson(nextLesson);
    setCurrentQuestion(null);
    setCurrentQuestionIndex(0);
    setCanStartQuestions(false);
    setCanNextLesson(false);
    setCanPrevious(false);
    setStudentAnswer("");
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
    const hasPrevLesson = !!getPreviousLessonInOrder(nextLesson, curriculum);
    setCanPreviousLesson(hasPrevLesson);
    setCanPrevious(hasPrevLesson);
  }, [
    canNextLesson,
    currentLesson,
    curriculum,
    persistCoursePosition,
    speakLessonContent,
    stopSpeaking,
  ]);

  const handlePreviousLesson = useCallback(() => {
    if (!currentLesson || !curriculum) return;
    stopSpeaking();
    const prevLesson = getPreviousLessonInOrder(currentLesson, curriculum);
    if (!prevLesson) return;

    setCurrentLesson(prevLesson);
    setCurrentQuestion(null);
    setCurrentQuestionIndex(0);
    setCanStartQuestions(false);
    setCanNextLesson(false);
    setCanPrevious(false);
    setStudentAnswer("");
    setCorrectAnswersCount(0);
    setTotalQuestionsAnswered(0);

    persistCoursePosition({
      lessonId: prevLesson.id,
      lessonIndex: getLessonIndexInCurriculum(prevLesson, curriculum),
      questionIndex: 0,
      lessonStarted: true,
      canStartQuestions: false,
    });

    speakLessonContent(prevLesson);
    const hasPrevLesson = !!getPreviousLessonInOrder(prevLesson, curriculum);
    setCanPreviousLesson(hasPrevLesson);
    setCanPrevious(hasPrevLesson);
  }, [
    currentLesson,
    curriculum,
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
    setIsAnswerSubmitted(false);
    persistCoursePosition({
      lessonId: currentLesson.id,
      lessonIndex: curriculum
        ? getLessonIndexInCurriculum(currentLesson, curriculum)
        : undefined,
      questionIndex: prevIndex,
      lessonStarted: true,
      canStartQuestions: false,
    });
    setCanPrevious(
      prevIndex > 0 ||
        !!(curriculum && getPreviousLessonInOrder(currentLesson, curriculum)),
    );
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

  const handlePrevious = useCallback(() => {
    if (isSpeaking) return;
    if (currentQuestion && currentQuestionIndex > 0) handlePreviousQuestion();
    else if (canPreviousLesson) handlePreviousLesson();
  }, [
    canPreviousLesson,
    currentQuestion,
    currentQuestionIndex,
    handlePreviousLesson,
    handlePreviousQuestion,
    isSpeaking,
  ]);

  const handleSubmitMcTf = useCallback(() => {
    if (isAnswerSubmitted || selectedAnswer === null || !currentQuestion) return;
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
    setTotalQuestionsAnswered((p) => p + 1);
    if (isCorrect) setCorrectAnswersCount((p) => p + 1);
    speak(feedbackText, { type: "next_question" });
  }, [currentQuestion, isAnswerSubmitted, selectedAnswer, speak]);

  const handleSubmitFormula = useCallback(() => {
    if (!currentQuestion || currentQuestion.type !== "formula_test") return;
    if (isAnswerSubmitted) return;
    setIsAnswerSubmitted(true);
    const expected = currentQuestion.testCriteria?.expectedFormula?.trim() ?? "";
    const isCorrect = expected
      ? compareFormulaAnswer(studentAnswer, expected)
      : false;
    setLastAnswerCorrect(isCorrect);
    setTotalQuestionsAnswered((p) => p + 1);
    if (isCorrect) setCorrectAnswersCount((p) => p + 1);

    const feedbackText = isCorrect
      ? `Correct! Well done. ${currentQuestion.explanation ?? ""}`
      : `Not quite. The expected answer is ${expected}. ${currentQuestion.explanation ?? ""}`;
    speak(feedbackText, { type: "next_question" });
  }, [currentQuestion, isAnswerSubmitted, speak, studentAnswer]);

  const handleRestartCourse = useCallback(() => {
    if (!exercise || !curriculum) return;
    stopSpeaking();
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
    setCanStartQuestions(false);
    setCanNextLesson(false);
    setCanPreviousLesson(false);
    setCanPrevious(false);
    setStudentAnswer("");
    setDisplayedFormula("");
    setActiveFormulaExample(null);
    setCompletedLessonIds(new Set());
  }, [curriculum, exercise, stopSpeaking, updateCourseProgress]);

  useEffect(() => {
    if (!curriculum || !exercise) return;
    let cancelled = false;
    void (async () => {
      await useCoursesStore.getState().hydrateCourseProgressFromApi(exercise);
      if (cancelled) return;
      const stored = useCoursesStore.getState().getCourseProgress(exercise);
      if (!stored) return;
      if (stored.completedLessons?.length) {
        setCompletedLessonIds(new Set(stored.completedLessons));
      }
      const saved: CourseProgress = {
        lessonId: stored.currentLessonId ?? null,
        lessonIndex:
          typeof stored.lessonIndex === "number" ? stored.lessonIndex : undefined,
        questionIndex:
          typeof stored.questionIndex === "number" ? stored.questionIndex : 0,
        lessonStarted: stored.lessonStarted ?? false,
        canStartQuestions: stored.canStartQuestions ?? false,
        lastUpdated: typeof stored.lastUpdated === "number" ? stored.lastUpdated : 0,
      };
      const lesson =
        typeof saved.lessonIndex === "number"
          ? getLessonByIndex(saved.lessonIndex, curriculum)
          : saved.lessonId
            ? findLessonById(saved.lessonId, curriculum)
            : null;
      if (!lesson) return;
      setCurrentLesson(lesson);
      setCurrentQuestionIndex(saved.questionIndex ?? 0);
      setLessonStarted(saved.lessonStarted ?? false);
      setCanStartQuestions(saved.canStartQuestions ?? false);
      if (lesson.formula_example) {
        setActiveFormulaExample(lesson.formula_example);
        setDisplayedFormula(lesson.formula_example.formula);
      }
      const questionCount = lesson.questions?.length ?? 0;
      const allDone =
        questionCount > 0 && (saved.questionIndex ?? 0) >= questionCount;
      const hasPrevLesson = !!getPreviousLessonInOrder(lesson, curriculum);
      if (allDone) {
        setCurrentQuestion(null);
        if (getNextLessonInOrder(lesson, curriculum)) setCanNextLesson(true);
        setCanPreviousLesson(hasPrevLesson);
        setCanPrevious(hasPrevLesson);
      } else if (lesson.questions?.[saved.questionIndex ?? 0]) {
        setCurrentQuestion(lesson.questions[saved.questionIndex ?? 0]);
        setCanPreviousLesson(hasPrevLesson);
        setCanPrevious((saved.questionIndex ?? 0) > 0 || hasPrevLesson);
      } else {
        setCanPreviousLesson(hasPrevLesson);
        setCanPrevious(hasPrevLesson);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [curriculum, exercise]);

  useEffect(() => {
    if (!currentLesson || !exercise || !curriculum) return;
    const allLessons = curriculum.modules.flatMap((m) => m.lessons);
    const currentIndex = getLessonIndexInCurriculum(currentLesson, curriculum);
    if (currentIndex < 0) return;
    const totalQuestions = currentLesson.questions?.length ?? 0;
    const isCurrentLessonComplete =
      totalQuestions > 0 && currentQuestionIndex >= totalQuestions;
    const progress = calculateProgress(
      currentIndex,
      allLessons.length,
      currentQuestionIndex,
      totalQuestions,
      lessonStarted,
      isCurrentLessonComplete,
    );
    updateCourseProgress(exercise, {
      progress,
      status: progress >= 100 ? "completed" : "ongoing",
      currentLessonId: currentLesson.id,
      lessonIndex: currentIndex,
      questionIndex: currentQuestionIndex,
      lessonStarted,
      canStartQuestions,
      completedLessons: Array.from(completedLessonIds),
    });
  }, [
    calculateProgress,
    canStartQuestions,
    completedLessonIds,
    currentLesson,
    currentQuestionIndex,
    curriculum,
    exercise,
    lessonStarted,
    updateCourseProgress,
  ]);

  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, [location.pathname, exercise, stopSpeaking]);

  useEffect(() => {
    return () => {
      stopFormulaTyping();
      pendingSpeechQueueRef.current = [];
      pendingActionRef.current = { type: "none" };
      stopAvatarSpeech(avatarRef.current);
    };
  }, []);

  useEffect(() => {
    avatarReadyRef.current = false;
    pendingSpeechQueueRef.current = [];
    setShowMobileAudioUnlock(false);
  }, [exercise, isLgUp]);

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

  const lessonControls = (
    <div className="mb-4 shrink-0 rounded-2xl border border-primary/10 bg-white/60 p-3 shadow-sm backdrop-blur sm:p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-primary/70">
        Lesson controls
      </p>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <button
          type="button"
          onClick={handlePrevious}
          disabled={!canPrevious || isSpeaking}
          className={cn(
            "rounded-xl px-2 py-2 text-xs font-semibold sm:text-sm",
            canPrevious && !isSpeaking
              ? "bg-red-500 text-white shadow hover:bg-red-600"
              : "cursor-not-allowed bg-gray-200 text-gray-500",
          )}
        >
          Previous
        </button>
        <button
          type="button"
          onClick={handleStartQuestions}
          disabled={!canStartQuestions || isSpeaking}
          className={cn(
            "rounded-xl px-2 py-2 text-xs font-semibold sm:text-sm",
            canStartQuestions && !isSpeaking
              ? "bg-primary text-white shadow hover:bg-primary/90"
              : "cursor-not-allowed bg-gray-200 text-gray-500",
          )}
        >
          Start
        </button>
        <button
          type="button"
          onClick={handleNextLesson}
          disabled={!canNextLesson || isSpeaking}
          className={cn(
            "rounded-xl px-2 py-2 text-xs font-semibold sm:text-sm",
            canNextLesson && !isSpeaking
              ? "bg-green-500 text-white shadow hover:bg-green-600"
              : "cursor-not-allowed bg-gray-200 text-gray-500",
          )}
        >
          Next
        </button>
      </div>
      {isCourseCompleted && (
        <button
          type="button"
          onClick={handleRestartCourse}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-white hover:bg-amber-600"
        >
          <RotateCcw className="size-4" />
          Restart course
        </button>
      )}
    </div>
  );

  const renderQuestion = () => {
    if (!currentQuestion) return null;
    if (currentQuestion.type === "multiple_choice") {
      return (
        <>
          <h3 className="mb-4 text-base font-bold leading-snug text-gray-900 sm:text-lg">
            <MathText>{currentQuestion.question}</MathText>
          </h3>
          <MultipleChoiceQuestion
            question={currentQuestion}
            selectedAnswer={selectedAnswer as string | null}
            onSelect={(v) => !isAnswerSubmitted && setSelectedAnswer(v)}
            disabled={isAnswerSubmitted}
          />
          <button
            type="button"
            onClick={handleSubmitMcTf}
            disabled={
              selectedAnswer === null || isAnswerSubmitted || isSpeaking
            }
            className={cn(
              "mt-6 w-full rounded-xl py-3 text-lg font-semibold",
              selectedAnswer !== null && !isAnswerSubmitted && !isSpeaking
                ? "bg-primary text-white shadow-lg shadow-primary/30 hover:bg-primary/90"
                : "cursor-not-allowed bg-gray-200 text-gray-500",
            )}
          >
            Submit answer
          </button>
        </>
      );
    }
    if (currentQuestion.type === "true_false") {
      return (
        <>
          <h3 className="mb-4 text-base font-bold leading-snug text-gray-900 sm:text-lg">
            <MathText>{currentQuestion.question}</MathText>
          </h3>
          <TrueFalseQuestion
            selectedAnswer={selectedAnswer as boolean | null}
            onSelect={(v) => !isAnswerSubmitted && setSelectedAnswer(v)}
            disabled={isAnswerSubmitted}
          />
          <button
            type="button"
            onClick={handleSubmitMcTf}
            disabled={
              selectedAnswer === null || isAnswerSubmitted || isSpeaking
            }
            className={cn(
              "mt-6 w-full rounded-xl py-3 text-lg font-semibold",
              selectedAnswer !== null && !isAnswerSubmitted && !isSpeaking
                ? "bg-primary text-white shadow-lg shadow-primary/30 hover:bg-primary/90"
                : "cursor-not-allowed bg-gray-200 text-gray-500",
            )}
          >
            Submit answer
          </button>
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
              {lessonStarted && lessonControls}
              <div className="mt-4 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                <NarratorAvatar
                  ref={avatarRef}
                  {...avatarConfig}
                  onReady={handleAvatarReady}
                  onError={(error: unknown) =>
                    console.error("Avatar error:", error)
                  }
                  onSpeechStart={() => {
                    isManuallyStopped.current = false;
                    setIsSpeaking(true);
                    setIsShowingSubtitles(true);
                  }}
                  onSpeechEnd={handleSpeechEnd}
                  onSubtitle={setCurrentSubtitle}
                  className="h-full min-h-0 w-full min-w-0 max-h-full max-w-full"
                />
              </div>
            </>
          )}
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-l-0 border-primary/20 lg:border-l-2">
          {!isLgUp && (
            <div className="shrink-0 border-b border-primary/10 bg-white/95 shadow-sm backdrop-blur-md supports-backdrop-filter:bg-white/80">
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
              {showMobileAudioUnlock && (
                <div className="border-t border-primary/15 bg-linear-to-b from-primary/10 to-primary/5 px-3 py-3">
                  <p className="mb-2.5 text-center text-[0.7rem] leading-snug text-gray-600 sm:text-xs">
                    Your phone needs one tap to allow instructor voice.
                  </p>
                  <button
                    type="button"
                    onClick={handleMobileAudioUnlock}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-md hover:bg-primary/90"
                  >
                    <Volume2 className="size-5 shrink-0" aria-hidden />
                    Tap to start voice
                  </button>
                </div>
              )}
              {lessonStarted && (
                <div className="px-3 pb-3">{lessonControls}</div>
              )}
            </div>
          )}

          <div className="scrollbar-hide flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden bg-linear-to-br from-[#F3ECFE] via-[#F8F4FF] to-white p-4 sm:p-5">
            {currentQuestion ? (
              <div className="mx-auto w-full min-w-0 max-w-3xl">
                <div className="min-w-0 overflow-hidden rounded-2xl border border-primary/15 bg-white/90 p-4 shadow-sm sm:p-6">
                  {currentQuestion.type === "formula_test" &&
                    activeFormulaExample && (
                      <MathFormulaBoard
                        example={activeFormulaExample}
                        liveFormula={
                          isFormulaTyping ? displayedFormula : undefined
                        }
                        compact
                        className="mb-6"
                      />
                    )}
                  {renderQuestion()}
                </div>
              </div>
            ) : currentLesson ? (
              <div className="mx-auto w-full min-w-0 max-w-3xl space-y-4 sm:space-y-5">
                <div>
                  <p className="mb-1 text-xs font-bold uppercase tracking-wider text-primary/80">
                    {lessonStarted ? "Lesson in progress" : "Ready"}
                  </p>
                  <h2 className="text-xl font-bold leading-tight text-gray-900 sm:text-2xl">
                    {currentLesson.title}
                  </h2>
                </div>

                {isShowingSubtitles && currentSubtitle ? (
                  <div className="rounded-2xl border-2 border-primary/20 bg-white/90 p-6 text-center shadow-lg sm:p-10">
                    <p className="text-base font-medium leading-relaxed break-words text-gray-800 sm:text-lg">
                      {currentSubtitle}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="rounded-2xl border border-primary/10 bg-white/90 p-5 shadow-sm">
                      <p className="leading-relaxed text-gray-700">
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
                      <div className="rounded-2xl border-l-4 border-primary bg-linear-to-br from-primary/10 via-primary/5 to-transparent p-5">
                        <p className="text-sm font-semibold text-primary">
                          What you&apos;ll learn
                        </p>
                        <p className="mt-2 leading-relaxed text-gray-700">
                          {currentLesson.avatar_script}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center">
                <div className="max-w-md text-center">
                  <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-primary text-white shadow-lg">
                    <Calculator className="size-8" />
                  </div>
                  <h2 className="mb-2 text-2xl font-bold text-gray-900">
                    Ready for math?
                  </h2>
                  <p className="mb-6 text-gray-600">
                    Your instructor will guide you through formulas, examples,
                    and practice questions — built for learning mathematics.
                  </p>
                  <button
                    type="button"
                    onClick={handleStartLesson}
                    className="inline-flex items-center gap-3 rounded-full bg-primary px-8 py-4 font-bold text-white shadow-lg hover:bg-primary/90"
                  >
                    <Play className="size-5 fill-white" />
                    Start learning
                  </button>
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
                ref={avatarRef}
                {...avatarConfig}
                onReady={handleAvatarReady}
                onError={(error: unknown) =>
                  console.error("Avatar error:", error)
                }
                onSpeechStart={() => {
                  isManuallyStopped.current = false;
                  setIsSpeaking(true);
                  setIsShowingSubtitles(true);
                }}
                onSpeechEnd={handleSpeechEnd}
                onSubtitle={setCurrentSubtitle}
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
