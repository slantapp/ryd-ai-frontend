import { useCallback, useState } from "react";
import { Upload, FileJson, AlertCircle, CheckCircle, Download, FileText } from "lucide-react";
import type { CurriculumData } from "../types";
import { sampleCurriculumJSON } from "../templates";

interface FileUploaderProps {
  onCurriculumLoaded: (curriculum: CurriculumData) => void;
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

      if (!Array.isArray(les.questions)) {
        errors.push(
          `Module ${moduleIndex + 1}, Lesson ${lessonIndex + 1} is missing 'questions' array`
        );
      }
    });
  });

  return { valid: errors.length === 0, errors };
}

export function FileUploader({ onCurriculumLoaded }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isValid, setIsValid] = useState(false);
  const [parsedCurriculum, setParsedCurriculum] = useState<CurriculumData | null>(null);

  const handleDownloadTemplate = useCallback(() => {
    const blob = new Blob([sampleCurriculumJSON], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "curriculum-template.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  const processFile = useCallback((file: File) => {
    setError(null);
    setValidationErrors([]);
    setIsValid(false);
    setParsedCurriculum(null);

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

        const validation = validateCurriculum(data);
        if (!validation.valid) {
          setValidationErrors(validation.errors);
          return;
        }

        // Extract curriculum data
        let curriculumData: CurriculumData;
        if ("curriculum" in data) {
          curriculumData = data.curriculum as CurriculumData;
        } else {
          curriculumData = data as CurriculumData;
        }

        setIsValid(true);
        setParsedCurriculum(curriculumData);
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
    if (parsedCurriculum) {
      onCurriculumLoaded(parsedCurriculum);
    }
  };

  const handleReset = () => {
    setError(null);
    setValidationErrors([]);
    setFileName(null);
    setIsValid(false);
    setParsedCurriculum(null);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/10 via-white to-primary/5 p-6 -m-4">
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Curriculum Preview</h1>
          <p className="mt-2 text-gray-600">
            Upload your curriculum JSON file to preview how it will look and function
          </p>
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
              </div>
              {parsedCurriculum && (
                <div className="mt-4 rounded-lg bg-white p-4 text-left shadow-sm">
                  <h3 className="font-semibold text-gray-900">{parsedCurriculum.title}</h3>
                  <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                    {parsedCurriculum.description}
                  </p>
                  <div className="mt-3 flex gap-4 text-sm text-gray-600">
                    <span>{parsedCurriculum.modules.length} modules</span>
                    <span>
                      {parsedCurriculum.modules.reduce(
                        (acc, m) => acc + m.lessons.length,
                        0
                      )}{" "}
                      lessons
                    </span>
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

        <div className="mt-8 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 p-6 border border-primary/20">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-gray-800">Need a template?</h3>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Download our starter template with example modules, lessons, and all three question types (multiple choice, true/false, and code tests). Edit it in any text editor to create your curriculum.
              </p>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/25 transition-all hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/30 active:scale-[0.98]"
              >
                <Download className="h-4 w-4" />
                Download Template
              </button>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-primary/20">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Template includes:</h4>
            <ul className="grid grid-cols-2 gap-2 text-xs text-gray-600">
              <li className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-primary/60" />
                2 sample modules
              </li>
              <li className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-primary/60" />
                3 complete lessons
              </li>
              <li className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-primary/60" />
                Multiple choice questions
              </li>
              <li className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-primary/60" />
                True/false questions
              </li>
              <li className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-primary/60" />
                Code test questions
              </li>
              <li className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-primary/60" />
                Avatar scripts
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
