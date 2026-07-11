import { useState } from "react";
import { Loader2, Maximize2, Minimize2, Play, Send } from "lucide-react";
import Split from "react-split";
import { MonacoEditorLazy } from "./MonacoEditorLazy";
import WebPreviewPane from "./WebPreviewPane";
import type { WebCodeSources, WebEditorTab } from "@/utils/webCodeWorkspace";

interface WebCodeWorkspaceProps {
  sources: WebCodeSources;
  onSourcesChange: (sources: WebCodeSources) => void;
  onTestCode: () => void;
  onTryOut?: () => void;
  onToggleFullscreen: () => void;
  isFullscreen: boolean;
  canTest: boolean;
  canSubmit?: boolean;
  isRunning?: boolean;
  results: string[];
  previewRefreshKey?: number;
  initialTab?: WebEditorTab;
}

const TAB_CONFIG: Array<{ id: WebEditorTab; label: string; monaco: string }> = [
  { id: "html", label: "HTML", monaco: "html" },
  { id: "css", label: "CSS", monaco: "css" },
  { id: "javascript", label: "JavaScript", monaco: "javascript" },
];

export default function WebCodeWorkspace({
  sources,
  onSourcesChange,
  onTestCode,
  onTryOut,
  onToggleFullscreen,
  isFullscreen,
  canTest,
  canSubmit = true,
  isRunning = false,
  results,
  previewRefreshKey = 0,
  initialTab = "html",
}: WebCodeWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<WebEditorTab>(initialTab);
  const twoButtonMode = typeof onTryOut === "function";
  const testDisabled = !canTest || isRunning;
  const submitDisabled = !canSubmit || isRunning;

  const updatePane = (tab: WebEditorTab, value: string) => {
    onSourcesChange({ ...sources, [tab]: value });
  };

  const activeConfig =
    TAB_CONFIG.find((tab) => tab.id === activeTab) ?? TAB_CONFIG[0];

  return (
    <div
      className={
        isFullscreen
          ? "fixed inset-0 z-9999 flex min-h-0 flex-col overflow-hidden border-0 bg-white"
          : "flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-gray-200"
      }
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b bg-gray-50 px-3 py-2">
        <div className="flex min-w-0 items-center gap-1">
          {TAB_CONFIG.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-primary text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {twoButtonMode ? (
            <>
              <button
                type="button"
                onClick={onTryOut}
                disabled={testDisabled}
                className={`flex items-center gap-2 rounded px-3 py-1 text-sm text-white ${
                  testDisabled
                    ? "cursor-not-allowed bg-gray-500"
                    : "bg-gray-600 hover:bg-gray-700"
                }`}
              >
                {isRunning ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Play size={14} />
                )}
                {isRunning ? "Running..." : "Test Code"}
              </button>
              <button
                type="button"
                onClick={onTestCode}
                disabled={submitDisabled}
                className={`flex items-center gap-2 rounded px-3 py-1 text-sm text-white ${
                  submitDisabled
                    ? "cursor-not-allowed bg-gray-500"
                    : "bg-primary hover:bg-primary/80"
                }`}
              >
                {isRunning ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Send size={14} />
                )}
                {isRunning ? "Running..." : "Submit answer"}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onTestCode}
              disabled={testDisabled}
              className={`flex items-center gap-2 rounded px-3 py-1 text-sm text-white ${
                testDisabled
                  ? "cursor-not-allowed bg-gray-500"
                  : "bg-primary hover:bg-primary/80"
              }`}
            >
              {isRunning ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Play size={14} />
              )}
              {isRunning ? "Running..." : "Run Preview"}
            </button>
          )}
          <button
            type="button"
            onClick={onToggleFullscreen}
            className="rounded p-1 hover:bg-gray-200"
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      <Split
        direction="vertical"
        className="flex min-h-0 w-full flex-1 flex-col"
        sizes={[42, 58]}
        minSize={100}
        gutterSize={8}
      >
        <div className="min-h-0 overflow-hidden">
          <MonacoEditorLazy
            language={activeConfig.monaco}
            value={sources[activeTab]}
            onChange={(value) => updatePane(activeTab, value || "")}
            height="100%"
          />
        </div>

        <Split
          direction="horizontal"
          className="flex h-full min-h-0 w-full"
          sizes={[62, 38]}
          minSize={120}
          gutterSize={8}
        >
          <WebPreviewPane
            html={sources.html}
            css={sources.css}
            javascript={sources.javascript}
            refreshKey={previewRefreshKey}
          />
          <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-gray-200 bg-gray-950 text-white">
            <div className="border-b border-gray-800 bg-gray-900 px-3 py-2 shrink-0">
              <h3 className="text-sm font-medium text-gray-200">Console</h3>
            </div>
            <div className="flex-1 overflow-auto p-3 font-mono text-sm">
              {results.length > 0 ? (
                <div className="space-y-1">
                  {results.map((line, index) => {
                    let color = "text-gray-300";
                    if (line.startsWith("✓")) color = "text-green-400";
                    else if (line.startsWith("✗")) color = "text-red-400";
                    else if (line.startsWith("⚠️")) color = "text-yellow-400";
                    return (
                      <div key={index} className={color}>
                        {line}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-500">
                  Test results and validation messages appear here.
                </p>
              )}
            </div>
          </div>
        </Split>
      </Split>
    </div>
  );
}
