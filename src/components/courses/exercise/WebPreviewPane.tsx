import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Eye, Maximize2, Monitor, Smartphone, Tablet, X } from "lucide-react";
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
  /** Maximize moves the frame, so the page runs again. Its old console lines are stale. */
  onReload?: () => void;
}

type FrameWidth = "phone" | "tablet" | "full";

/** Real page sizes. The preview box scrolls instead of squeezing the page. */
const FRAME_SIZE: Record<FrameWidth, { width: number; height: number }> = {
  phone: { width: 390, height: 844 },
  tablet: { width: 768, height: 1024 },
  full: { width: 1280, height: 800 },
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
  onReload,
}: WebPreviewPaneProps) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const onLogRef = useRef(onLog);
  const onChecksRef = useRef(onChecks);
  const onHangRef = useRef(onHang);
  const onReloadRef = useRef(onReload);
  onLogRef.current = onLog;
  onChecksRef.current = onChecks;
  onHangRef.current = onHang;
  onReloadRef.current = onReload;
  const [hung, setHung] = useState(false);
  const [width, setWidth] = useState<FrameWidth>("full");
  const [maximized, setMaximized] = useState(false);
  const shownMaximized = useRef(maximized);
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
    let timer = 0;
    if (watch) {
      timer = window.setTimeout(() => {
        setHung(true);
        onHangRef.current?.();
      }, 3000);
    }
    const onMessage = (event: MessageEvent) => {
      const frame = frameRef.current;
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

  useEffect(() => {
    if (shownMaximized.current === maximized) return;
    shownMaximized.current = maximized;
    onReloadRef.current?.();
  }, [maximized]);

  useEffect(() => {
    if (!maximized) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMaximized(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [maximized]);

  const frame = FRAME_SIZE[width];
  // Wide view uses the whole window for the desktop page. Phone and tablet keep their size.
  const fillWindow = maximized && width === "full";
  const frameStyle = fillWindow
    ? { width: "100%", height: "100%" }
    : { width: frame.width, height: frame.height };
  const widthButtons = (
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
          aria-pressed={width === id}
          title={label}
          onClick={() => setWidth(id)}
          className={`rounded p-1 ${width === id ? "bg-gray-200 text-gray-900" : "text-gray-500 hover:bg-gray-100"}`}
        >
          <Icon size={14} />
        </button>
      ))}
    </div>
  );
  const frameBody = hung ? (
    <div className="flex h-full items-center justify-center px-6 text-center text-sm text-gray-600">
      {PREVIEW_TIME_LIMIT_MESSAGE}
    </div>
  ) : previewDocument.trim() ? (
    <iframe
      ref={frameRef}
      key={`${refreshKey}-${previewDocument.length}`}
      srcDoc={previewDocument}
      style={frameStyle}
      className="shrink-0 border-0 bg-white"
      title="Web preview"
      sandbox="allow-scripts allow-popups allow-forms"
      referrerPolicy="no-referrer"
    />
  ) : (
    <div className="flex h-full items-center justify-center text-sm text-gray-500">
      Write HTML, CSS, or JavaScript to see the preview.
    </div>
  );

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
          {widthButtons}
          <button
            type="button"
            aria-label="Maximize preview"
            title="Maximize"
            onClick={() => setMaximized(true)}
            className="rounded p-1 text-gray-500 hover:bg-gray-100"
          >
            <Maximize2 size={14} />
          </button>
        </div>
      </div>
      {warnings.length > 0 ? (
        <ul className="shrink-0 space-y-1 border-b border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}
      <div className="min-h-0 flex-1 overflow-auto bg-gray-100">
        {maximized ? (
          <p className="p-4 text-sm text-gray-500">
            The preview is open wide. Close it to bring it back here.
          </p>
        ) : (
          <div className="mx-auto h-full w-fit">{frameBody}</div>
        )}
      </div>
      {maximized
        ? createPortal(
            <div
              className="fixed inset-0 z-[10040] flex flex-col bg-gray-900/70"
              role="dialog"
              aria-modal="true"
              aria-label="Wide web preview"
            >
              <div className="flex shrink-0 items-center justify-between gap-2 bg-white px-3 py-2">
                <p className="text-sm font-medium text-gray-700">Preview</p>
                <div className="flex items-center gap-2">
                  {widthButtons}
                  <button
                    type="button"
                    onClick={() => setMaximized(false)}
                    aria-label="Close the wide preview"
                    className="inline-flex items-center gap-1 rounded px-2 py-1 text-sm text-gray-600 hover:bg-gray-100"
                  >
                    <X size={16} />
                    Close
                  </button>
                </div>
              </div>
              <div className={`min-h-0 flex-1 overflow-auto ${fillWindow ? "" : "p-4"}`}>
                <div className={fillWindow ? "h-full w-full bg-white" : "mx-auto w-fit bg-white shadow"}>
                  {frameBody}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
