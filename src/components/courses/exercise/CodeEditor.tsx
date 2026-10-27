import { useEffect, useRef, useState } from "react";
import {
  Loader2,
  Maximize2,
  Minimize2,
  Play,
  RotateCcw,
  Send,
} from "lucide-react";
import type { OnMount } from "@monaco-editor/react";
import { MonacoEditorLazy } from "./MonacoEditorLazy";
import { registerEditorSuggestions } from "./editorSuggestions";
import {
  CODE_RUN_LANGUAGES,
  normalizeRunLanguage,
} from "@/utils/codeExecution/languages";
import ProgramInputPrompt from "./ProgramInputPrompt";
import type { ProgramInputPrompt as ProgramInputPromptState } from "@/hooks/useProgramInput";

interface CodeEditorProps {
  code: string;
  onCodeChange: (code: string) => void;
  onTestCode: () => void;
  onToggleFullscreen: () => void;
  isFullscreen: boolean;
  canTest: boolean;
  /** Monaco + runner language (e.g. javascript, python). Defaults to javascript. */
  language?: string;
  /** When provided, shows a language dropdown the user can override. */
  onLanguageChange?: (language: string) => void;
  /** When provided, shows two buttons: "Run" (run only) and "Submit" (run and submit). */
  onTryOut?: () => void;
  /** When using two-button mode, submit button is disabled when false (e.g. when code is empty). */
  canSubmit?: boolean;
  /** Shows a running state and disables action buttons while code executes. */
  isRunning?: boolean;
  /** When provided, shows a "Reset" button that restores the starter code. */
  onReset?: () => void;
  /** Tooltip shown on the run/test button while it is disabled (explains why). */
  testDisabledReason?: string;
  /** Tooltip shown on the submit button while it is disabled (explains why). */
  submitDisabledReason?: string;
  /** Show the Input box under the editor. Used when the number of reads is not fixed. */
  showProgramInput?: boolean;
  /** Loop reads explain themselves. A preset is the fallback when a read was not recognised. */
  programInputHint?: "loop" | "preset" | null;
  programInput?: string;
  onProgramInputChange?: (value: string) => void;
  programInputReadOnly?: boolean;
  /** One submit step for a fixed read. The line is highlighted in the editor. */
  inputPrompt?: ProgramInputPromptState | null;
  fileNames?: string[];
  activeFileName?: string;
  onActiveFileName?: (name: string) => void;
}

/** Map curriculum language strings to Monaco editor language ids. */
function toMonacoLanguage(language?: string): string {
  const lang = normalizeRunLanguage(language);
  const map: Record<string, string> = {
    cpp: "cpp",
    csharp: "csharp",
    bash: "shell",
    shell: "shell",
    html: "html",
    sqlite: "sql",
  };
  return map[lang] ?? lang;
}

export default function CodeEditor({
  code,
  onCodeChange,
  onTestCode,
  onToggleFullscreen,
  isFullscreen,
  canTest,
  language = "javascript",
  onLanguageChange,
  onTryOut,
  canSubmit = true,
  isRunning = false,
  onReset,
  testDisabledReason,
  submitDisabledReason,
  showProgramInput = false,
  programInputHint = "loop",
  programInput = "",
  onProgramInputChange,
  programInputReadOnly = false,
  inputPrompt = null,
  fileNames = [],
  activeFileName = "main",
  onActiveFileName,
}: CodeEditorProps) {
  const twoButtonMode = typeof onTryOut === "function";
  const monacoLanguage = toMonacoLanguage(language);
  const testDisabled = !canTest || isRunning;
  const submitDisabled = !canSubmit || isRunning;
  const selectedLanguage = normalizeRunLanguage(language);
  const showLanguageSelector = typeof onLanguageChange === "function";

  // Keep the latest "primary action" in a ref so the Monaco Ctrl/Cmd+Enter
  // command (registered once on mount) always calls the current handler and
  // respects the current disabled state.
  const primaryActionRef = useRef<() => void>(() => {});
  const promptRef = useRef(inputPrompt);
  promptRef.current = inputPrompt;
  const [editorReady, setEditorReady] = useState(false);
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const monacoRef = useRef<Parameters<OnMount>[1] | null>(null);

  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco || !inputPrompt?.open) return;
    const line = inputPrompt.line;
    editor.revealLineInCenter(line);
    const decorations = editor.createDecorationsCollection([
      {
        range: new monaco.Range(line, 1, line, 1),
        options: {
          isWholeLine: true,
          className: "program-input-line",
        },
      },
    ]);
    return () => decorations.clear();
  }, [editorReady, inputPrompt?.open, inputPrompt?.line]);

  primaryActionRef.current = () => {
    if (promptRef.current?.open) {
      promptRef.current.onSubmit();
      return;
    }
    if (isRunning) return;
    if (twoButtonMode) {
      if (!submitDisabled) onTestCode();
    } else if (!testDisabled) {
      onTestCode();
    }
  };

  const runTooltip = testDisabled
    ? testDisabledReason || (isRunning ? "Running…" : "Write some code first")
    : "Run your code (Ctrl/Cmd + Enter)";
  const submitTooltip = submitDisabled
    ? submitDisabledReason || (isRunning ? "Running…" : "Write some code first")
    : "Submit your answer (Ctrl/Cmd + Enter)";

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-md border border-gray-200">
      <div className="flex shrink-0 flex-col gap-2 border-b bg-gray-50 px-2 py-2 sm:flex-row sm:items-center sm:justify-between sm:px-3">
        <h3 className="shrink-0 text-sm font-medium text-gray-700 sm:text-base">
          Editor
        </h3>
        <div className="flex min-w-0 flex-wrap items-center gap-1.5 sm:gap-2">
          {showLanguageSelector && (
            <select
              value={selectedLanguage}
              onChange={(e) => onLanguageChange(e.target.value)}
              disabled={isRunning}
              aria-label="Programming language"
              className="h-8 max-w-full truncate rounded border border-gray-300 bg-white px-2 text-xs text-gray-700 disabled:cursor-not-allowed disabled:bg-gray-100 sm:max-w-38 sm:text-sm"
            >
              {CODE_RUN_LANGUAGES.map((lang) => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>
          )}
          {onReset && (
            <button
              type="button"
              onClick={onReset}
              disabled={isRunning}
              title="Reset to starter code"
              aria-label="Reset to starter code"
              className="flex h-8 shrink-0 items-center gap-1.5 rounded border border-gray-300 bg-white px-2 text-xs text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
            >
              <RotateCcw size={14} />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}
          {twoButtonMode ? (
            <>
              <button
                onClick={onTryOut}
                disabled={testDisabled}
                title={runTooltip}
                aria-label={runTooltip}
                className={`flex shrink-0 items-center gap-1.5 rounded px-2 py-1 text-xs text-white sm:gap-2 sm:px-3 sm:text-sm ${
                  testDisabled
                    ? "bg-gray-500 cursor-not-allowed"
                    : "bg-gray-600 hover:bg-gray-700"
                }`}
              >
                {isRunning ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Play size={14} />
                )}
                {isRunning ? "Running…" : "Run"}
              </button>
              <button
                onClick={onTestCode}
                disabled={submitDisabled}
                title={submitTooltip}
                aria-label={submitTooltip}
                className={`flex shrink-0 items-center gap-1.5 rounded px-2 py-1 text-xs text-white sm:gap-2 sm:px-3 sm:text-sm ${
                  submitDisabled
                    ? "bg-gray-500 cursor-not-allowed"
                    : "bg-primary hover:bg-primary/80"
                }`}
              >
                {isRunning ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Send size={14} />
                )}
                {isRunning ? "Running…" : "Submit"}
              </button>
            </>
          ) : (
            <button
              onClick={onTestCode}
              disabled={testDisabled}
              title={runTooltip}
              aria-label={runTooltip}
              className={`flex shrink-0 items-center gap-1.5 rounded px-2 py-1 text-xs text-white sm:gap-2 sm:px-3 sm:text-sm ${
                testDisabled
                  ? "bg-gray-500 cursor-not-allowed"
                  : "bg-primary hover:bg-primary/80"
              }`}
            >
              {isRunning ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Play size={14} />
              )}
              {isRunning ? "Running…" : "Run"}
            </button>
          )}
          <button
            onClick={onToggleFullscreen}
            title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            className="p-1 rounded hover:bg-gray-200 shrink-0"
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>
      {fileNames.length > 0 ? (
        <div className="flex shrink-0 gap-1 overflow-x-auto border-b bg-white px-2 py-1">
          <button
            type="button"
            onClick={() => onActiveFileName?.("main")}
            className={`rounded px-2 py-1 text-xs ${activeFileName === "main" ? "bg-gray-800 text-white" : "text-gray-600 hover:bg-gray-100"}`}
          >
            Main
          </button>
          {fileNames.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => onActiveFileName?.(name)}
              className={`rounded px-2 py-1 text-xs ${activeFileName === name ? "bg-gray-800 text-white" : "text-gray-600 hover:bg-gray-100"}`}
            >
              {name}
            </button>
          ))}
        </div>
      ) : null}
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <style>{`.program-input-line { background: rgba(251, 191, 36, 0.28); }`}</style>
        <MonacoEditorLazy
          language={monacoLanguage}
          value={code}
          onChange={(val) => onCodeChange(val || "")}
          height="100%"
          onMount={(editor, monaco) => {
            editorRef.current = editor;
            monacoRef.current = monaco;
            setEditorReady(true);
            registerEditorSuggestions(monaco, monacoLanguage);
            editor.addCommand(
              monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
              () => primaryActionRef.current(),
            );
          }}
        />
        {inputPrompt?.open ? <ProgramInputPrompt prompt={inputPrompt} /> : null}
      </div>
      {showProgramInput ? (
        <label className="shrink-0 border-t border-gray-200 bg-white px-3 py-2">
          <span className="mb-0.5 block text-xs font-semibold text-gray-800">
            Input
          </span>
          <span className="mb-1.5 block text-[0.7rem] leading-snug text-gray-500">
            {programInputHint === "preset"
              ? "Type what the program should read, then tap Run."
              : "Type one answer per line (press Enter after each). For example: 3, then 9, then 7."}
          </span>
          <textarea
            value={programInput}
            onChange={(event) => onProgramInputChange?.(event.target.value)}
            readOnly={programInputReadOnly}
            rows={2}
            placeholder="e.g. 10"
            aria-label="Program input"
            className="w-full resize-y rounded-md border border-gray-300 px-2.5 py-1.5 font-mono text-sm text-gray-900 outline-none focus:border-primary read-only:bg-gray-50"
          />
        </label>
      ) : null}
    </div>
  );
}
