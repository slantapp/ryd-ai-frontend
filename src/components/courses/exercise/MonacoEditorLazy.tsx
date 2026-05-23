import { lazy, Suspense, useEffect } from "react";
import type { EditorProps } from "@monaco-editor/react";

const Editor = lazy(() => import("@monaco-editor/react"));

/** Lighter defaults — faster init than full VS Code feature set. */
export const MONACO_PERF_OPTIONS: EditorProps["options"] = {
  automaticLayout: true,
  minimap: { enabled: false },
  folding: false,
  lineNumbersMinChars: 3,
  scrollBeyondLastLine: false,
  renderLineHighlight: "none",
  occurrencesHighlight: "off",
  selectionHighlight: false,
  codeLens: false,
  colorDecorators: false,
  quickSuggestions: false,
  suggestOnTriggerCharacters: false,
  wordBasedSuggestions: "off",
  parameterHints: { enabled: false },
  hover: { enabled: false },
  links: false,
  matchBrackets: "never",
  renderValidationDecorations: "off",
  padding: { top: 8 },
};

function EditorSkeleton() {
  return (
    <div
      className="flex h-full min-h-[120px] items-center justify-center bg-[#1e1e1e] text-sm text-gray-400"
      aria-busy="true"
      aria-label="Loading code editor"
    >
      Loading editor…
    </div>
  );
}

type MonacoEditorLazyProps = EditorProps;

export function MonacoEditorLazy({
  options,
  loading,
  ...props
}: MonacoEditorLazyProps) {
  return (
    <Suspense fallback={loading ?? <EditorSkeleton />}>
      <Editor
        theme="vs-dark"
        loading={null}
        options={{ ...MONACO_PERF_OPTIONS, ...options }}
        {...props}
      />
    </Suspense>
  );
}

/** Call before the user opens a code question to warm the chunk (e.g. on lesson start). */
export function prefetchMonacoEditor() {
  void import("@monaco-editor/react");
}

/** Prefetch when a route mounts that may show the editor soon. */
export function usePrefetchMonacoEditor(enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    prefetchMonacoEditor();
  }, [enabled]);
}
