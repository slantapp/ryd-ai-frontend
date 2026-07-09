import { Loader2, Maximize2, Minimize2, Play, Send } from "lucide-react";
import { MonacoEditorLazy } from "./MonacoEditorLazy";
import {
  CODE_RUN_LANGUAGES,
  normalizeRunLanguage,
} from "@/utils/codeExecution/languages";

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
  /** When provided, shows two buttons: "Try it out" (run only) and "Submit answer" (run and submit). */
  onTryOut?: () => void;
  /** When using two-button mode, submit button is disabled when false (e.g. when code is empty). */
  canSubmit?: boolean;
  /** Shows a running state and disables action buttons while code executes. */
  isRunning?: boolean;
}

/** Map curriculum language strings to Monaco editor language ids. */
function toMonacoLanguage(language?: string): string {
  const lang = normalizeRunLanguage(language);
  const map: Record<string, string> = {
    cpp: "cpp",
    csharp: "csharp",
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
}: CodeEditorProps) {
  const twoButtonMode = typeof onTryOut === "function";
  const monacoLanguage = toMonacoLanguage(language);
  const testDisabled = !canTest || isRunning;
  const submitDisabled = !canSubmit || isRunning;
  const selectedLanguage = normalizeRunLanguage(language);
  const showLanguageSelector = typeof onLanguageChange === "function";

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
          {twoButtonMode ? (
            <>
              <button
                onClick={onTryOut}
                disabled={testDisabled}
                className={`flex shrink-0 items-center gap-1.5 rounded px-2 py-1 text-xs text-white sm:gap-2 sm:px-3 sm:text-sm ${testDisabled
                  ? "bg-gray-500 cursor-not-allowed"
                  : "bg-gray-600 hover:bg-gray-700"
                  }`}
              >
                {isRunning ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                {isRunning ? "Running..." : "Test Code"}
              </button>
              <button
                onClick={onTestCode}
                disabled={submitDisabled}
                className={`flex shrink-0 items-center gap-1.5 rounded px-2 py-1 text-xs text-white sm:gap-2 sm:px-3 sm:text-sm ${submitDisabled
                  ? "bg-gray-500 cursor-not-allowed"
                  : "bg-primary hover:bg-primary/80"
                  }`}
              >
                {isRunning ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                {isRunning ? "Running..." : "Submit answer"}
              </button>
            </>
          ) : (
            <button
              onClick={onTestCode}
              disabled={testDisabled}
              className={`flex shrink-0 items-center gap-1.5 rounded px-2 py-1 text-xs text-white sm:gap-2 sm:px-3 sm:text-sm ${testDisabled
                ? "bg-gray-500 cursor-not-allowed"
                : "bg-primary hover:bg-primary/80"
                }`}
            >
              {isRunning ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
              {isRunning ? "Running..." : "Run Code"}
            </button>
          )}
          <button
            onClick={onToggleFullscreen}
            className="p-1 rounded hover:bg-gray-200 shrink-0"
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        <MonacoEditorLazy
          language={monacoLanguage}
          value={code}
          onChange={(val) => onCodeChange(val || "")}
          height="100%"
        />
      </div>
    </div>
  );
}
