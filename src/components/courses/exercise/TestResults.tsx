import { useMemo, useEffect, useState } from "react";
import { Minimize2, Maximize2, Terminal, Eye, Palette } from "lucide-react";
import { prepareHtmlForPreview } from "@/utils/prepareHtmlForPreview";
import { useMediaQueryMinLg } from "@/hooks/useMediaQueryMinLg";
import { cn } from "@/lib/utils";

interface TestResultsProps {
  results: string[];
  code?: string; // The code being tested
  onToggleFullscreen: () => void;
  isFullscreen: boolean;
  /** Existing DOM target used by the in-browser Python Turtle runtime. */
  turtleTargetId?: string;
}

// Helper function to detect if code contains HTML
function isHTMLCode(code: string): boolean {
  if (!code || !code.trim()) return false;

  const trimmedCode = code.trim();
  const openingTagPattern = /<[a-z][a-z0-9]*(?:\s[^>]*)?\/?>/i;
  const closingTagPattern = /<\/[a-z][a-z0-9]*>/i;

  return (
    openingTagPattern.test(trimmedCode) || closingTagPattern.test(trimmedCode)
  );
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
}: TestResultsProps) {
  const [activeTab, setActiveTab] = useState<"console" | "preview">("console");
  const isLgUp = useMediaQueryMinLg();

  const isHTML = useMemo(() => isHTMLCode(code), [code]);
  const hasTurtlePreview = Boolean(turtleTargetId);
  const hasVisualPreview = isHTML || hasTurtlePreview;

  const htmlContent = useMemo(() => {
    if (!isHTML || !code.trim()) return "";
    return wrapHTML(code);
  }, [code, isHTML]);

  // Prefer visual output when HTML or Turtle code is present.
  useEffect(() => {
    if ((isHTML && htmlContent) || hasTurtlePreview) {
      setActiveTab("preview");
    }
  }, [hasTurtlePreview, htmlContent, isHTML]);

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
            {results.length > 0 ? (
              <div className="space-y-1">
                {results.map((r, i) => {
                  let color = "text-gray-300";
                  if (r.startsWith("✅")) color = "text-green-400";
                  else if (r.startsWith("❌")) color = "text-red-400";
                  else if (r.startsWith("⚠️")) color = "text-yellow-400";
                  return (
                    <div key={i} className={`${color} break-all`}>
                      {r}
                    </div>
                  );
                })}
              </div>
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
                <div className="flex h-full min-h-0 items-center justify-center overflow-auto bg-white p-2">
                  <div
                    id={turtleTargetId}
                    className="min-h-48 w-full overflow-hidden rounded-md bg-white [&>canvas]:mx-auto [&>canvas]:max-w-full [&>svg]:mx-auto [&>svg]:max-w-full"
                    aria-label="Python Turtle drawing canvas"
                  />
                </div>
              ) : htmlContent ? (
                <iframe
                  key={htmlContent.slice(0, 64)}
                  srcDoc={htmlContent}
                  className="h-full w-full border-0"
                  title="HTML Preview"
                  sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
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
