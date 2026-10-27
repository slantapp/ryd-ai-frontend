import { useMemo, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Minimize2, Maximize2, Terminal, Eye, Palette, Square } from "lucide-react";
import { ConsoleLines } from "./ConsoleLines";
import { prepareHtmlForPreview } from "@/utils/prepareHtmlForPreview";
import { isWebWorkspaceLanguage } from "@/utils/webCodeWorkspace";
import { useMediaQueryMinLg } from "@/hooks/useMediaQueryMinLg";
import { cn } from "@/lib/utils";
import type { ConsoleInputLine } from "@/hooks/useProgramInput";
import {
  isTurtleRunning,
  stopTurtleProgram,
  subscribeTurtleRunning,
} from "@/utils/codeExecution/turtle";

interface TestResultsProps {
  results: string[];
  code?: string; // The code being tested
  onToggleFullscreen: () => void;
  isFullscreen: boolean;
  /** Existing DOM target used by the in-browser Python Turtle runtime. */
  turtleTargetId?: string;
  /** Course language. Page preview is only for HTML, CSS, and web lessons. */
  language?: string;
  /** The program is waiting for an answer typed on the console's last line. */
  inputLine?: ConsoleInputLine | null;
}

/**
 * Scale the turtle canvas to fit its panel. The drawing keeps its shape, and
 * the stacked canvas layers scale together because the transform is on their parent.
 */
function useFitTurtleCanvas(enabled: boolean) {
  const panelRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const panel = panelRef.current;
    const box = boxRef.current;
    const target = targetRef.current;
    if (!enabled || !panel || !box || !target) return;

    const fit = () => {
      const canvas = target.querySelector("canvas");
      if (!canvas || !canvas.width || !canvas.height) {
        box.style.width = "100%";
        box.style.height = "100%";
        target.style.transform = "";
        return;
      }
      const room = panel.getBoundingClientRect();
      const scale = Math.min(
        1,
        Math.max(0.05, (room.width - 8) / canvas.width),
        Math.max(0.05, (room.height - 8) / canvas.height),
      );
      target.style.width = `${canvas.width}px`;
      target.style.height = `${canvas.height}px`;
      target.style.transformOrigin = "0 0";
      target.style.transform = `scale(${scale})`;
      box.style.width = `${canvas.width * scale}px`;
      box.style.height = `${canvas.height * scale}px`;
    };

    fit();
    const resize = new ResizeObserver(fit);
    resize.observe(panel);
    const changes = new MutationObserver(fit);
    changes.observe(target, { childList: true, subtree: true, attributes: true, attributeFilter: ["width", "height"] });
    return () => {
      resize.disconnect();
      changes.disconnect();
    };
  }, [enabled]);

  return { panelRef, boxRef, targetRef };
}

// Helper function to wrap HTML in a complete document if needed
function wrapHTML(html: string): string {
  if (!html) return "";

  const hasHTMLTag = /<html[\s>]/i.test(html);
  const hasBodyTag = /<body[\s>]/i.test(html);

  if (hasHTMLTag && hasBodyTag) {
    return prepareHtmlForPreview(html);
  }

  return prepareHtmlForPreview(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview</title>
  <style>
    body {
      margin: 0;
      padding: 16px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    }
    img {
      max-width: 100%;
      height: auto;
    }
  </style>
</head>
<body>
${html}
</body>
</html>`);
}

export default function TestResults({
  results,
  code = "",
  onToggleFullscreen,
  isFullscreen,
  turtleTargetId,
  language,
  inputLine = null,
}: TestResultsProps) {
  const [activeTab, setActiveTab] = useState<"console" | "preview">("console");
  const isLgUp = useMediaQueryMinLg();

  const isPagePreview = isWebWorkspaceLanguage(language);
  const hasTurtlePreview = Boolean(turtleTargetId);
  const hasVisualPreview = isPagePreview || hasTurtlePreview;
  const turtleRunning = useSyncExternalStore(subscribeTurtleRunning, isTurtleRunning, () => false);
  const turtleFit = useFitTurtleCanvas(hasTurtlePreview);

  const htmlContent = useMemo(() => {
    if (!isPagePreview || !code.trim()) return "";
    const lang = (language || "").toLowerCase().trim();
    if (lang === "css") return wrapHTML(`<style>\n${code}\n</style>`);
    return wrapHTML(code);
  }, [code, isPagePreview, language]);

  // Prefer visual output when HTML or Turtle code is present.
  useEffect(() => {
    if ((isPagePreview && htmlContent) || hasTurtlePreview) {
      setActiveTab("preview");
    }
  }, [hasTurtlePreview, htmlContent, isPagePreview]);

  useEffect(() => {
    if (!hasVisualPreview) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "1") {
        e.preventDefault();
        setActiveTab("console");
      } else if ((e.ctrlKey || e.metaKey) && e.key === "2") {
        e.preventDefault();
        setActiveTab("preview");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasVisualPreview]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-gray-200 bg-black text-white">
      <div
        className={cn(
          "flex h-full min-h-0 flex-col",
          hasVisualPreview && isLgUp && "lg:grid lg:grid-cols-3",
        )}
      >
        <div
          className={cn(
            "flex w-full min-w-0 flex-col",
            hasVisualPreview && isLgUp
              ? "lg:col-span-1 lg:min-h-0"
              : "min-h-0 flex-1",
            hasVisualPreview && !isLgUp && activeTab !== "console" && "hidden",
          )}
        >
          <div className="flex shrink-0 items-center justify-between border-b border-gray-700 bg-gray-900">
            <div className="flex flex-1 items-center">
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setActiveTab("console")}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium transition-all sm:gap-2 sm:px-4 sm:py-2 sm:text-sm ${
                    activeTab === "console"
                      ? "border-b-2 border-blue-500 bg-gray-800 text-white"
                      : "text-gray-400 hover:bg-gray-800/50 hover:text-gray-300"
                  }`}
                  title="Console (Ctrl/Cmd + 1)"
                >
                  <Terminal size={14} className="sm:size-4" />
                  <span>Console</span>
                </button>
                {hasVisualPreview && !isLgUp ? (
                  <button
                    type="button"
                    onClick={() => setActiveTab("preview")}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium transition-all sm:gap-2 sm:px-4 sm:py-2 sm:text-sm ${
                      activeTab === "preview"
                        ? "border-b-2 border-blue-500 bg-gray-800 text-white"
                        : "text-gray-400 hover:bg-gray-800/50 hover:text-gray-300"
                    }`}
                    title={`${hasTurtlePreview ? "Turtle canvas" : "Preview"} (Ctrl/Cmd + 2)`}
                  >
                    {hasTurtlePreview ? (
                      <Palette size={14} className="sm:size-4" />
                    ) : (
                      <Eye size={14} className="sm:size-4" />
                    )}
                    <span>{hasTurtlePreview ? "Canvas" : "Preview"}</span>
                  </button>
                ) : null}
              </div>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-auto bg-gray-950 p-2 font-mono text-xs sm:p-3 sm:text-sm">
            {results.length > 0 || inputLine ? (
              <ConsoleLines lines={results} inputLine={inputLine} />
            ) : (
              <div className="text-gray-500">
                <div className="mb-1 text-[0.7rem] sm:text-sm">
                  Console output will appear here…
                </div>
                <div className="text-[0.65rem] text-gray-600 sm:text-xs">
                  Run your code to see test results.
                </div>
              </div>
            )}
          </div>
        </div>

        {hasVisualPreview ? (
          <div
            className={cn(
              "flex w-full min-w-0 flex-col",
              isLgUp
                ? "lg:col-span-2 lg:min-h-0"
                : activeTab !== "preview"
                  ? "hidden"
                  : "min-h-0 flex-1",
            )}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-gray-700 bg-gray-900">
              <div className="flex flex-1 items-center">
                <div className="flex gap-1">
                  {isLgUp ? (
                    <button
                      type="button"
                      onClick={() => setActiveTab("preview")}
                      className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-all sm:gap-2 sm:px-4 sm:text-sm ${
                        activeTab === "preview"
                          ? "border-b-2 border-blue-500 bg-gray-800 text-white"
                          : "text-gray-400 hover:bg-gray-800/50 hover:text-gray-300"
                      }`}
                      title={`${hasTurtlePreview ? "Turtle canvas" : "Preview"} (Ctrl/Cmd + 2)`}
                    >
                      {hasTurtlePreview ? (
                        <Palette size={16} />
                      ) : (
                        <Eye size={16} />
                      )}
                      <span>
                        {hasTurtlePreview ? "Turtle Canvas" : "Preview"}
                      </span>
                    </button>
                  ) : null}
                </div>
              </div>
              {hasTurtlePreview && turtleRunning ? (
                <button
                  type="button"
                  onClick={stopTurtleProgram}
                  className="mr-2 inline-flex items-center gap-1.5 rounded bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700"
                  title="Stop the turtle program"
                >
                  <Square size={12} fill="currentColor" />
                  Stop
                </button>
              ) : null}
              {!hasTurtlePreview && (
                <button
                  type="button"
                  onClick={onToggleFullscreen}
                  className="mr-2 rounded p-2 transition-colors hover:bg-gray-800"
                  title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                  aria-label={
                    isFullscreen ? "Exit fullscreen" : "Enter fullscreen"
                  }
                >
                  {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </button>
              )}
            </div>
            <div className="min-h-0 flex-1 border-t border-gray-700 bg-white">
              {hasTurtlePreview && turtleTargetId ? (
                <div
                  ref={turtleFit.panelRef}
                  className="flex h-full min-h-48 items-center justify-center overflow-hidden bg-white p-1"
                >
                  <div ref={turtleFit.boxRef} className="relative shrink-0 overflow-hidden">
                    <div
                      ref={turtleFit.targetRef}
                      id={turtleTargetId}
                      className="absolute left-0 top-0 bg-white outline-none"
                      aria-label="Python Turtle drawing canvas"
                    />
                  </div>
                </div>
              ) : htmlContent ? (
                <iframe
                  key={htmlContent.slice(0, 64)}
                  srcDoc={htmlContent}
                  className="h-full w-full border-0"
                  title="HTML Preview"
                  sandbox="allow-scripts allow-popups allow-forms"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-gray-500">
                  <div className="text-center">
                    <div className="mb-2 text-lg">No HTML to preview</div>
                    <div className="text-sm">
                      Write some HTML code to see the preview
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
