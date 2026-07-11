import { X } from "lucide-react";
import { MonacoEditorLazy } from "./MonacoEditorLazy";
import TestResults from "./TestResults";

interface FullscreenModalProps {
  type: "editor" | "results";
  code: string;
  results: string[];
  onClose: () => void;
  onCodeChange: (code: string) => void;
  language?: string;
}

export default function FullscreenModal({
  type,
  code,
  results,
  onClose,
  onCodeChange,
  language = "javascript",
}: FullscreenModalProps) {
  return (
    <div className="fixed inset-0 z-9999 flex flex-col bg-background">
      <div className="flex items-center justify-between border-b bg-gray-50 p-3">
        <h3 className="font-semibold capitalize text-gray-700">
          {type === "editor" ? "Editor" : "Results"} (Fullscreen)
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-2 hover:bg-gray-200"
          aria-label="Exit fullscreen"
        >
          <X size={18} />
        </button>
      </div>
      <div className="min-h-0 flex-1">
        {type === "editor" ? (
          <MonacoEditorLazy
            language={language}
            value={code}
            onChange={(val) => onCodeChange(val || "")}
            height="100%"
          />
        ) : (
          <TestResults
            results={results}
            code={code}
            onToggleFullscreen={onClose}
            isFullscreen={true}
          />
        )}
      </div>
    </div>
  );
}
