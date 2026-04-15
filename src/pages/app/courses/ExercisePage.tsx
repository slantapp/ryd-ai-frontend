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

  // Handle code test execution (updated to match NewExcercis.tsx logic)
  const handleCodeTest = () => {
    const question = currentQuestion;
    if (!question || question.type !== "code_test") return;

    let passed = false;
    const testResults: Array<{
      test: string;
      passed: boolean;
      actual?: unknown;
      expected?: unknown;
    }> = [];

    try {
      // Test based on question criteria
      if (
        question.testCriteria?.expectedVariable &&
        question.testCriteria.expectedValues
      ) {
        // Test array (check for expectedValues first)
        const testCode = `${code}; Array.isArray(${question.testCriteria.expectedVariable})`;
        const isArray = eval(testCode) as boolean;

        if (isArray) {
          const actualArray = eval(
            `${code}; ${question.testCriteria.expectedVariable}`
          );
          passed =
            JSON.stringify(actualArray) ===
            JSON.stringify(question.testCriteria.expectedValues);
          testResults.push({
            test: `Array '${question.testCriteria.expectedVariable}' matches expected values`,
            passed: passed,
            actual: actualArray,
            expected: question.testCriteria.expectedValues,
          });
        }
      } else if (question.testCriteria?.expectedVariable) {
        // Check if variable exists and has correct value
        const testCode = `${code}; typeof ${question.testCriteria.expectedVariable} !== 'undefined'`;
        const varExists = eval(testCode) as boolean;

        if (varExists && question.testCriteria.expectedValue !== undefined) {
          const actualValue = eval(
            `${code}; ${question.testCriteria.expectedVariable}`
          );
          passed = actualValue === question.testCriteria.expectedValue;
          testResults.push({
            test: `Variable '${question.testCriteria.expectedVariable}' has value '${question.testCriteria.expectedValue}'`,
            passed: passed,
            actual: actualValue,
            expected: question.testCriteria.expectedValue,
          });
        } else {
          passed = varExists;
          testResults.push({
            test: `Variable '${question.testCriteria.expectedVariable}' exists`,
            passed: passed,
          });
        }
      } else if (question.testCriteria?.expectedHTML) {
        // Test HTML code - check if code contains expected HTML pattern
        const expectedHTML = question.testCriteria.expectedHTML.toLowerCase();
        const codeLower = code.toLowerCase();

        // Remove whitespace for comparison to be more flexible
        const normalizedExpected = expectedHTML.replace(/\s+/g, " ").trim();
        const normalizedCode = codeLower.replace(/\s+/g, " ").trim();

        // Check if the code contains the expected HTML pattern
        passed = normalizedCode.includes(normalizedExpected);

        testResults.push({
          test: `Code contains expected HTML: ${expectedHTML}`,
          passed: passed,
          actual: code.trim() || "(empty)",
          expected: expectedHTML,
        });
      } else if (question.testCriteria?.expectedFunction) {
        // Test function
        const testCode = `${code}; typeof ${question.testCriteria.expectedFunction} === 'function'`;
        const funcExists = eval(testCode) as boolean;

        if (!funcExists) {
          // Function doesn't exist - fail immediately
          passed = false;
          testResults.push({
            test: `Function '${question.testCriteria.expectedFunction}' exists`,
            passed: false,
          });
        } else if (
          question.testCriteria.testCases &&
          question.testCriteria.testCases.length > 0
        ) {
          // Test function with test cases - initialize passed to true (all must pass)
          passed = true;
          question.testCriteria.testCases.forEach((testCase, index) => {
            try {
              const funcCall = `${question.testCriteria?.expectedFunction
                }(${testCase.input
                  .map((v: unknown) =>
                    typeof v === "string" ? `"${v}"` : String(v)
                  )
                  .join(", ")})`;
              const actualResult = eval(`${code}; ${funcCall}`);
              const testPassed = actualResult === testCase.expected;
              passed = passed && testPassed; // All tests must pass

              testResults.push({
                test: `Test case ${index + 1}: ${funcCall} === ${JSON.stringify(
                  testCase.expected
                )}`,
                passed: testPassed,
                actual: actualResult,
                expected: testCase.expected,
              });
            } catch {
              // Individual test case failed
              passed = false;
              testResults.push({
                test: `Test case ${index + 1}: Execution error`,
                passed: false,
              });
            }
          });
        } else {
          // Function exists but no test cases - just check existence
          passed = true;
          testResults.push({
            test: `Function '${question.testCriteria.expectedFunction}' exists`,
            passed: true,
          });
        }
      }

      // Update results display
      const displayResults = testResults.map((r) => {
        if (r.passed) {
          return `✅ PASS: ${r.test}`;
        } else {
          return `❌ FAIL: ${r.test}${r.actual !== undefined || r.expected !== undefined
            ? ` (got: ${JSON.stringify(r.actual)}, expected: ${JSON.stringify(
              r.expected
            )})`
            : ""
            }`;
        }
      });

      // If no test results were generated, add a generic failure
      if (testResults.length === 0) {
        displayResults.push(
          "⚠️ No test criteria matched - please check the question requirements"
        );
        testResults.push({
          test: "Code test execution",
          passed: false,
        });
        passed = false;
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
          {/* Start Lesson Button - shown only when lesson hasn't started */}
          {!lessonStarted && (
            <div className="mb-4 pb-4">
              <StartLessonButton onStart={handleStartTeaching} />
            </div>
          )}
          {lessonStarted && (
            <div className="mb-4 rounded-2xl border border-primary/10 bg-white/60 p-4 shadow-sm backdrop-blur">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">
                    Manual Controls
                  </p>
                  <p className="text-sm text-gray-500">
                    Drive modules, lessons, or questions on-demand.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleStartQuestionsFlow}
                  disabled={!canStartQuestions}
                  className={`rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${canStartQuestions
                    ? "bg-primary text-white shadow hover:bg-primary/90"
                    : "bg-gray-200 text-gray-500 cursor-not-allowed"
                    }`}
                >
                  Start Questions
                </button>
                <button
                  onClick={handleNextQuestionFlow}
                  disabled={!canNextQuestion}
                  className={`rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${canNextQuestion
                    ? "bg-amber-500 text-white shadow hover:bg-amber-600"
                    : "bg-gray-200 text-gray-500 cursor-not-allowed"
                    }`}
                >
                  Next Question
                </button>
                <button
                  onClick={handleCompleteLessonFlow}
                  disabled={!canCompleteLesson}
                  className={`rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${canCompleteLesson
                    ? "bg-emerald-500 text-white shadow hover:bg-emerald-600"
                    : "bg-gray-200 text-gray-500 cursor-not-allowed"
                    }`}
                >
                  Complete Lesson
                </button>
                <button
                  onClick={handleNextLessonFlow}
                  disabled={!canNextLesson}
                  className={`rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${canNextLesson
                    ? "bg-rose-500 text-white shadow hover:bg-rose-600"
                    : "bg-gray-200 text-gray-500 cursor-not-allowed"
                    }`}
                >
                  Next Lesson / Module
                </button>
              </div>
            </div>
          )}
          {currentQuestion && currentQuestion.type === "code_test" && (
            <QuestionInfo question={currentQuestion} />
          )}
          <div className="flex justify-center w-full h-[250px] mt-4 flex-1 relative">
            {curriculum && (
              <AvatarContainer
                ref={curriculumRef}
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
            )}
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="overflow-y-auto min-h-0 flex flex-col scrollbar-hide w-full">
          {showCodeEditorLayout ? (
            <div className="flex flex-col min-h-0 h-full flex-1 w-full">
              <Split
                direction="vertical"
                className="flex flex-col h-full w-full"
                sizes={splitSizes}
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
            <div className="w-full bg-linear-to-br from-[#F3ECFE] via-[#F8F4FF] to-white p-6 overflow-y-auto border-l-2 border-primary/20 min-h-screen flex flex-col relative">
              {/* Decorative background pattern */}
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
                      <div className="mt-8 p-4 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-l-4 border-primary rounded-r-lg shadow-sm backdrop-blur-sm">
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
                      <div className="h-1 w-24 bg-gradient-to-r from-primary via-primary/80 to-primary/60 rounded-full"></div>
                    </div>

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
                        <div className="p-5 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-xl border-l-4 border-primary shadow-sm backdrop-blur-sm">
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

// ✅ Export main component
export default function CodingExercise() {
  return <CodingExerciseInner />;
}
