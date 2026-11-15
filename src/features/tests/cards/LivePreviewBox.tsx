/**
 * Sandboxed HTML/CSS preview for AI-test cards.
 * Predict tiles use an iframe with no scripts; Match/Cascade reuse the same builder.
 */
import { useMemo, useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

const BASE_RESET = `*{box-sizing:border-box}html,body{margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1B1838;overflow:hidden}`;

/** Full-bleed page (Match / Tap author layouts control their own spacing). */
const PAGE_CSS = `${BASE_RESET}html,body{height:100%;background:#fff}`;

/**
 * Predict option tile: centred visual on the soft lilac ground from the design HTML.
 * Ignores author `height:100vh` in previewBase so the 86px tile stays centred.
 */
const TILE_CSS = `${BASE_RESET}
html,body{height:100%;width:100%;background:#FAF8FC}
body{display:flex;align-items:center;justify-content:center;padding:8px}
`;

/**
 * Result stage (Which rule wins): centred content inset from the frame so it
 * doesn't sit on the container border.
 */
const STAGE_CSS = `${BASE_RESET}
html,body{height:100%;width:100%;background:#FAF8FC}
body{display:flex;align-items:center;justify-content:center;padding:16px}
`;

export function buildPreviewSrcDoc(
  html: string,
  css?: string | null,
  mode: "page" | "tile" | "stage" = "page",
): string {
  const base = mode === "tile" ? TILE_CSS : mode === "stage" ? STAGE_CSS : PAGE_CSS;
  // For centred modes, strip viewport-height rules so content can sit mid-frame.
  let extra = (css || "").trim();
  if (mode === "tile" || mode === "stage") {
    extra = extra
      .replace(/height\s*:\s*100vh\s*;?/gi, "")
      .replace(/min-height\s*:\s*100vh\s*;?/gi, "");
  }
  const style = [base, extra].filter(Boolean).join("\n");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${style}</style></head><body>${html || ""}</body></html>`;
}

/** Reject preview HTML that could load remote assets or run handlers. */
export function isUnsafePreviewHtml(html: string): boolean {
  const s = String(html || "");
  if (!s) return false;
  if (/<script[\s>/]/i.test(s)) return true;
  if (/\son[a-z]+\s*=/i.test(s)) return true;
  if (/<\/?(iframe|form|object|embed|link|meta|base)\b/i.test(s)) return true;
  if (/https?:\/\//i.test(s)) return true;
  if (/url\s*\(\s*['"]?\s*https?:/i.test(s)) return true;
  return false;
}

type LivePreviewBoxProps = {
  html: string;
  css?: string | null;
  /** When true, parent can read/tap elements inside the frame (still no scripts). */
  allowSameOrigin?: boolean;
  /** page = full bleed; tile = predict option; stage = centred result inset. */
  mode?: "page" | "tile" | "stage";
  className?: string;
  style?: CSSProperties;
  title?: string;
  /** Shown if HTML is rejected. */
  fallback?: string;
  onReady?: (doc: Document | null) => void;
};

export function LivePreviewBox({
  html,
  css,
  allowSameOrigin = false,
  mode = "page",
  className,
  style,
  title = "Preview",
  fallback,
  onReady,
}: LivePreviewBoxProps) {
  const unsafe = isUnsafePreviewHtml(html) || isUnsafePreviewHtml(css || "");
  const [failed, setFailed] = useState(false);
  const srcDoc = useMemo(() => {
    if (unsafe) return "";
    return buildPreviewSrcDoc(html, css, mode);
  }, [html, css, unsafe, mode]);

  const framed = mode === "page" || mode === "stage";
  const soft = mode === "tile" || mode === "stage";

  if (unsafe || failed) {
    return (
      <div
        className={cn(
          "flex items-center justify-center overflow-hidden px-2 text-center text-[12px] font-semibold text-[#6D6985]",
          soft ? "rounded-[11px] bg-[#FAF8FC]" : "rounded-xl bg-[#FAFAFA]",
          framed && "border border-[#E6E0EC]",
          className,
        )}
        style={style}
        role="img"
        aria-label={fallback || title}
      >
        {fallback || "Preview unavailable"}
      </div>
    );
  }

  return (
    <iframe
      title={title}
      srcDoc={srcDoc}
      // Empty sandbox = no scripts/forms/nav. allow-same-origin alone still blocks scripts.
      sandbox={allowSameOrigin ? "allow-same-origin" : ""}
      className={cn(
        "pointer-events-none block w-full overflow-hidden",
        mode === "tile" && "rounded-[11px] border-0 bg-[#FAF8FC]",
        mode === "stage" && "rounded-xl border border-[#E6E0EC] bg-[#FAF8FC]",
        mode === "page" && "rounded-xl border border-[#E6E0EC] bg-white",
        className,
      )}
      style={{
        border: mode === "tile" ? "0" : "1px solid #E6E0EC",
        ...style,
      }}
      referrerPolicy="no-referrer"
      tabIndex={-1}
      aria-hidden
      onLoad={(e) => {
        // Without allow-same-origin, contentDocument is null — that is expected, not a failure.
        if (!allowSameOrigin) {
          onReady?.(null);
          return;
        }
        try {
          const doc = e.currentTarget.contentDocument;
          if (!doc) {
            setFailed(true);
            onReady?.(null);
            return;
          }
          onReady?.(doc);
        } catch {
          setFailed(true);
          onReady?.(null);
        }
      }}
    />
  );
}
