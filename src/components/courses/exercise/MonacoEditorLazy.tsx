import { lazy, Suspense, useEffect } from "react";
import type { EditorProps } from "@monaco-editor/react";

const Editor = lazy(() => import("@monaco-editor/react"));

/**
 * Keep the light editor chrome, and turn suggestions on.
 * Monaco's own language support is enough here. VS Code for the Web's
 * bridge alone is about 50 MB before the workbench and extensions, and
 * native C++ and Python language servers do not run in the browser.
 */
export const MONACO_PERF_OPTIONS: EditorProps["options"] = {
  automaticLayout: true,
  minimap: { enabled: false },
  folding: false,
  lineNumbersMinChars: 3,
  scrollBeyondLastLine: false,
  renderLineHighlight: "line",
  occurrencesHighlight: "off",
  selectionHighlight: false,
  codeLens: false,
  colorDecorators: false,
  quickSuggestions: { other: true, comments: false, strings: false },
  quickSuggestionsDelay: 40,
  suggestOnTriggerCharacters: true,
  acceptSuggestionOnEnter: "on",
  tabCompletion: "on",
  wordBasedSuggestions: "currentDocument",
  parameterHints: { enabled: true },
  hover: { enabled: true },
  links: false,
  matchBrackets: "near",
  renderValidationDecorations: "editable",
  padding: { top: 8 },
  suggest: {
    showKeywords: true,
    showSnippets: true,
    showWords: true,
    showFunctions: true,
    showVariables: true,
  },
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
