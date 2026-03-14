import { Maximize2, Minimize2, Play, Send } from "lucide-react";
import Editor from "@monaco-editor/react";

interface CodeEditorProps {
  code: string;
  onCodeChange: (code: string) => void;
  onTestCode: () => void;
  onToggleFullscreen: () => void;
  isFullscreen: boolean;
  canTest: boolean;
  /** When provided, shows two buttons: "Try it out" (run only) and "Submit answer" (run and submit). */
  onTryOut?: () => void;
  /** When using two-button mode, submit button is disabled when false (e.g. when code is empty). */
  canSubmit?: boolean;
}

export default function CodeEditor({
  code,
  onCodeChange,
  onTestCode,
  onToggleFullscreen,
  isFullscreen,
  canTest,
  onTryOut,
  canSubmit = true,
}: CodeEditorProps) {
  const twoButtonMode = typeof onTryOut === "function";

  return (
    <div className="flex flex-col h-full border border-gray-200 rounded-md overflow-hidden">
      <div className="flex justify-between items-center px-3 py-2 border-b bg-gray-50 shrink-0">
        <h3 className="font-medium text-gray-700">Editor</h3>
        <div className="flex items-center gap-2">
          {twoButtonMode ? (
            <>
              <button
                onClick={onTryOut}
                disabled={!canTest}
                className={`flex items-center gap-2 px-3 py-1 rounded text-white text-sm ${!canTest
                  ? "bg-gray-500 cursor-not-allowed"
                  : "bg-gray-600 hover:bg-gray-700"
                  }`}
              >
                <Play size={14} />
                Test Code
              </button>
              <button
                onClick={onTestCode}
                disabled={!canSubmit}
                className={`flex items-center gap-2 px-3 py-1 rounded text-white text-sm ${!canSubmit
                  ? "bg-gray-500 cursor-not-allowed"
                  : "bg-primary hover:bg-primary/80"
                  }`}
              >
                <Send size={14} />
                Submit answer
              </button>
            </>
          ) : (
            <button
              onClick={onTestCode}
              disabled={!canTest}
              className={`flex items-center gap-2 px-3 py-1 rounded text-white text-sm ${!canTest
                ? "bg-gray-500 cursor-not-allowed"
                : "bg-primary hover:bg-primary/80"
                }`}
            >
              <Play size={14} />
              Run Code
            </button>
          )}
          <button
            onClick={onToggleFullscreen}
            className="p-1 rounded hover:bg-gray-200"
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        <Editor
          defaultLanguage="javascript"
          value={code}
          onChange={(val) => onCodeChange(val || "")}
          theme="vs-dark"
          options={{ automaticLayout: true }}
          height="100%"
        />
      </div>
    </div>
  );
}
