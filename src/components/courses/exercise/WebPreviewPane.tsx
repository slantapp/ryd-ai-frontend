import { useEffect, useMemo, useRef, useState } from "react";
import { Eye, Monitor, Smartphone, Tablet } from "lucide-react";
import { buildWebPreviewDocument } from "@/utils/webCodeWorkspace";
import {
  htmlAuthorWarnings,
  PREVIEW_MESSAGE_SOURCE,
  PREVIEW_TIME_LIMIT_MESSAGE,
  type PageCheck,
} from "@/utils/webPreviewBridge";

export type PreviewLog = { level: string; message: string; line?: number };
export type PreviewCheckResult = { test: string; passed: boolean };

interface WebPreviewPaneProps {
  html: string;
  css: string;
  javascript: string;
  refreshKey?: number;
  /** HTML and CSS lessons update while typing. A web JavaScript lesson updates on Run. */
  livePreview?: boolean;
  stdin?: string;
  mocks?: Record<string, unknown>;
  checks?: PageCheck[];
  onLog?: (entry: PreviewLog) => void;
  onChecks?: (results: PreviewCheckResult[]) => void;
  onHang?: () => void;
}

type FrameWidth = "phone" | "tablet" | "full";

const WIDTH_CLASS: Record<FrameWidth, string> = {
  phone: "w-[390px] max-w-full",
  tablet: "w-[768px] max-w-full",
  full: "w-full",
};

export default function WebPreviewPane({
  html,
  css,
  javascript,
  refreshKey = 0,
  livePreview = true,
  stdin,
  mocks,
  checks = [],
  onLog,
  onChecks,
  onHang,
}: WebPreviewPaneProps) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const onLogRef = useRef(onLog);
  const onChecksRef = useRef(onChecks);
  const onHangRef = useRef(onHang);
  onLogRef.current = onLog;
  onChecksRef.current = onChecks;
  onHangRef.current = onHang;
  const [hung, setHung] = useState(false);
  const [width, setWidth] = useState<FrameWidth>("full");
  const [snap, setSnap] = useState({ html, css, javascript });
  const seenKey = useRef(refreshKey);

  useEffect(() => {
    if (livePreview) setSnap({ html, css, javascript });
  }, [livePreview, html, css, javascript]);

  useEffect(() => {
    if (livePreview || seenKey.current === refreshKey) return;
    seenKey.current = refreshKey;
    setSnap({ html, css, javascript });
  }, [refreshKey, livePreview, html, css, javascript]);

  const checksKey = JSON.stringify(checks);
  const mocksKey = JSON.stringify(mocks ?? {});
  const previewDocument = useMemo(
    () =>
      buildWebPreviewDocument(snap, {
        stdin,
        mocks,
        checks,
      }),
    // Serialized keys keep a new array from rebuilding the frame every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [snap, stdin, mocksKey, checksKey, refreshKey],
  );

  const warnings = useMemo(() => htmlAuthorWarnings(snap.html), [snap.html]);
  const watch =
    Boolean(snap.javascript.trim()) ||
    /<script/i.test(snap.html) ||
    checks.length > 0;

  useEffect(() => {
    setHung(false);
    const frame = frameRef.current;
    let timer = 0;
    if (watch) {
      timer = window.setTimeout(() => {
        setHung(true);
        onHangRef.current?.();
      }, 3000);
    }
    const onMessage = (event: MessageEvent) => {
      if (!frame || event.source !== frame.contentWindow) return;
      const data = event.data as {
        source?: string;
        type?: string;
        level?: string;
        message?: string;
        line?: number;
        results?: PreviewCheckResult[];
      };
      if (!data || data.source !== PREVIEW_MESSAGE_SOURCE) return;
      if (data.type === "log") {
        onLogRef.current?.({
          level: data.level || "log",
          message: data.message || "",
          line: data.line,
        });
      } else if (data.type === "checks") {
        window.clearTimeout(timer);
        onChecksRef.current?.(data.results ?? []);
      } else if (data.type === "idle") {
        window.clearTimeout(timer);
        setHung(false);
      }
    };
    window.addEventListener("message", onMessage);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("message", onMessage);
    };
  }, [previewDocument, watch]);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-md border border-gray-200 bg-white">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-gray-200 bg-gray-50 px-3 py-2">
        <div className="flex items-center gap-2">
          <Eye size={16} className="text-primary" />
          <h3 className="font-medium text-gray-700">
            {livePreview ? "Live Preview" : "Preview"}
          </h3>
        </div>
        <div className="flex items-center gap-1">
          {(
            [
              ["phone", Smartphone, "Phone width"],
              ["tablet", Tablet, "Tablet width"],
              ["full", Monitor, "Desktop width"],
            ] as const
          ).map(([id, Icon, label]) => (
            <button
              key={id}
              type="button"
              aria-label={label}
              title={label}
              onClick={() => setWidth(id)}
              className={`rounded p-1 ${width === id ? "bg-gray-200 text-gray-900" : "text-gray-500 hover:bg-gray-100"}`}
            >
              <Icon size={14} />
            </button>
          ))}
        </div>
      </div>
      {warnings.length > 0 ? (
        <ul className="shrink-0 space-y-1 border-b border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}
      <div className="flex min-h-0 flex-1 justify-center bg-gray-100">
        {hung ? (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-gray-600">
            {PREVIEW_TIME_LIMIT_MESSAGE}
          </div>
        ) : previewDocument.trim() ? (
          <iframe
            ref={frameRef}
            key={`${refreshKey}-${previewDocument.length}`}
            srcDoc={previewDocument}
            className={`h-full border-0 bg-white ${WIDTH_CLASS[width]}`}
            title="Web preview"
            sandbox="allow-scripts allow-popups allow-forms"
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
