import { useState, useMemo, useEffect } from "react";
import { Minimize2, Maximize2, Terminal, Eye } from "lucide-react";

interface TestResultsProps {
  results: string[];
  code?: string; // The code being tested
  onToggleFullscreen: () => void;
  isFullscreen: boolean;
}

// Helper function to detect if code contains HTML
function isHTMLCode(code: string): boolean {
  if (!code || !code.trim()) return false;

  // Simple and reliable HTML detection
  // Look for HTML tag patterns: <tag> or </tag> or <tag />
  // This matches: <h2>, <p>, <div>, </h2>, <img />, etc.
  // Pattern explanation:
  // - < matches literal <
  // - [a-z] matches first letter (required)
  // - [a-z0-9]* matches zero or more letters/numbers (for tags like h1, h2, img, etc.)
  // - Optional attributes/whitespace: (\s[^>]*)?
  // - Optional self-closing: (\/)?
  // - > matches literal >

  const trimmedCode = code.trim();

  // Check for opening tags: <tag> or <tag />
  const openingTagPattern = /<[a-z][a-z0-9]*(?:\s[^>]*)?\/?>/i;

  // Check for closing tags: </tag>
  const closingTagPattern = /<\/[a-z][a-z0-9]*>/i;

  // If we find either pattern, it's HTML
  return (
    openingTagPattern.test(trimmedCode) || closingTagPattern.test(trimmedCode)
  );
}

// Helper function to wrap HTML in a complete document if needed
function wrapHTML(html: string): string {
  if (!html) return "";

  // Check if it already has html/body tags
  const hasHTMLTag = /<html[\s>]/i.test(html);
  const hasBodyTag = /<body[\s>]/i.test(html);

  if (hasHTMLTag && hasBodyTag) {
    return html;
  }

  // Wrap in basic HTML structure
  return `<!DOCTYPE html>
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
  </style>
</head>
<body>
${html}
</body>
</html>`;
}

export default function TestResults({
  results,
  code = "",
  onToggleFullscreen,
  isFullscreen,
}: TestResultsProps) {
  const [activeTab, setActiveTab] = useState<"console" | "preview">("console");

  const isHTML = useMemo(() => {
    const detected = isHTMLCode(code);
    return detected;
  }, [code]);

  const htmlContent = useMemo(() => {
    if (!isHTML || !code.trim()) return "";
    return wrapHTML(code);
  }, [code, isHTML]);

  // Create blob URL for iframe src - recreate when htmlContent changes
  const previewSrc = useMemo(() => {
    if (!htmlContent) return "";
    const blob = new Blob([htmlContent], { type: "text/html" });
    return URL.createObjectURL(blob);
  }, [htmlContent]);

  // Auto-switch to preview tab when HTML is detected and user hasn't manually switched
  useEffect(() => {
    if (isHTML && activeTab === "console" && htmlContent) {
      // Only auto-switch if we're on console and HTML is detected
      // But let's not force it - let user decide
    }
  }, [isHTML, htmlContent, activeTab]);

  // Cleanup blob URL on unmount or when htmlContent changes
  useEffect(() => {
    return () => {
      if (previewSrc) {
        URL.revokeObjectURL(previewSrc);
      }
    };
  }, [previewSrc]);

  // Keyboard shortcut: Ctrl/Cmd + 1 for Console, Ctrl/Cmd + 2 for Preview
  useEffect(() => {
    if (!isHTML) return;

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
  }, [isHTML]);

  return (
    <div className="flex flex-col h-full border border-gray-200 rounded-md overflow-hidden bg-black text-white">
      <div className="grid grid-cols-3 h-full">
        <div className="col-span-1 w-full h-full">
          {/* Header with tabs */}
          <div className="flex justify-between items-center border-b border-gray-700 bg-gray-900 shrink-0">
            <div className="flex items-center flex-1">
              <div className="flex gap-1">
                <button
                  onClick={() => setActiveTab("console")}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all ${
                    activeTab === "console"
                      ? "text-white bg-gray-800 border-b-2 border-blue-500"
                      : "text-gray-400 hover:text-gray-300 hover:bg-gray-800/50"
                  }`}
                  title="Console (Ctrl/Cmd + 1)"
                >
                  <Terminal size={16} />
                  <span>Console</span>
                </button>
              </div>
            </div>
            {/* <button
              onClick={onToggleFullscreen}
              className="p-2 mr-2 rounded hover:bg-gray-800 transition-colors"
              title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button> */}
          </div>
          <div className="p-4 font-mono overflow-auto text-sm h-full bg-gray-950">
            {results.length > 0 ? (
              <div className="space-y-1">
                {results.map((r, i) => {
                  let color = "text-gray-300";
                  if (r.startsWith("✅")) color = "text-green-400";
                  else if (r.startsWith("❌")) color = "text-red-400";
                  else if (r.startsWith("⚠️")) color = "text-yellow-400";
                  return (
                    <div key={i} className={color}>
                      {r}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-gray-500">
                <div className="mb-2">Console output will appear here...</div>
                <div className="text-xs text-gray-600">
                  Run your code to see test results and console output.
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="col-span-2 w-full h-full">
          {/* Header with tabs */}
          <div className="flex justify-between items-center border-b border-gray-700 bg-gray-900 shrink-0">
            <div className="flex items-center flex-1">
              <div className="flex gap-1">
                <button
                  onClick={() => setActiveTab("preview")}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all ${
                    activeTab === "preview"
                      ? "text-white bg-gray-800 border-b-2 border-blue-500"
                      : "text-gray-400 hover:text-gray-300 hover:bg-gray-800/50"
                  }`}
                  title="Preview (Ctrl/Cmd + 2)"
                >
                  <Eye size={16} />
                  <span>Preview</span>
                </button>
              </div>
            </div>
            <button
              onClick={onToggleFullscreen}
              className="p-2 mr-2 rounded hover:bg-gray-800 transition-colors"
              title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          </div>
          <div className="h-full bg-white border-t border-gray-700">
            {htmlContent && previewSrc ? (
              <iframe
                key={previewSrc} // Force re-render when previewSrc changes
                src={previewSrc}
                className="w-full h-full border-0"
                title="HTML Preview"
                sandbox="allow-same-origin allow-scripts"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <div className="text-lg mb-2">No HTML to preview</div>
                  <div className="text-sm">
                    Write some HTML code to see the preview
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
