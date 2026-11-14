import { useCallback, useState } from "react";
import {
  Upload,
  FileJson,
  AlertCircle,
  CheckCircle,
  Download,
  FileText,
  BookOpen,
  Loader2,
} from "lucide-react";
import curriculumV2Guide from "../../../../docs/CURRICULUM_V2_GUIDE.md?raw";
import curriculumV2BackendSpec from "../../../../docs/CURRICULUM_V2_BACKEND_SPEC.md?raw";
import curriculumCodeTestContract from "../../../../docs/CURRICULUM_CODE_TEST_CONTRACT.md?raw";
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
  /** Publish one or more validated files without entering preview. */
  onPublishFiles?: (results: PreviewLoadResult[]) => Promise<void>;
  canPublish?: boolean;
  handoffName?: string;
}

type QueuedFile = {
  key: string;
  file: File;
  result: PreviewLoadResult | null;
  error: string | null;
  validationErrors: string[];
  validationWarnings: string[];
};

function parseCurriculumFile(file: File): Promise<Omit<QueuedFile, "key" | "file">> {
  return new Promise((resolve) => {
    if (!file.name.endsWith(".json")) {
      resolve({
        result: null,
        error: "Please upload a JSON file",
        validationErrors: [],
        validationWarnings: [],
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);

        if (isCurriculumV2(data)) {
          const validation = validateCurriculumV2(data);
          if (!validation.valid) {
            resolve({
              result: null,
              error: null,
              validationErrors: validation.errors,
              validationWarnings: validation.warnings ?? [],
            });
            return;
          }
          const { data: curriculumData, slug } = extractCurriculumV2Data(data);
          resolve({
            result: {
              version: 2,
              data: curriculumData,
              file,
              slug,
            },
            error: null,
            validationErrors: [],
            validationWarnings: validation.warnings ?? [],
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
        resolve({
          result: null,
          error: looksClassic
            ? "Preview only accepts a flow curriculum (v2). This file is a classic v1 curriculum, so it cannot be previewed here."
            : "This file is not a flow curriculum (v2), so preview cannot open it.",
          validationErrors: [],
          validationWarnings: [],
        });
      } catch (err) {
        console.error(err);
        resolve({
          result: null,
          error: "Invalid JSON format. Please check your file.",
          validationErrors: [],
          validationWarnings: [],
        });
      }
    };
    reader.onerror = () => {
      resolve({
        result: null,
        error: "Failed to read file",
        validationErrors: [],
        validationWarnings: [],
      });
    };
    reader.readAsText(file);
  });
}

export function FileUploader({
  onCurriculumLoaded,
  onPublishFiles,
  canPublish = false,
  handoffName,
}: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

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

  const handleDownloadCodeTestContract = useCallback(() => {
    downloadFile(
      curriculumCodeTestContract,
      "CURRICULUM_CODE_TEST_CONTRACT.md",
      "text/markdown;charset=utf-8",
    );
  }, [downloadFile]);

  const processFiles = useCallback(async (files: FileList | File[]) => {
    setPublishError(null);
    const list = Array.from(files);
    if (!list.length) return;
    const next: QueuedFile[] = [];
    for (const file of list) {
      const parsed = await parseCurriculumFile(file);
      next.push({
        key: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        ...parsed,
      });
    }
    setQueue((prev) => [...prev, ...next]);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files?.length) {
        void processFiles(e.dataTransfer.files);
      }
    },
    [processFiles]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.length) {
        void processFiles(e.target.files);
      }
      e.target.value = "";
    },
    [processFiles]
  );

  const validResults = queue.map((q) => q.result).filter(Boolean) as PreviewLoadResult[];
  const hasErrors = queue.some((q) => q.error || q.validationErrors.length);

  const handleReset = () => {
    setQueue([]);
    setPublishError(null);
  };

  const handlePublishAll = async () => {
    if (!onPublishFiles || !validResults.length || publishing) return;
    try {
      setPublishing(true);
      setPublishError(null);
      await onPublishFiles(validResults);
      setQueue([]);
    } catch (err) {
      setPublishError(
        err instanceof Error ? err.message : "Could not publish curriculum file(s).",
      );
    } finally {
      setPublishing(false);
    }
  };

  const handlePublishOne = async (item: QueuedFile) => {
    if (!onPublishFiles || !item.result || publishing) return;
    try {
      setPublishing(true);
      setPublishError(null);
      await onPublishFiles([item.result]);
      setQueue((prev) => prev.filter((q) => q.key !== item.key));
    } catch (err) {
      setPublishError(
        err instanceof Error ? err.message : "Could not publish curriculum.",
      );
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-primary/10 via-white to-primary/5 p-6">
      <div className="w-full max-w-3xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Curriculum Preview</h1>
          <p className="mt-2 text-gray-600">
            Upload one or more flow curriculum (v2) JSON files. Preview any file, or publish without previewing first.
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
            : validResults.length
              ? "border-green-500 bg-green-50"
              : hasErrors
                ? "border-red-300 bg-red-50"
                : "border-gray-300 bg-white hover:border-primary/60 hover:bg-primary/5"
            }`}
        >
          <input
            type="file"
            accept=".json"
            multiple
            onChange={handleFileSelect}
            className="absolute inset-0 cursor-pointer opacity-0"
          />

          <div className="space-y-4">
            <div
              className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
                hasErrors && !validResults.length
                  ? "bg-red-100"
                  : validResults.length
                    ? "bg-green-100"
                    : "bg-primary/15"
              }`}
            >
              {hasErrors && !validResults.length ? (
                <AlertCircle className="h-8 w-8 text-red-600" />
              ) : validResults.length ? (
                <CheckCircle className="h-8 w-8 text-green-600" />
              ) : (
                <Upload className="h-8 w-8 text-primary" />
              )}
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-800">
                {isDragging
                  ? "Drop your files here"
                  : "Drag & drop JSON file(s)"}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                or click to browse — you can select more than one
              </p>
            </div>
          </div>
        </div>

        {queue.length > 0 && (
          <div className="mt-4 space-y-3">
            {queue.map((item) => {
              const ok = !!item.result;
              const title = item.result?.data.title;
              return (
                <div
                  key={item.key}
                  className={`rounded-xl border p-4 ${
                    ok ? "border-green-200 bg-white" : "border-red-200 bg-red-50"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                        <FileJson className="h-4 w-4 shrink-0" />
                        <span className="truncate">{item.file.name}</span>
                        {ok && (
                          <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-bold uppercase text-teal-800">
                            v2
                          </span>
                        )}
                      </div>
                      {title && (
                        <p className="mt-1 text-sm text-gray-600 truncate">{title}</p>
                      )}
                      {item.error && (
                        <p className="mt-1 text-sm text-red-700">{item.error}</p>
                      )}
                      {item.validationErrors.length > 0 && (
                        <ul className="mt-1 space-y-0.5 text-sm text-red-700">
                          {item.validationErrors.slice(0, 5).map((err, i) => (
                            <li key={i}>{err}</li>
                          ))}
                          {item.validationErrors.length > 5 && (
                            <li>…and {item.validationErrors.length - 5} more</li>
                          )}
                        </ul>
                      )}
                      {item.validationWarnings.length > 0 && (
                        <ul className="mt-1 space-y-0.5 text-sm text-amber-800">
                          {item.validationWarnings.slice(0, 4).map((warn, i) => (
                            <li key={i}>{warn}</li>
                          ))}
                          {item.validationWarnings.length > 4 && (
                            <li>…and {item.validationWarnings.length - 4} more warnings</li>
                          )}
                        </ul>
                      )}
                    </div>
                    {ok && item.result && (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => onCurriculumLoaded(item.result!)}
                          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-800 hover:bg-gray-50"
                        >
                          Preview
                        </button>
                        {canPublish && onPublishFiles && (
                          <button
                            type="button"
                            disabled={publishing}
                            onClick={() => void handlePublishOne(item)}
                            className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60"
                          >
                            Publish
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {publishError && (
          <div className="mt-4 rounded-lg bg-red-50 p-4 text-red-800">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p className="font-medium">{publishError}</p>
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          {queue.length > 0 && (
            <button
              type="button"
              onClick={handleReset}
              disabled={publishing}
              className="flex-1 rounded-xl border border-gray-300 bg-white py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60"
            >
              Clear all
            </button>
          )}
          {canPublish && onPublishFiles && validResults.length > 0 && (
            <button
              type="button"
              onClick={() => void handlePublishAll()}
              disabled={publishing}
              className="flex-1 rounded-xl bg-primary py-3 font-semibold text-white shadow-lg shadow-primary/30 transition-all hover:bg-primary/90 hover:shadow-xl disabled:opacity-60"
            >
              {publishing ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Publishing…
                </span>
              ) : validResults.length === 1 ? (
                "Publish without preview"
              ) : (
                `Publish all ${validResults.length} without preview`
              )}
            </button>
          )}
          {!canPublish && validResults.length === 1 && (
            <button
              type="button"
              onClick={() => onCurriculumLoaded(validResults[0])}
              className="flex-1 rounded-xl bg-primary py-3 font-semibold text-white shadow-lg shadow-primary/30 transition-all hover:bg-primary/90 hover:shadow-xl"
            >
              Start Preview
            </button>
          )}
        </div>

        {!canPublish && (
          <p className="mt-3 text-center text-xs text-gray-500">
            Open this page from Admin → Manage Curriculum → Preview upload (or a teacher
            handoff) to publish from this screen.
          </p>
        )}

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
              <button
                type="button"
                onClick={handleDownloadCodeTestContract}
                className="inline-flex items-center gap-2 rounded-lg border border-amber-500/70 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-900 transition-all hover:bg-amber-100"
              >
                <FileText className="h-4 w-4" />
                Code test contract
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
