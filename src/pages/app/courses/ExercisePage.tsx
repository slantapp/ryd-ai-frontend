import { useRef, useState, useCallback, useEffect } from "react";
import { useParams } from "react-router-dom";
import Split from "react-split";
import {
  type Question,
  type Lesson,
  findLessonById,
  getFirstLesson,
  getCurriculumBySlug,
} from "../../../data/curriculumData";
import {
  StartLessonButton,
  QuestionInfo,
  AvatarContainer,
  CodeEditor,
  TestResults,
  MultipleChoiceQuestion,
  TrueFalseQuestion,
  FullscreenModal,
  type ActionData,
} from "../../../components/courses/exercise";
import {
  evaluateCodeTest,
  formatCodeTestResults,
} from "@/utils/codeTestValidation";
import { useMediaQueryMinLg } from "@/hooks/useMediaQueryMinLg";
import { useAvatarAudioRecovery } from "@/hooks/useAvatarAudioRecovery";
import { cn } from "@/lib/utils";

interface CurriculumLearningRef {
  isAvatarReady?: () => boolean;
  resumeAudioContext?: () => Promise<void>;
  startTeaching?: () => void;
  startQuestions?: () => void;
  nextQuestion?: () => void;
  completeLesson?: () => void;
  nextLesson?: () => void;
  handleAnswerSelect?: (answer: string | boolean) => void;
  handleCodeTestResult?: (result: {
    passed: boolean;
    results: Array<{
      test: string;
      passed: boolean;
      actual?: unknown;
      expected?: unknown;
    }>;
    output: string;
    error: string | null;
    testCount: number;
    passedCount: number;
    failedCount: number;
  }) => void;
}

// ✅ Main Exercise Content (logic + layout)
function CodingExerciseInner() {
  const { exercise } = useParams<{ exercise: string }>();
  const isLgUp = useMediaQueryMinLg();
  const curriculumRef = useRef<CurriculumLearningRef | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | boolean | null>(
    null
  );
  const [code, setCode] = useState("");
  const [results, setResults] = useState<string[]>([]);
  const [fullscreen, setFullscreen] = useState<"editor" | "results" | null>(
    null
  );
  const [lessonStarted, setLessonStarted] = useState(false);
  const [codeExample, setCodeExample] = useState<{
    code: string;
    language: string;
    description?: string;
    autoRun?: boolean;
    typingSpeed?: number;
  } | null>(null);
  const [isTypingExample, setIsTypingExample] = useState(false);
  const [canStartQuestions, setCanStartQuestions] = useState(false);
  const [canNextQuestion, setCanNextQuestion] = useState(false);
  const [canCompleteLesson, setCanCompleteLesson] = useState(false);
  const [canNextLesson, setCanNextLesson] = useState(false);
  const lastProcessedQuestionId = useRef<string | null>(null);
  const pendingCodeExample = useRef<NonNullable<
    ActionData["codeExample"]
  > | null>(null);

  // Get curriculum based on course slug
  const curriculum = exercise
    ? getCurriculumBySlug(exercise)?.curriculum || null
    : null;

  // Initialize audio context when component mounts (required for TTS)
  useEffect(() => {
    // Wait a bit for avatar to mount
    const checkInterval = setInterval(async () => {
      if (curriculumRef.current?.isAvatarReady?.()) {
        try {
          await curriculumRef.current?.resumeAudioContext?.();
          console.log("Audio context initialized on mount");
          clearInterval(checkInterval);
        } catch (error) {
          console.warn("Failed to initialize audio context on mount:", error);
        }
      }
    }, 500);

    // Cleanup after 10 seconds
    const timeout = setTimeout(() => {
      clearInterval(checkInterval);
    }, 10000);

    return () => {
      clearInterval(checkInterval);
      clearTimeout(timeout);
    };
  }, []);

  // Simulate typing of example code (teacher typing in IDE)
  const handleCodeExample = useCallback(
    (example: NonNullable<ActionData["codeExample"]>) => {
      if (!example || !example.code) return;

      setCodeExample(example);
      setIsTypingExample(true);
      setCode("");
      setResults([]);

      const codeLines = example.code.split("\n");
      let currentLineIndex = 0;
      let currentCharIndex = 0;
      const typingSpeed = example.typingSpeed || 50;
      let accumulatedCode = "";

      const typeNextChar = () => {
        if (currentLineIndex >= codeLines.length) {
          // Typing complete - show full example briefly, then clear for student
          setIsTypingExample(false);
          setCode(accumulatedCode);

          // If we're on a code_test question, clear the editor after a short delay
          // so the student starts with an empty editor for their own answer.
          if (currentQuestion && currentQuestion.type === "code_test") {
            setTimeout(() => {
              setCode("");
            }, 3000);
          }
          return;
        }

        const currentLine = codeLines[currentLineIndex];

        // Handle empty lines
        if (!currentLine || currentLine.length === 0) {
          accumulatedCode += "\n";
          setCode(accumulatedCode);
          currentLineIndex++;
          currentCharIndex = 0;
          setTimeout(typeNextChar, typingSpeed);
          return;
        }

        if (currentCharIndex < currentLine.length) {
          const char = currentLine[currentCharIndex];
          if (char !== undefined && char !== null) {
            accumulatedCode += char;
            setCode(accumulatedCode);
            currentCharIndex++;
            setTimeout(typeNextChar, typingSpeed);
          } else {
            currentCharIndex++;
            setTimeout(typeNextChar, typingSpeed);
          }
        } else {
          accumulatedCode += "\n";
          setCode(accumulatedCode);
          currentLineIndex++;
          currentCharIndex = 0;
          setTimeout(typeNextChar, typingSpeed);
        }
      };

      typeNextChar();
    },
    [currentQuestion]
  );

  // Handle custom actions - update UI immediately when questions change
  const handleCustomAction = useCallback(
    (actionData: ActionData) => {
      console.log("Custom action:", actionData);

      switch (actionData.type) {
        case "codeExampleReady":
          if (actionData.codeExample) {
            if (currentQuestion?.type === "code_test") {
              handleCodeExample(actionData.codeExample);
            } else {
              pendingCodeExample.current = actionData.codeExample;
            }
          }
          return;
        case "teachingComplete":
          setCanStartQuestions(actionData.hasQuestions === true);
          setCanNextQuestion(false);
          setCanCompleteLesson(false);
          setCanNextLesson(false);
          break;
        case "questionStart":
        case "nextQuestion": {
          if (actionData.question) {
            const question = actionData.question as Question;
            const questionId = question.id || question.question;

            if (lastProcessedQuestionId.current === questionId) {
              console.log("Skipping duplicate question:", questionId);
              return;
            }

            lastProcessedQuestionId.current = questionId;

            if (actionData.type === "questionStart") {
              curriculumRef.current?.resumeAudioContext?.().catch((error) => {
                console.warn(
                  "Failed to resume audio context for first question:",
                  error
                );
              });
            }

            setCurrentQuestion((prev) => {
              if (!prev || (question && prev.id !== question.id)) {
                console.log("Setting new question:", question);
                return question || null;
              }
              return prev;
            });
            setSelectedAnswer(null);
            if (question.type === "code_test") {
              setCode("");
              setResults([]);
              setIsTypingExample(false);
              setCodeExample(null);
              if (pendingCodeExample.current) {
                handleCodeExample(pendingCodeExample.current);
                pendingCodeExample.current = null;
              }
            }
          } else {
            console.warn("No question in actionData:", actionData);
          }

          if (actionData.type === "questionStart") {
            setTimeout(() => {
              setCurrentLesson(null);
            }, 100);
          } else {
            setCurrentLesson(null);
          }

          setCanStartQuestions(false);
          setCanNextQuestion(false);
          setCanCompleteLesson(false);
          setCanNextLesson(false);
          break;
        }
        case "answerFeedbackComplete":
          if (actionData.hasNextQuestion === true) {
            setCanNextQuestion(true);
            setCanCompleteLesson(false);
            setCanNextLesson(false);
          } else {
            setCanNextQuestion(false);
            setCanCompleteLesson(true);
            setCanNextLesson(false);
          }
          break;
        case "allQuestionsComplete":
          setCanNextQuestion(false);
          setCanCompleteLesson(true);
          break;
        case "lessonCompleteFeedbackDone":
          setCanCompleteLesson(false);
          setCanNextLesson(actionData.hasNextLesson === true);
          setCanStartQuestions(false);
          setCanNextQuestion(false);
          break;
        case "lessonStart": {
          console.log(
            "Lesson started - full actionData:",
            JSON.stringify(actionData, null, 2)
          );
          lastProcessedQuestionId.current = null;
          setCurrentQuestion(null);
          setSelectedAnswer(null);
          setCode("");
          setResults([]);
          setLessonStarted(true);
          setCanStartQuestions(false);
          setCanNextQuestion(false);
          setCanCompleteLesson(false);
          setCanNextLesson(false);
          setCodeExample(null);
          setIsTypingExample(false);

          let lessonId: string | null = null;

          if (actionData.lessonId) {
            lessonId = actionData.lessonId as string;
          } else if (
            actionData.lesson &&
            typeof actionData.lesson === "object" &&
            "id" in actionData.lesson
          ) {
            lessonId = (actionData.lesson as { id: string }).id;
          } else if (typeof actionData === "object" && actionData !== null) {
            const dataObj = actionData as unknown as Record<string, unknown>;
            if ("id" in dataObj && typeof dataObj.id === "string") {
              lessonId = dataObj.id;
            } else if (
              "lesson_id" in dataObj &&
              typeof dataObj.lesson_id === "string"
            ) {
              lessonId = dataObj.lesson_id;
            }
          }

          if (lessonId && curriculum) {
            const lesson = findLessonById(lessonId, curriculum);
            if (lesson) {
              console.log("Found lesson by ID:", lessonId, lesson);
              setCurrentLesson(lesson);
            } else {
              console.warn("Lesson not found by ID:", lessonId);
            }
          } else if (curriculum) {
            console.log(
              "No lesson ID found in actionData, using first lesson as fallback"
            );
            const firstLesson = getFirstLesson(curriculum);
            if (firstLesson) {
              console.log("Using first lesson:", firstLesson);
              setCurrentLesson(firstLesson);
            }
          }
          break;
        }
        case "lessonComplete":
          console.log("Lesson completed via custom action:", actionData);
          lastProcessedQuestionId.current = null;
          curriculumRef.current?.resumeAudioContext?.().catch((error) => {
            console.warn(
              "Failed to resume audio context after lesson complete:",
              error
            );
          });
          break;
        case "codeTestSubmitted":
          console.log("Code test submitted:", actionData.testResult);
          break;
        default:
          break;
      }
    },
    [curriculum, currentQuestion, handleCodeExample]
  );

  // Handle answer selection for multiple choice
  const handleMultipleChoiceSelect = (option: string) => {
    setSelectedAnswer(option);
    curriculumRef.current?.handleAnswerSelect?.(option);
  };

  // Handle true/false selection
  const handleTrueFalseSelect = (value: boolean) => {
    setSelectedAnswer(value);
    curriculumRef.current?.handleAnswerSelect?.(value);
  };

  const handleStartQuestionsFlow = useCallback(() => {
    if (!canStartQuestions) return;
    curriculumRef.current?.startQuestions?.();
    setCanStartQuestions(false);
    setCanNextQuestion(false);
  }, [canStartQuestions]);

  const handleNextQuestionFlow = useCallback(() => {
    if (!canNextQuestion) return;
    curriculumRef.current?.nextQuestion?.();
    setCanNextQuestion(false);
  }, [canNextQuestion]);

  const handleCompleteLessonFlow = useCallback(() => {
    if (!canCompleteLesson) return;
    curriculumRef.current?.completeLesson?.();
    setCanCompleteLesson(false);
  }, [canCompleteLesson]);

  const handleNextLessonFlow = useCallback(() => {
    if (!canNextLesson) return;
    curriculumRef.current?.nextLesson?.();
    setCanNextLesson(false);
    setCurrentLesson(null);
    setCurrentQuestion(null);
  }, [canNextLesson]);

  const handleCodeTest = () => {
    const question = currentQuestion;
    if (!question || question.type !== "code_test") return;

    try {
      const { passed, testResults } = evaluateCodeTest(
        code,
        question.testCriteria,
      );

      const displayResults = formatCodeTestResults(testResults);
      if (testResults.length === 0) {
        displayResults.push(
          "⚠️ No test criteria matched - please check the question requirements",
        );
      }

      setResults(displayResults);

      // Submit result - package automatically waits for avatar to finish speaking feedback,
      // then introduces next question and moves to it
      curriculumRef.current?.handleCodeTestResult?.({
        passed: passed,
        results: testResults,
        output: code,
        error: null,
        testCount: testResults.length,
        passedCount: testResults.filter((r) => r.passed).length,
        failedCount: testResults.filter((r) => !r.passed).length,
      });
    } catch (error) {
      // Submit failed result
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      setResults([`⚠️ Error: ${errorMessage}`]);

      curriculumRef.current?.handleCodeTestResult?.({
        passed: false,
        results: [],
        output: code,
        error: errorMessage,
        testCount: 0,
        passedCount: 0,
        failedCount: 1,
      });
    }
  };

  // Start teaching when avatar is ready
  const handleStartTeaching = async () => {
    if (!curriculumRef.current?.isAvatarReady?.()) {
      setTimeout(handleStartTeaching, 1000);
      return;
    }

    try {
      await curriculumRef.current?.resumeAudioContext?.();
    } catch (error) {
      console.warn("Failed to resume audio context:", error);
    }

    // Set the first lesson immediately when starting
    if (curriculum) {
      const firstLesson = getFirstLesson(curriculum);
      if (firstLesson) {
        console.log("Setting first lesson on start:", firstLesson);
        setCurrentLesson(firstLesson);
        setCurrentQuestion(null);
      }
    }

    curriculumRef.current?.startTeaching?.();

    // Mark as started after a brief delay to ensure avatar begins speaking
    setTimeout(() => {
      setLessonStarted(true);
      setCanStartQuestions(false);
      setCanNextQuestion(false);
      setCanCompleteLesson(false);
      setCanNextLesson(false);
    }, 300);
  };

  // Determine if we should show code editor layout (code_test) or question UI layout (multiple_choice/true_false)
  const isCodeTestQuestion = currentQuestion?.type === "code_test";
  const hasActiveExample = !!codeExample || isTypingExample;
  const showCodeEditorLayout = isCodeTestQuestion || hasActiveExample;
  const splitSizes = [35, 65];

  useAvatarAudioRecovery(curriculumRef, false);

  const renderAvatarContainer = (className?: string) =>
    curriculum ? (
      <AvatarContainer
        ref={curriculumRef}
        className={className}
        curriculum={curriculum}
        onCustomAction={handleCustomAction}
        onLessonStart={(data: unknown) => {
                  console.log(
                    "onLessonStart callback - full data:",
                    JSON.stringify(data, null, 2)
                  );
                  setCurrentQuestion(null);
                  setLessonStarted(true);

                  // Try multiple ways to extract lesson ID
                  let lessonId: string | null = null;

                  if (data && typeof data === "object" && data !== null) {
                    const dataObj = data as Record<string, unknown>;

                    if (
                      "lessonId" in dataObj &&
                      typeof dataObj.lessonId === "string"
                    ) {
                      lessonId = dataObj.lessonId;
                    } else if (
                      "id" in dataObj &&
                      typeof dataObj.id === "string"
                    ) {
                      lessonId = dataObj.id;
                    } else if (
                      "lesson_id" in dataObj &&
                      typeof dataObj.lesson_id === "string"
                    ) {
                      lessonId = dataObj.lesson_id;
                    } else if (
                      "lesson" in dataObj &&
                      typeof dataObj.lesson === "object" &&
                      dataObj.lesson !== null
                    ) {
                      const lessonObj = dataObj.lesson as Record<
                        string,
                        unknown
                      >;
                      if (
                        "id" in lessonObj &&
                        typeof lessonObj.id === "string"
                      ) {
                        lessonId = lessonObj.id;
                      }
                    }
                  }

                  // Try to find lesson by ID
                  if (lessonId && curriculum) {
                    const lesson = findLessonById(lessonId, curriculum);
                    if (lesson) {
                      console.log(
                        "Found lesson by ID from onLessonStart:",
                        lessonId,
                        lesson
                      );
                      setCurrentLesson(lesson);
                    } else {
                      console.warn(
                        "Lesson not found by ID from onLessonStart:",
                        lessonId
                      );
                      // Fallback to first lesson
                      const firstLesson = getFirstLesson(curriculum);
                      if (firstLesson) {
                        setCurrentLesson(firstLesson);
                      }
                    }
                  } else if (curriculum) {
                    // Fallback: get first lesson if no ID provided
                    console.log(
                      "No lesson ID found in onLessonStart data, using first lesson as fallback"
                    );
                    const firstLesson = getFirstLesson(curriculum);
                    if (firstLesson) {
                      console.log(
                        "Using first lesson from fallback:",
                        firstLesson
                      );
                      setCurrentLesson(firstLesson);
                    }
                  }
                }}
                onLessonComplete={(data: unknown) => {
                  console.log("Lesson completed:", data);
                  setCurrentQuestion(null);
                  // Ensure audio context is ready for upcoming question
                  curriculumRef.current
                    ?.resumeAudioContext?.()
                    .catch((error) => {
                      console.warn(
                        "Failed to resume audio context on lesson complete:",
                        error
                      );
                    });
                }}
        onQuestionAnswer={(data: unknown) => {
          console.log("Question answered:", data);
        }}
      />
    ) : null;

  const manualControlsPanel = (
    <div className="mb-4 rounded-2xl border border-primary/10 bg-white/60 p-3 shadow-sm backdrop-blur sm:p-4">
      <div className="mb-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">
          Manual Controls
        </p>
        <p className="text-xs text-gray-500 sm:text-sm">
          Drive modules, lessons, or questions on-demand.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <button
          type="button"
          onClick={handleStartQuestionsFlow}
          disabled={!canStartQuestions}
          className={`rounded-xl px-2 py-2 text-xs font-semibold transition-colors sm:px-3 sm:text-sm ${canStartQuestions
            ? "bg-primary text-white shadow hover:bg-primary/90"
            : "cursor-not-allowed bg-gray-200 text-gray-500"
            }`}
        >
          Start Questions
        </button>
        <button
          type="button"
          onClick={handleNextQuestionFlow}
          disabled={!canNextQuestion}
          className={`rounded-xl px-2 py-2 text-xs font-semibold transition-colors sm:px-3 sm:text-sm ${canNextQuestion
            ? "bg-amber-500 text-white shadow hover:bg-amber-600"
            : "cursor-not-allowed bg-gray-200 text-gray-500"
            }`}
        >
          Next Question
        </button>
        <button
          type="button"
          onClick={handleCompleteLessonFlow}
          disabled={!canCompleteLesson}
          className={`rounded-xl px-2 py-2 text-xs font-semibold transition-colors sm:px-3 sm:text-sm ${canCompleteLesson
            ? "bg-emerald-500 text-white shadow hover:bg-emerald-600"
            : "cursor-not-allowed bg-gray-200 text-gray-500"
            }`}
        >
          Complete Lesson
        </button>
        <button
          type="button"
          onClick={handleNextLessonFlow}
          disabled={!canNextLesson}
          className={`rounded-xl px-2 py-2 text-xs font-semibold transition-colors sm:px-3 sm:text-sm ${canNextLesson
            ? "bg-rose-500 text-white shadow hover:bg-rose-600"
            : "cursor-not-allowed bg-gray-200 text-gray-500"
            }`}
        >
          Next Lesson
        </button>
      </div>
    </div>
  );

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
        {/* LEFT SIDE: Question Info + Avatar (desktop) */}
        <div
          className={cn(
            "relative flex min-h-0 flex-col overflow-y-auto scrollbar-hide",
            isLgUp ? "pr-4" : "min-w-0 overflow-hidden",
          )}
        >
          {isLgUp && (
            <>
              {!lessonStarted && (
                <div className="mb-4 pb-4">
                  <StartLessonButton onStart={handleStartTeaching} />
                </div>
              )}
              {lessonStarted && manualControlsPanel}
              {currentQuestion?.type === "code_test" && (
                <QuestionInfo question={currentQuestion} />
              )}
              <div className="relative mt-4 flex h-[220px] min-h-[180px] w-full flex-1 justify-center sm:h-[250px]">
                {renderAvatarContainer()}
              </div>
            </>
          )}
        </div>

        {/* RIGHT SIDE */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {!isLgUp && lessonStarted && (
            <div className="shrink-0 border-b border-primary/10 bg-white/95 px-3 py-3 shadow-sm backdrop-blur-md">
              {manualControlsPanel}
              {currentQuestion?.type === "code_test" && (
                <QuestionInfo question={currentQuestion} />
              )}
            </div>
          )}

          <div className="scrollbar-hide flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto">
          {showCodeEditorLayout ? (
            <div className="flex h-full min-h-0 w-full flex-1 flex-col">
              <Split
                direction="vertical"
                className="flex h-full w-full flex-col"
                sizes={isLgUp ? splitSizes : [55, 45]}
                minSize={isLgUp ? 100 : 80}
                gutterSize={isLgUp ? 8 : 6}
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
                {/* Editor Panel */}
                <CodeEditor
                  code={code}
                  onCodeChange={setCode}
                  onTestCode={handleCodeTest}
                  onToggleFullscreen={() =>
                    setFullscreen(fullscreen === "editor" ? null : "editor")
                  }
                  isFullscreen={fullscreen === "editor"}
                  canTest={
                    !!code.trim() &&
                    !!currentQuestion &&
                    currentQuestion.type === "code_test"
                  }
                />

                {/* Results Panel */}
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
            <div className="relative flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-y-auto border-l-0 border-primary/20 bg-linear-to-br from-[#F3ECFE] via-[#F8F4FF] to-white p-4 sm:p-6 lg:min-h-screen lg:border-l-2">
              {!lessonStarted && !isLgUp && (
                <div className="relative z-10 mb-6">
                  <StartLessonButton
                    onStart={handleStartTeaching}
                    className="w-full py-3 text-base sm:w-auto"
                  />
                </div>
              )}
              {/* Decorative background pattern */}
              <div className="absolute inset-0 opacity-5 pointer-events-none">
                <div className="absolute top-20 right-10 w-32 h-32 bg-primary rounded-full blur-3xl"></div>
                <div className="absolute bottom-20 left-10 w-40 h-40 bg-primary/60 rounded-full blur-3xl"></div>
              </div>

              <div className="relative z-10">
                {currentQuestion ? (
                  <>
                    <div className="mb-4 sm:mb-6">
                      <h3 className="mb-3 text-lg font-bold leading-snug text-gray-900 sm:text-xl lg:text-2xl">
                        {currentQuestion.question}
                      </h3>
                      <div className="h-1 w-20 bg-gradient-to-r from-primary via-primary/80 to-primary/60 rounded-full"></div>
                    </div>

                    {/* Multiple Choice UI */}
                    {currentQuestion.type === "multiple_choice" && (
                      <MultipleChoiceQuestion
                        question={currentQuestion}
                        selectedAnswer={selectedAnswer as string | null}
                        onSelect={handleMultipleChoiceSelect}
                      />
                    )}

                    {/* True/False UI */}
                    {currentQuestion.type === "true_false" && (
                      <TrueFalseQuestion
                        selectedAnswer={selectedAnswer as boolean | null}
                        onSelect={handleTrueFalseSelect}
                      />
                    )}

                    {/* Question Explanation */}
                    {currentQuestion.explanation && (
                      <div className="mt-6 min-w-0 max-w-full overflow-hidden rounded-r-lg border-l-4 border-primary bg-linear-to-br from-primary/10 via-primary/5 to-transparent p-3 shadow-sm backdrop-blur-sm sm:mt-8 sm:p-4">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="mt-0.5 shrink-0">
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
                          </div>
                          <div className="min-w-0 flex-1 overflow-hidden">
                            <strong className="mb-1 block font-semibold text-primary">
                              Hint:
                            </strong>
                            <p className="min-w-0 max-w-full text-sm leading-relaxed text-gray-700 wrap-anywhere">
                              {currentQuestion.explanation}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : currentLesson ? (
                  <div className="space-y-4 sm:space-y-6">
                    <div className="mb-4 sm:mb-6">
                      <div className="mb-2 flex items-center gap-2">
                        <div className="h-2 w-2 animate-pulse rounded-full bg-primary"></div>
                        <span className="text-xs font-medium uppercase tracking-wide text-primary/70 sm:text-sm">
                          Lesson in Progress
                        </span>
                      </div>
                      <h2 className="mb-3 text-xl font-bold leading-tight text-gray-900 sm:text-2xl lg:text-3xl">
                        {currentLesson.title}
                      </h2>
                      <div className="h-1 w-24 bg-gradient-to-r from-primary via-primary/80 to-primary/60 rounded-full"></div>
                    </div>

                    <div className="space-y-3 sm:space-y-4">
                      <div className="rounded-xl border border-primary/20 bg-white/60 p-4 shadow-sm backdrop-blur-sm sm:p-5">
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
                            <h3 className="mb-2 text-base font-semibold text-gray-900 sm:text-lg">
                              Overview
                            </h3>
                            <p className="text-sm leading-relaxed text-gray-700 sm:text-base">
                              {currentLesson.body}
                            </p>
                          </div>
                        </div>
                      </div>

                      {currentLesson.avatar_script && (
                        <div className="rounded-xl border-l-4 border-primary bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4 shadow-sm backdrop-blur-sm sm:p-5">
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
                              <h3 className="mb-2 text-base font-semibold text-primary sm:text-lg">
                                What You'll Learn
                              </h3>
                              <p className="text-sm leading-relaxed text-gray-700 sm:text-base">
                                {currentLesson.avatar_script}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex h-full min-h-[200px] items-center justify-center py-8">
                    <div className="text-center">
                      <div className="mb-4 inline-block h-10 w-10 animate-spin rounded-full border-b-2 border-primary/30 border-t-primary sm:h-12 sm:w-12"></div>
                      <p className="text-base font-medium text-gray-400 sm:text-lg">
                        Waiting to start lesson...
                      </p>
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
              {renderAvatarContainer("h-full w-full")}
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

// ✅ Export main component
export default function CodingExercise() {
  return <CodingExerciseInner />;
}
