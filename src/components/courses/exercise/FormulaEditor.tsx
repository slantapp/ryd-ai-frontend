import { Maximize2, Minimize2, Send, Sigma } from "lucide-react";
import TextareaAutosize from "react-textarea-autosize";

interface FormulaEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onToggleFullscreen: () => void;
  isFullscreen: boolean;
  canSubmit: boolean;
  disabled?: boolean;
}

export default function FormulaEditor({
  value,
  onChange,
  onSubmit,
  onToggleFullscreen,
  isFullscreen,
  canSubmit,
  disabled = false,
}: FormulaEditorProps) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-md border border-gray-200">
      <div className="flex shrink-0 items-center justify-between border-b bg-gray-50 px-3 py-2">
        <div className="flex items-center gap-2">
          <Sigma className="size-4 text-primary" aria-hidden />
          <h3 className="font-medium text-gray-700">Your answer</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSubmit}
            disabled={!canSubmit || disabled}
            className={`flex items-center gap-2 rounded px-3 py-1 text-sm text-white ${
              !canSubmit || disabled
                ? "cursor-not-allowed bg-gray-500"
                : "bg-primary hover:bg-primary/80"
            }`}
          >
            <Send size={14} />
            Submit answer
          </button>
          <button
            type="button"
            onClick={onToggleFullscreen}
            className="rounded p-1 hover:bg-gray-200"
            aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto bg-[#faf8ff] p-4">
        <TextareaAutosize
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          minRows={6}
          placeholder="Type your answer (e.g. 34, 3:4, $165, 30 km)…"
          className="w-full resize-none border-0 bg-transparent font-mono text-lg leading-relaxed text-gray-900 outline-none placeholder:text-gray-400 disabled:opacity-60"
          spellCheck={false}
        />
      </div>
    </div>
  );
}
