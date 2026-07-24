import { useCallback, useState } from "react";
import {
  Upload,
  FileJson,
  AlertCircle,
  CheckCircle,
  Download,
  FileText,
  BookOpen,
} from "lucide-react";
import type { CurriculumData } from "../types";
import { sampleCurriculumJSON, sampleMathCurriculumJSON } from "../templates";
import curriculumJsonGuide from "../../../../docs/CURRICULUM_JSON_GUIDE.md?raw";
import curriculumV2Guide from "../../../../docs/CURRICULUM_V2_GUIDE.md?raw";
import {
  extractCurriculumV2Data,
  isCurriculumV2,
  sampleV2CurriculumJSON,
  validateCurriculumV2,
  type PreviewLoadResult,
} from "../v2";

interface FileUploaderProps {
  onCurriculumLoaded: (result: PreviewLoadResult) => void;
  handoffName?: string;
}

function validateCodeExampleField(
  value: unknown,
  label: string,
  errors: string[],
): void {
  if (!value || typeof value !== "object") {
    errors.push(`${label}: 'code_example' must be an object`);
    return;
  }

  const ex = value as Record<string, unknown>;

  if (!ex.code || typeof ex.code !== "string") {
    errors.push(`${label}: code_example requires a 'code' string`);
  }

  if (!ex.language || typeof ex.language !== "string") {
    errors.push(`${label}: code_example requires a 'language' string`);
  }

  if (ex.description !== undefined && typeof ex.description !== "string") {
    errors.push(`${label}: code_example 'description' must be a string`);
  }

  if (ex.explanation !== undefined && typeof ex.explanation !== "string") {
    errors.push(`${label}: code_example 'explanation' must be a string`);
  }

  if (ex.autoRun !== undefined && typeof ex.autoRun !== "boolean") {
    errors.push(`${label}: code_example 'autoRun' must be a boolean`);
  }

  if (ex.starterCode !== undefined && typeof ex.starterCode !== "string") {
    errors.push(`${label}: code_example 'starterCode' must be a string`);
  }

  if (
    ex.typingSpeed !== undefined &&
    (typeof ex.typingSpeed !== "number" || !Number.isFinite(ex.typingSpeed))
  ) {
    errors.push(`${label}: code_example 'typingSpeed' must be a number`);
  }
}

function validateCurriculum(data: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data || typeof data !== "object") {
    errors.push("File must contain a valid JSON object");
    return { valid: false, errors };
  }

  const obj = data as Record<string, unknown>;

  // Check if it's a Curriculum wrapper or direct CurriculumData
  let curriculumData: Record<string, unknown>;
  if ("curriculum" in obj && typeof obj.curriculum === "object" && obj.curriculum) {
    curriculumData = obj.curriculum as Record<string, unknown>;
  } else if ("title" in obj && "modules" in obj) {
    curriculumData = obj;
  } else {
    errors.push("Invalid structure: must have 'title' and 'modules', or be wrapped in 'curriculum'");
    return { valid: false, errors };
  }

  if (!curriculumData.title || typeof curriculumData.title !== "string") {
    errors.push("Missing or invalid 'title' field");
  }

  if (!curriculumData.description || typeof curriculumData.description !== "string") {
    errors.push("Missing or invalid 'description' field");
  }

  if (
    typeof curriculumData.age !== "number" ||
    !Number.isFinite(curriculumData.age) ||
    curriculumData.age < 1
  ) {
    errors.push(
      "Missing or invalid 'age' field (number — minimum recommended learner age in years)",
    );
  }

  if (!curriculumData.class || typeof curriculumData.class !== "string") {
    errors.push(
      "Missing or invalid 'class' field (string — e.g. \"Primary 5\" or \"JSS 1\")",
    );
  }

  if (
    curriculumData.grade !== undefined &&
    (typeof curriculumData.grade !== "number" ||
      !Number.isFinite(curriculumData.grade) ||
      curriculumData.grade < 1 ||
      curriculumData.grade > 12)
  ) {
    errors.push(
      "Invalid 'grade' field (optional number 1–12, shown as Gr. N alongside class)",
    );
  }

  const validLevels = ["Beginner", "Intermediate", "Advanced"];
  if (
    curriculumData.duration !== undefined &&
    (typeof curriculumData.duration !== "string" ||
      !curriculumData.duration.trim())
  ) {
    errors.push(
      'Invalid \'duration\' field (optional string — e.g. "6 weeks")',
    );
  }

  if (
    curriculumData.level !== undefined &&
    (typeof curriculumData.level !== "string" ||
      !validLevels.includes(curriculumData.level))
  ) {
    errors.push(
      "Invalid 'level' field (optional — must be Beginner, Intermediate, or Advanced)",
    );
  }

  if (
    curriculumData.rating !== undefined &&
    (typeof curriculumData.rating !== "number" ||
      !Number.isFinite(curriculumData.rating) ||
      curriculumData.rating < 0 ||
      curriculumData.rating > 5)
  ) {
    errors.push("Invalid 'rating' field (optional number from 0 to 5)");
  }

  if (
    !curriculumData.category ||
    typeof curriculumData.category !== "string" ||
    !curriculumData.category.trim()
  ) {
    errors.push("Missing or invalid 'category' field (non-empty string)");
  }

  if (!Array.isArray(curriculumData.modules)) {
    errors.push("Missing or invalid 'modules' array");
    return { valid: false, errors };
  }

  if (curriculumData.modules.length === 0) {
    errors.push("Curriculum must have at least one module");
  }

  (curriculumData.modules as unknown[]).forEach((module, moduleIndex) => {
    if (!module || typeof module !== "object") {
      errors.push(`Module ${moduleIndex + 1} is invalid`);
      return;
    }

    const mod = module as Record<string, unknown>;

    if (!mod.id) {
      errors.push(`Module ${moduleIndex + 1} is missing 'id'`);
    }

    if (!mod.title) {
      errors.push(`Module ${moduleIndex + 1} is missing 'title'`);
    }

    if (!Array.isArray(mod.lessons)) {
      errors.push(`Module ${moduleIndex + 1} is missing 'lessons' array`);
      return;
    }

    (mod.lessons as unknown[]).forEach((lesson, lessonIndex) => {
      if (!lesson || typeof lesson !== "object") {
        errors.push(`Module ${moduleIndex + 1}, Lesson ${lessonIndex + 1} is invalid`);
        return;
      }

      const les = lesson as Record<string, unknown>;

      if (!les.id) {
        errors.push(`Module ${moduleIndex + 1}, Lesson ${lessonIndex + 1} is missing 'id'`);
      }

      if (!les.title) {
        errors.push(`Module ${moduleIndex + 1}, Lesson ${lessonIndex + 1} is missing 'title'`);
      }

      if (!les.body && !les.avatar_script) {
        errors.push(
          `Module ${moduleIndex + 1}, Lesson ${lessonIndex + 1} needs 'body' or 'avatar_script'`
        );
      }

      if (les.code_example) {
        if (curriculumData.category === "mathematics") {
          errors.push(
            `Module ${moduleIndex + 1}, Lesson ${lessonIndex + 1}: code_example is not supported in mathematics curricula`,
          );
        } else {
          validateCodeExampleField(
            les.code_example,
            `Module ${moduleIndex + 1}, Lesson ${lessonIndex + 1}`,
            errors,
          );
        }
      }

      if (les.formula_example) {
        if (curriculumData.category !== "mathematics") {
          errors.push(
            `Module ${moduleIndex + 1}, Lesson ${lessonIndex + 1}: formula_example is only supported in mathematics curricula`,
          );
        } else {
          const fe = les.formula_example as Record<string, unknown>;
          if (!fe.formula || typeof fe.formula !== "string") {
            errors.push(
              `Module ${moduleIndex + 1}, Lesson ${lessonIndex + 1}: formula_example requires a 'formula' string`,
            );
          }
        }
      }

      if (!Array.isArray(les.questions)) {
        errors.push(
          `Module ${moduleIndex + 1}, Lesson ${lessonIndex + 1} is missing 'questions' array`
        );
        return;
      }

      (les.questions as unknown[]).forEach((question, questionIndex) => {
        if (!question || typeof question !== "object") return;

        const q = question as Record<string, unknown>;
        const qType = q.type;
        const label = `Module ${moduleIndex + 1}, Lesson ${lessonIndex + 1}, Question ${questionIndex + 1}`;

        if (curriculumData.category === "mathematics" && q.code_example) {
          errors.push(
            `${label}: code_example is not supported in mathematics curricula`,
          );
        } else if (qType !== "code_test" && q.code_example) {
          errors.push(
            `${label}: 'code_example' is only allowed on code_test questions or at the lesson level (coding curricula only)`,
          );
        }

        if (
          curriculumData.category !== "mathematics" &&
          qType === "code_test" &&
          q.code_example
        ) {
          validateCodeExampleField(q.code_example, label, errors);
        }

        if (qType === "formula_test") {
          const criteria = q.testCriteria as Record<string, unknown> | undefined;
          if (
            !criteria?.expectedFormula ||
            typeof criteria.expectedFormula !== "string"
          ) {
            errors.push(
              `${label}: formula_test requires testCriteria.expectedFormula`,
            );
          }
        } else if (q.formula_example) {
          errors.push(
            `${label}: 'formula_example' is only allowed on formula_test questions or at the lesson level`,
          );
        }

        if (
          curriculumData.category === "mathematics" &&
          qType === "code_test"
        ) {
          errors.push(
            `${label}: code_test is not supported in mathematics curricula — use formula_test instead`,
          );
        }

        if (
          curriculumData.category !== "mathematics" &&
          qType === "formula_test"
        ) {
          errors.push(
            `${label}: formula_test is only supported when category is "mathematics"`,
          );
        }
      });
    });
  });

  return { valid: errors.length === 0, errors };
}

export function FileUploader({
  onCurriculumLoaded,
  handoffName,
}: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isValid, setIsValid] = useState(false);
  const [parsedResult, setParsedResult] = useState<PreviewLoadResult | null>(null);
  const [schemaBadge, setSchemaBadge] = useState<"v1" | "v2" | null>(null);

  const downloadFile = useCallback(
    (content: string, filename: string, mimeType: string) => {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
    []
  );

  const handleDownloadCodingTemplate = useCallback(() => {
    downloadFile(
      sampleCurriculumJSON,
      "coding-curriculum-template.json",
      "application/json",
    );
  }, [downloadFile]);

  const handleDownloadMathTemplate = useCallback(() => {
    downloadFile(
      sampleMathCurriculumJSON,
      "math-curriculum-template.json",
      "application/json",
    );
  }, [downloadFile]);

  const handleDownloadGuide = useCallback(() => {
    downloadFile(
      curriculumJsonGuide,
      "CURRICULUM_JSON_GUIDE.md",
      "text/markdown;charset=utf-8"
    );
  }, [downloadFile]);

  const handleDownloadV2Template = useCallback(() => {
    downloadFile(
      sampleV2CurriculumJSON,
      "flow-curriculum-v2-template.json",
      "application/json",
    );
  }, [downloadFile]);

  const handleDownloadV2Guide = useCallback(() => {
    downloadFile(
      curriculumV2Guide,
      "CURRICULUM_V2_GUIDE.md",
      "text/markdown;charset=utf-8",
    );
  }, [downloadFile]);

  const processFile = useCallback((file: File) => {
    setError(null);
    setValidationErrors([]);
    setIsValid(false);
    setParsedResult(null);
    setSchemaBadge(null);

    if (!file.name.endsWith(".json")) {
      setError("Please upload a JSON file");
      return;
    }

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);

        if (isCurriculumV2(data)) {
          const validation = validateCurriculumV2(data);
          if (!validation.valid) {
            setValidationErrors(validation.errors);
            return;
          }
          const { data: curriculumData, slug } = extractCurriculumV2Data(data);
          setIsValid(true);
          setSchemaBadge("v2");
          setParsedResult({
            version: 2,
            data: curriculumData,
            file,
            slug,
          });
          return;
        }

        const validation = validateCurriculum(data);
        if (!validation.valid) {
          setValidationErrors(validation.errors);
          return;
        }

        let curriculumData: CurriculumData;
        if ("curriculum" in data) {
          curriculumData = data.curriculum as CurriculumData;
        } else {
          curriculumData = data as CurriculumData;
        }

        setIsValid(true);
        setSchemaBadge("v1");
        setParsedResult({ version: 1, data: curriculumData, file });
      } catch (err) {
        console.error(err);
        setError("Invalid JSON format. Please check your file.");
      }
    };
    reader.onerror = () => {
      setError("Failed to read file");
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) {
        processFile(file);
      }
    },
    [processFile]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        processFile(file);
      }
    },
    [processFile]
  );

  const handleSubmit = () => {
    if (!parsedResult) return;
    onCurriculumLoaded(parsedResult);
  };

  const handleReset = () => {
    setError(null);
    setValidationErrors([]);
    setFileName(null);
    setIsValid(false);
    setParsedResult(null);
    setSchemaBadge(null);
  };

  const parsedTitle = parsedResult?.data.title ?? null;
  const parsedDescription = parsedResult?.data.description ?? null;
  const moduleCount = parsedResult?.data.modules.length ?? 0;
  const lessonCount =
    parsedResult?.data.modules.reduce((acc, m) => acc + m.lessons.length, 0) ??
    0;

  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-primary/10 via-white to-primary/5 p-6">
      <div className="w-full max-w-3xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Curriculum Preview</h1>
          <p className="mt-2 text-gray-600">
            Upload a v1 or flow-based v2 curriculum JSON to preview the student experience
          </p>
          {handoffName && (
            <p className="mt-2 text-sm font-medium text-primary">
              Welcome, {handoffName}
            </p>
          )}
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`relative rounded-2xl border-2 border-dashed p-12 text-center transition-all ${isDragging
            ? "border-primary bg-primary/10"
            : isValid
              ? "border-green-500 bg-green-50"
              : error || validationErrors.length > 0
                ? "border-red-300 bg-red-50"
                : "border-gray-300 bg-white hover:border-primary/60 hover:bg-primary/5"
            }`}
        >
          <input
            type="file"
            accept=".json"
            onChange={handleFileSelect}
            className="absolute inset-0 cursor-pointer opacity-0"
          />

          {isValid ? (
            <div className="space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <p className="text-lg font-semibold text-green-800">File validated!</p>
                <p className="text-sm text-gray-600">{fileName}</p>
                {schemaBadge && (
                  <span
                    className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                      schemaBadge === "v2"
                        ? "bg-teal-100 text-teal-800"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {schemaBadge === "v2" ? "Flow curriculum (v2)" : "Classic curriculum (v1)"}
                  </span>
                )}
              </div>
              {parsedTitle && (
                <div className="mt-4 rounded-lg bg-white p-4 text-left shadow-sm">
                  <h3 className="font-semibold text-gray-900">{parsedTitle}</h3>
                  <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                    {parsedDescription}
                  </p>
                  <div className="mt-3 flex gap-4 text-sm text-gray-600">
                    <span>{moduleCount} modules</span>
                    <span>{lessonCount} lessons</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div
                className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${error || validationErrors.length > 0 ? "bg-red-100" : "bg-primary/15"
                  }`}
              >
                {error || validationErrors.length > 0 ? (
                  <AlertCircle className="h-8 w-8 text-red-600" />
                ) : (
                  <Upload className="h-8 w-8 text-primary" />
                )}
              </div>
              <div>
                <p className="text-lg font-semibold text-gray-800">
                  {isDragging ? "Drop your file here" : "Drag & drop your JSON file"}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  or click to browse your files
                </p>
              </div>
              {fileName && !isValid && (
                <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                  <FileJson className="h-4 w-4" />
                  <span>{fileName}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 p-4 text-red-800">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p className="font-medium">{error}</p>
            </div>
          </div>
        )}

        {validationErrors.length > 0 && (
          <div className="mt-4 rounded-lg bg-red-50 p-4">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p className="font-medium">Validation errors:</p>
            </div>
            <ul className="mt-2 space-y-1 text-sm text-red-700">
              {validationErrors.slice(0, 10).map((err, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
                  {err}
                </li>
              ))}
              {validationErrors.length > 10 && (
                <li className="text-red-600">
                  ...and {validationErrors.length - 10} more errors
                </li>
              )}
            </ul>
          </div>
        )}

        <div className="mt-6 flex gap-4">
          {(isValid || error || validationErrors.length > 0) && (
            <button
              type="button"
              onClick={handleReset}
              className="flex-1 rounded-xl border border-gray-300 bg-white py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-50"
            >
              Upload Different File
            </button>
          )}
          {isValid && (
            <button
              type="button"
              onClick={handleSubmit}
              className="flex-1 rounded-xl bg-primary py-3 font-semibold text-white shadow-lg shadow-primary/30 transition-all hover:bg-primary/90 hover:shadow-xl"
            >
              Start Preview
            </button>
          )}
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border-2 border-teal-200 bg-linear-to-br from-teal-50 to-cyan-50 p-6 sm:col-span-2 lg:col-span-3">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <SparklesIcon />
              <h3 className="font-semibold text-teal-900">New: Flow curriculum (v2)</h3>
              <span className="rounded-full bg-teal-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                Recommended
              </span>
            </div>
            <p className="mb-4 text-sm text-teal-900/80">
              Beat-based lessons that feel like a real class — hooks, demos, mid-lesson
              checks, pauses, and recaps. Best for the kid-friendly preview player.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleDownloadV2Template}
                className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-teal-700"
              >
                <Download className="h-4 w-4" />
                Download v2 template
              </button>
              <button
                type="button"
                onClick={handleDownloadV2Guide}
                className="inline-flex items-center gap-2 rounded-lg border-2 border-teal-600 bg-white px-4 py-2.5 text-sm font-semibold text-teal-700 transition-all hover:bg-teal-50"
              >
                <Download className="h-4 w-4" />
                Download v2 guide
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-primary/20 bg-linear-to-br from-primary/10 to-primary/5 p-6">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-gray-800">Coding template (v1)</h3>
              </div>
              <p className="mb-4 text-sm text-gray-600">
                Classic coding courses with body, avatar_script, and questions.
              </p>
              <button
                type="button"
                onClick={handleDownloadCodingTemplate}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/25 transition-all hover:bg-primary/90"
              >
                <Download className="h-4 w-4" />
                Download coding template
              </button>
          </div>

          <div className="rounded-xl border border-primary/20 bg-linear-to-br from-primary/10 to-primary/5 p-6">
            <div className="mb-2 flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-gray-800">Math template (v1)</h3>
            </div>
            <p className="mb-4 text-sm text-gray-600">
              Classic mathematics courses with formula examples and formula tests.
            </p>
            <button
              type="button"
              onClick={handleDownloadMathTemplate}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/25 transition-all hover:bg-primary/90"
            >
              <Download className="h-4 w-4" />
              Download math template
            </button>
          </div>

          <div className="rounded-xl border border-primary/20 bg-linear-to-br from-primary/10 to-primary/5 p-6">
            <div className="mb-2 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-gray-800">v1 writing guide</h3>
            </div>
            <p className="mb-4 text-sm text-gray-600">
              Field reference for the classic curriculum JSON format.
            </p>
            <button
              type="button"
              onClick={handleDownloadGuide}
              className="inline-flex items-center gap-2 rounded-lg border-2 border-primary bg-white px-4 py-2.5 text-sm font-semibold text-primary transition-all hover:bg-primary/5 active:scale-[0.98]"
            >
              <Download className="h-4 w-4" />
              Download Guide
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SparklesIcon() {
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 text-white">
      <FileText className="h-4 w-4" />
    </span>
  );
}
