import { useState, useRef, useEffect } from "react";
import { Play, Maximize2, Minimize2, RotateCcw } from "lucide-react";

interface PreviewCodeEditorProps {
  code: string;
  onCodeChange: (code: string) => void;
  onRunCode?: () => void;
  onSubmitCode?: () => void;
  canSubmit?: boolean;
  language?: string;
}

export function PreviewCodeEditor({
  code,
  onCodeChange,
  onRunCode,
  onSubmitCode,
  canSubmit = false,
  language = "javascript",
}: PreviewCodeEditorProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.max(200, textareaRef.current.scrollHeight)}px`;
    }
  }, [code]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      const newCode = code.substring(0, start) + "  " + code.substring(end);
      onCodeChange(newCode);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
        }
      }, 0);
    }
  };

  const containerClass = isFullscreen
    ? "fixed inset-4 z-50 flex flex-col bg-gray-900 rounded-xl shadow-2xl"
    : "flex flex-col bg-gray-900 rounded-xl overflow-hidden";

  return (
    <>
      {isFullscreen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setIsFullscreen(false)}
        />
      )}
      <div className={containerClass}>
        <div className="flex items-center justify-between border-b border-gray-700 bg-gray-800 px-4 py-2">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="h-3 w-3 rounded-full bg-red-500" />
              <div className="h-3 w-3 rounded-full bg-yellow-500" />
              <div className="h-3 w-3 rounded-full bg-green-500" />
            </div>
            <span className="ml-3 text-xs font-medium text-gray-400 uppercase">
              {language}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onCodeChange("")}
              className="rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-700 hover:text-white"
              title="Clear code"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-700 hover:text-white"
              title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4">
          <textarea
            ref={textareaRef}
            value={code}
            onChange={(e) => onCodeChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full min-h-[200px] resize-none bg-transparent font-mono text-sm text-gray-100 outline-none placeholder:text-gray-500"
            placeholder="Write your code here..."
            spellCheck={false}
          />
        </div>
        <div className="flex items-center gap-2 border-t border-gray-700 bg-gray-800 px-4 py-3">
          {onRunCode && (
            <button
              type="button"
              onClick={onRunCode}
              className="flex items-center gap-2 rounded-lg bg-gray-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-600"
            >
              <Play className="h-4 w-4" />
              Try Out
            </button>
          )}
          {onSubmitCode && (
            <button
              type="button"
              onClick={onSubmitCode}
              disabled={!canSubmit}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                canSubmit
                  ? "bg-primary text-white hover:bg-primary/90"
                  : "bg-gray-600 text-gray-400 cursor-not-allowed"
              }`}
            >
              Submit Answer
            </button>
          )}
        </div>
      </div>
    </>
  );
}
