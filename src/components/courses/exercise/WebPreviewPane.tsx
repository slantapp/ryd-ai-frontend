import { useMemo } from "react";
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
    // refreshKey forces a remount/rebuild when the learner clicks Run Preview
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [html, css, javascript, refreshKey],
  );

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-md border border-gray-200 bg-white">
      <div className="flex shrink-0 items-center gap-2 border-b border-gray-200 bg-gray-50 px-3 py-2">
        <Eye size={16} className="text-primary" />
        <h3 className="font-medium text-gray-700">Live Preview</h3>
      </div>
      <div className="min-h-0 flex-1 bg-white">
        {previewDocument.trim() ? (
          <iframe
            key={`${refreshKey}-${previewDocument.length}`}
            srcDoc={previewDocument}
            className="h-full w-full border-0"
            title="Web preview"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            referrerPolicy="no-referrer"
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
