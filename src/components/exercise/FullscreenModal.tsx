import { X } from "lucide-react";
import Editor from "@monaco-editor/react";
import TestResults from "./TestResults";

interface FullscreenModalProps {
  type: "editor" | "results";
  code: string;
  results: string[];
  onClose: () => void;
  onCodeChange: (code: string) => void;
}

export default function FullscreenModal({
  type,
  code,
  results,
  onClose,
  onCodeChange,
}: FullscreenModalProps) {
  return (
    <div className="fixed inset-0 bg-background z-[9999] flex flex-col">
      <div className="flex justify-between items-center p-3 border-b bg-gray-50">
        <h3 className="font-semibold text-gray-700 capitalize">
          {type === "editor" ? "Editor" : "Results"} (Fullscreen)
        </h3>
        <button onClick={onClose} className="p-2 rounded hover:bg-gray-200">
          <X size={18} />
        </button>
      </div>
      <div className="flex-1 min-h-0">
        {type === "editor" ? (
          <Editor
            defaultLanguage="javascript"
            value={code}
            onChange={(val) => onCodeChange(val || "")}
            theme="vs-dark"
            options={{ automaticLayout: true }}
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
