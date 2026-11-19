import { useMemo } from "react";
import katex from "katex";
import { cn } from "@/lib/utils";
import {
  curriculumMathToLatex,
  looksLikeMath,
  splitMixedMathText,
} from "@/utils/mathLatex";

export type MathTextMode = "auto" | "plain" | "latex" | "marked";

interface MathTextProps {
  children: string;
  /** Block-style formula (centered, larger). */
  displayMode?: boolean;
  className?: string;
  /** Force KaTeX even for plain prose (legacy). Prefer mode="latex". */
  forceMath?: boolean;
  /**
   * - auto: legacy mixed detection (coding/math prose helpers)
   * - plain: exact text, preserve spaces/newlines, no KaTeX
   * - latex: KaTeX each line unchanged (notation: latex)
   * - marked: prose as plain; only $...$ runs through KaTeX
   */
  mode?: MathTextMode;
  /** Alias for mode="plain" */
  plain?: boolean;
}

function renderKatexHtml(
  text: string,
  displayMode: boolean,
  convert: boolean,
): string | null {
  try {
    const latex = convert ? curriculumMathToLatex(text) : text.trim();
    return katex.renderToString(latex, {
      displayMode,
      throwOnError: false,
      strict: "ignore",
      trust: false,
    });
  } catch {
    return null;
  }
}

function renderMarkedProse(text: string, className?: string) {
  const parts: Array<{ type: "text" | "math"; value: string }> = [];
  const re = /\$([^$\n]+)\$/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      parts.push({ type: "text", value: text.slice(last, match.index) });
    }
    parts.push({ type: "math", value: match[1] });
    last = match.index + match[0].length;
  }
  if (last < text.length) {
    parts.push({ type: "text", value: text.slice(last) });
  }

  return (
    <span className={cn("min-w-0 whitespace-pre-wrap wrap-anywhere", className)}>
      {parts.map((part, i) => {
        if (part.type === "text") {
          return <span key={i}>{part.value}</span>;
        }
        const html = renderKatexHtml(part.value, false, false);
        if (!html) return <span key={i}>{part.value}</span>;
        return (
          <span
            key={i}
            className="math-text inline-block max-w-full overflow-x-auto align-baseline [&_.katex]:text-inherit"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      })}
    </span>
  );
}

export default function MathText({
  children,
  displayMode = false,
  className,
  forceMath = false,
  mode,
  plain = false,
}: MathTextProps) {
  // Explicit mode wins. Legacy forceMath/displayMode without mode keeps auto-convert.
  const resolvedMode: MathTextMode =
    mode ?? (plain ? "plain" : "auto");

  const text = children ?? "";

  const segments = useMemo(() => {
    const trimmed = text.trim();
    if (!trimmed && resolvedMode !== "plain") return [];

    if (resolvedMode === "plain") {
      return [{ type: "plain" as const, value: text }];
    }

    if (resolvedMode === "latex") {
      const lines = text.replace(/\r\n/g, "\n").split("\n");
      return lines.map((line) => ({ type: "latex" as const, value: line }));
    }

    if (resolvedMode === "marked") {
      return [{ type: "marked" as const, value: text }];
    }

    // auto (legacy) — still used by coding math helpers
    if (forceMath || displayMode) {
      return [{ type: "math" as const, value: trimmed }];
    }
    if (!looksLikeMath(trimmed)) {
      return [{ type: "text" as const, value: trimmed }];
    }
    return splitMixedMathText(trimmed);
  }, [text, resolvedMode, displayMode, forceMath]);

  if (segments.length === 0) return null;

  if (resolvedMode === "plain") {
    return (
      <span
        className={cn(
          "min-w-0 whitespace-pre-wrap wrap-anywhere font-[KaTeX_Main,STIX_Two_Math,Cambria_Math,Times_New_Roman,serif] [font-variant-numeric:tabular-nums]",
          displayMode && "block text-center text-base sm:text-lg",
          className,
        )}
      >
        {text}
      </span>
    );
  }

  if (resolvedMode === "marked") {
    return renderMarkedProse(text, className);
  }

  if (resolvedMode === "latex") {
    return (
      <span
        className={cn(
          "math-text flex min-w-0 flex-col gap-1 overflow-x-auto",
          displayMode && "items-center text-center",
          className,
        )}
      >
        {segments.map((segment, index) => {
          if (segment.type !== "latex") return null;
          const line = segment.value;
          if (!line.trim()) {
            return <span key={index} className="h-3" aria-hidden />;
          }
          const html = renderKatexHtml(line, displayMode, false);
          if (!html) {
            return (
              <span
                key={index}
                className="whitespace-pre-wrap wrap-anywhere font-[KaTeX_Main,serif] [font-variant-numeric:tabular-nums]"
              >
                {line}
              </span>
            );
          }
          return (
            <span
              key={index}
              className="max-w-full [&_.katex]:text-inherit [&_.katex-display]:max-w-full [&_.katex-display]:overflow-x-auto"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        })}
      </span>
    );
  }

  // Single plain-text segment
  if (segments.length === 1 && segments[0].type === "text") {
    return (
      <span className={cn("min-w-0 wrap-anywhere", className)}>
        {segments[0].value}
      </span>
    );
  }

  // Single math segment (short formula / forced math)
  if (segments.length === 1 && segments[0].type === "math") {
    const html = renderKatexHtml(segments[0].value, displayMode, true);
    if (!html) {
      return (
        <span className={cn("min-w-0 whitespace-pre-wrap wrap-anywhere", className)}>
          {segments[0].value}
        </span>
      );
    }
    return (
      <span
        className={cn(
          "math-text inline-block max-w-full min-w-0 overflow-x-auto align-baseline [&_.katex]:text-inherit [&_.katex-display]:max-w-full [&_.katex-display]:overflow-x-auto",
          displayMode && "math-text-display block text-center",
          className,
        )}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  // Mixed prose + math
  return (
    <span className={cn("math-rich-text inline min-w-0 wrap-anywhere", className)}>
      {segments.map((segment, index) => {
        if (segment.type === "text" || segment.type === "plain") {
          return <span key={index}>{segment.value}</span>;
        }
        if (segment.type === "marked" || segment.type === "latex") {
          return <span key={index}>{segment.value}</span>;
        }

        const html = renderKatexHtml(segment.value, false, true);
        if (!html) {
          return <span key={index}>{segment.value}</span>;
        }

        return (
          <span
            key={index}
            className="math-text inline-block max-w-full overflow-x-auto align-baseline [&_.katex]:text-inherit"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      })}
    </span>
  );
}
