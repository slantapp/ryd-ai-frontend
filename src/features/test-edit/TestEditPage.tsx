import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  AlertCircle,
  CheckCircle2,
  FileJson,
  Loader2,
  Save,
  Wand2,
} from "lucide-react";
import {
  MonacoEditorLazy,
  prefetchMonacoEditor,
} from "@/components/courses/exercise/MonacoEditorLazy";
import {
  buildEditableTestDocument,
  decodeTestHandoff,
  fetchAdminTest,
  isAdminTestEditHandoff,
  parseTestImportDocument,
  replaceAdminTestContent,
  TestApiError,
} from "./handoff";

type LoadStatus = "idle" | "loading" | "success" | "error";
type SaveStatus = "idle" | "saving" | "saved";

function formatJsonDocument(raw: string): string {
  const parsed = JSON.parse(raw) as unknown;
  return JSON.stringify(parsed, null, 2);
}

export default function TestEditPage() {
  const [searchParams] = useSearchParams();
  const handoffCode = searchParams.get("code");

  const handoff = useMemo(() => {
    if (!handoffCode) {
      return { data: null, error: "No test edit code found in the URL." };
    }
    try {
      return { data: decodeTestHandoff(handoffCode), error: null };
    } catch {
      return { data: null, error: "Invalid test edit code." };
    }
  }, [handoffCode]);

  const isEditMode = handoff.data ? isAdminTestEditHandoff(handoff.data) : false;

  const [loadStatus, setLoadStatus] = useState<LoadStatus>("idle");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [title, setTitle] = useState<string>("");
  const [slug, setSlug] = useState<string>("");
  const [editorValue, setEditorValue] = useState("");
  const [baselineValue, setBaselineValue] = useState("");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [jsonSyntaxError, setJsonSyntaxError] = useState<string | null>(null);

  const editorValueRef = useRef(editorValue);
  editorValueRef.current = editorValue;

  const isDirty = editorValue !== baselineValue;

  useEffect(() => {
    prefetchMonacoEditor();
  }, []);

  useEffect(() => {
    if (!handoff.data?.token || !isEditMode) {
      if (handoff.data && !isEditMode) {
        setLoadStatus("error");
        setLoadError("This page only supports admin edit of an existing test.");
      }
      return;
    }

    let cancelled = false;
    setLoadStatus("loading");
    setLoadError(null);

    void (async () => {
      try {
        const loaded = await fetchAdminTest(
          handoff.data!.testId!,
          handoff.data!.token,
        );
        if (cancelled) return;
        const document = buildEditableTestDocument(loaded);
        setTitle(typeof loaded.title === "string" ? loaded.title : "");
        setSlug(typeof loaded.slug === "string" ? loaded.slug : "");
        setEditorValue(document);
        setBaselineValue(document);
        setLoadStatus("success");
      } catch (error) {
        if (cancelled) return;
        setLoadStatus("error");
        setLoadError(
          error instanceof Error ? error.message : "Could not load test.",
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [handoff.data, isEditMode]);

  const handleEditorChange = useCallback((value: string | undefined) => {
    const next = value ?? "";
    setEditorValue(next);
    setValidationErrors([]);
    setSaveStatus("idle");
    try {
      JSON.parse(next);
      setJsonSyntaxError(null);
    } catch (error) {
      setJsonSyntaxError(
        error instanceof Error ? error.message : "Invalid JSON syntax",
      );
    }
  }, []);

  const handleFormat = useCallback(() => {
    try {
      const formatted = formatJsonDocument(editorValueRef.current);
      setEditorValue(formatted);
      setJsonSyntaxError(null);
      toast.success("JSON formatted.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not format JSON.",
      );
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (!handoff.data?.token || !isEditMode || saveStatus === "saving") return;

    setValidationErrors([]);
    setSaveStatus("saving");

    try {
      const payload = parseTestImportDocument(editorValueRef.current);
      const normalized = JSON.stringify(payload, null, 2);
      await replaceAdminTestContent(
        handoff.data.testId!,
        handoff.data.token,
        payload,
      );
      const nextTitle =
        typeof payload.test.title === "string" ? payload.test.title : title;
      const nextSlug =
        typeof payload.test.slug === "string" ? payload.test.slug : slug;
      setTitle(nextTitle);
      setSlug(nextSlug);
      setEditorValue(normalized);
      setBaselineValue(normalized);
      setJsonSyntaxError(null);
      setSaveStatus("saved");
      toast.success("Test updated successfully.");
    } catch (error) {
      setSaveStatus("idle");
      if (error instanceof TestApiError) {
        if (error.errors?.length) setValidationErrors(error.errors);
        toast.error(error.message);
        return;
      }
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not save test. Please try again.",
      );
    }
  }, [handoff.data, isEditMode, saveStatus, slug, title]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "s") {
        event.preventDefault();
        void handleSave();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleSave]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  if (handoff.error || !handoff.data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm">
          <AlertCircle className="mx-auto size-10 text-red-500" aria-hidden />
          <h1 className="mt-3 text-lg font-semibold text-gray-900">
            Cannot open test editor
          </h1>
          <p className="mt-2 text-sm text-gray-600">{handoff.error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen min-h-0 flex-col bg-[#1e1e1e] text-white">
      <header className="shrink-0 border-b border-white/10 bg-[#252526] px-3 py-2.5 sm:px-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <FileJson className="size-4 shrink-0 text-primary" aria-hidden />
              <h1 className="truncate text-sm font-semibold sm:text-base">
                {title || handoff.data.slug || "Edit test"}
              </h1>
            </div>
            <p className="mt-0.5 truncate text-xs text-gray-400">
              {slug || handoff.data.slug || "—"}
              {handoff.data.name ? ` · ${handoff.data.name}` : ""}
              {" · Admin edit"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isDirty ? (
              <span className="text-xs text-amber-300">Unsaved changes</span>
            ) : saveStatus === "saved" ? (
              <span className="flex items-center gap-1 text-xs text-green-400">
                <CheckCircle2 className="size-3.5" aria-hidden />
                Saved
              </span>
            ) : null}

            <button
              type="button"
              onClick={handleFormat}
              disabled={loadStatus !== "success"}
              className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-gray-200 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
            >
              <Wand2 className="size-3.5" aria-hidden />
              Format
            </button>

            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={
                loadStatus !== "success" ||
                saveStatus === "saving" ||
                Boolean(jsonSyntaxError)
              }
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
            >
              {saveStatus === "saving" ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <Save className="size-3.5" aria-hidden />
              )}
              {saveStatus === "saving" ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>

        {(jsonSyntaxError || validationErrors.length > 0) && (
          <div className="mt-3 rounded-lg border border-red-500/40 bg-red-950/40 px-3 py-2 text-xs text-red-100">
            {jsonSyntaxError ? (
              <p>
                <span className="font-semibold">JSON syntax:</span>{" "}
                {jsonSyntaxError}
              </p>
            ) : null}
            {validationErrors.length > 0 ? (
              <div className={jsonSyntaxError ? "mt-2" : undefined}>
                <p className="font-semibold">Validation errors:</p>
                <ul className="mt-1 list-inside list-disc space-y-0.5">
                  {validationErrors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}
      </header>

      <main className="min-h-0 flex-1 overflow-hidden">
        {loadStatus === "loading" ? (
          <div className="flex h-full items-center justify-center text-sm text-gray-400">
            <Loader2 className="mr-2 size-5 animate-spin" aria-hidden />
            Loading test…
          </div>
        ) : loadStatus === "error" ? (
          <div className="flex h-full items-center justify-center px-4">
            <div className="max-w-md rounded-xl border border-red-500/30 bg-red-950/30 p-5 text-center">
              <AlertCircle className="mx-auto size-8 text-red-400" aria-hidden />
              <p className="mt-3 text-sm text-red-100">{loadError}</p>
            </div>
          </div>
        ) : (
          <MonacoEditorLazy
            language="json"
            value={editorValue}
            onChange={handleEditorChange}
            height="100%"
            options={{
              folding: true,
              minimap: { enabled: true },
              wordWrap: "on",
              formatOnPaste: true,
              automaticLayout: true,
              scrollBeyondLastLine: false,
              renderLineHighlight: "line",
              padding: { top: 12, bottom: 12 },
            }}
          />
        )}
      </main>
    </div>
  );
}
