import { useEffect, useMemo } from "react";
import { Eye } from "lucide-react";
import { buildWebPreviewDocument } from "@/utils/webCodeWorkspace";

interface WebPreviewPaneProps {
  html: string;
  css: string;
  javascript: string;
  refreshKey?: number;
}

export default function WebPreviewPane({
  html,
  css,
  javascript,
  refreshKey = 0,
}: WebPreviewPaneProps) {
  const previewDocument = useMemo(
    () => buildWebPreviewDocument({ html, css, javascript }),
    [html, css, javascript, refreshKey],
  );

  const previewSrc = useMemo(() => {
    if (!previewDocument.trim()) return "";
    const blob = new Blob([previewDocument], { type: "text/html" });
    return URL.createObjectURL(blob);
  }, [previewDocument]);

  useEffect(() => {
    return () => {
      if (previewSrc) {
        URL.revokeObjectURL(previewSrc);
      }
    };
  }, [previewSrc]);

  return (
    <div className="flex h-full flex-col overflow-hidden border border-gray-200 rounded-md bg-white">
      <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-50 px-3 py-2 shrink-0">
        <Eye size={16} className="text-primary" />
        <h3 className="font-medium text-gray-700">Live Preview</h3>
      </div>
      <div className="flex-1 min-h-0 bg-white">
        {previewSrc ? (
          <iframe
            key={previewSrc}
            src={previewSrc}
            className="h-full w-full border-0"
            title="Web preview"
            sandbox="allow-scripts allow-same-origin"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-gray-500">
            Write HTML, CSS, or JavaScript to see the preview.
          </div>
        )}
      </div>
    </div>
  );
}
