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
import curriculumV2Guide from "../../../../docs/CURRICULUM_V2_GUIDE.md?raw";
import curriculumV2BackendSpec from "../../../../docs/CURRICULUM_V2_BACKEND_SPEC.md?raw";
import {
  extractCurriculumV2Data,
  isCurriculumV2,
  sampleV2CurriculumJSON,
  V2_TEMPLATE_FILENAME,
  validateCurriculumV2,
  type PreviewLoadResult,
} from "../v2";

interface FileUploaderProps {
  onCurriculumLoaded: (result: PreviewLoadResult) => void;
  handoffName?: string;
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
  const [schemaBadge, setSchemaBadge] = useState<"v2" | null>(null);

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

  const handleDownloadV2Sample = useCallback(
    (json: string, filename: string) => {
      downloadFile(json, filename, "application/json");
    },
    [downloadFile],
  );

  const handleDownloadV2Guide = useCallback(() => {
    downloadFile(
      curriculumV2Guide,
      "CURRICULUM_V2_GUIDE.md",
      "text/markdown;charset=utf-8",
    );
  }, [downloadFile]);

  const handleDownloadV2BackendSpec = useCallback(() => {
    downloadFile(
      curriculumV2BackendSpec,
      "CURRICULUM_V2_BACKEND_SPEC.md",
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

        const record = data as Record<string, unknown>;
        const wrapped = record.curriculum;
        const looksClassic =
          (Array.isArray(record.modules) && typeof record.title === "string") ||
          (!!wrapped &&
            typeof wrapped === "object" &&
            Array.isArray((wrapped as { modules?: unknown }).modules));
        setError(
          looksClassic
            ? "Preview only accepts a flow curriculum (v2). This file is a classic v1 curriculum, so it cannot be previewed here."
            : "This file is not a flow curriculum (v2), so preview cannot open it.",
        );
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
            Upload a flow curriculum (v2) JSON to preview the student experience
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
                    Flow curriculum (v2)
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
              <h3 className="font-semibold text-teal-900">Flow curriculum (v2)</h3>
              <span className="rounded-full bg-teal-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                Recommended
              </span>
            </div>
            <p className="mb-4 text-sm text-teal-900/80">
              One template with every sample scenario: JavaScript lessons, a formula
              and media beat, live subtitles, Python Turtle, and avatar gestures.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() =>
                  handleDownloadV2Sample(sampleV2CurriculumJSON, V2_TEMPLATE_FILENAME)
                }
                className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-teal-700"
              >
                <Download className="h-4 w-4" />
                Download template
              </button>
              <button
                type="button"
                onClick={handleDownloadV2Guide}
                className="inline-flex items-center gap-2 rounded-lg border-2 border-teal-600 bg-white px-4 py-2.5 text-sm font-semibold text-teal-700 transition-all hover:bg-teal-50"
              >
                <Download className="h-4 w-4" />
                Download v2 guide
              </button>
              <button
                type="button"
                onClick={handleDownloadV2BackendSpec}
                className="inline-flex items-center gap-2 rounded-lg border border-teal-500/60 bg-teal-50/80 px-4 py-2.5 text-sm font-semibold text-teal-800 transition-all hover:bg-teal-100"
              >
                <BookOpen className="h-4 w-4" />
                Backend validation spec
              </button>
            </div>
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
