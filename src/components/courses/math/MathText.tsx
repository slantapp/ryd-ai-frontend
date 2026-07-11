import { useMemo } from "react";
import katex from "katex";
import { cn } from "@/lib/utils";
import {
  curriculumMathToLatex,
  looksLikeMath,
  splitMixedMathText,
} from "@/utils/mathLatex";

interface MathTextProps {
  children: string;
  /** Block-style formula (centered, larger). */
  displayMode?: boolean;
  className?: string;
  /** Force KaTeX even for plain prose. */
  forceMath?: boolean;
}

function renderKatexHtml(
  text: string,
  displayMode: boolean,
): string | null {
  try {
    return katex.renderToString(curriculumMathToLatex(text), {
      displayMode,
      throwOnError: false,
      strict: "ignore",
      trust: false,
    });
  } catch {
    return null;
  }
}

export default function MathText({
  children,
  displayMode = false,
  className,
  forceMath = false,
}: MathTextProps) {
  const segments = useMemo(() => {
    const text = children?.trim() ?? "";
    if (!text) return [];

    if (forceMath || displayMode) {
      return [{ type: "math" as const, value: text }];
    }

    if (!looksLikeMath(text)) {
      return [{ type: "text" as const, value: text }];
    }

    return splitMixedMathText(text);
  }, [children, displayMode, forceMath]);

  if (segments.length === 0) return null;

  // Single plain-text segment
  if (segments.length === 1 && segments[0].type === "text") {
    return <span className={cn("min-w-0 wrap-anywhere", className)}>{segments[0].value}</span>;
  }

  // Single math segment (short formula / forced math)
  if (segments.length === 1 && segments[0].type === "math") {
    const html = renderKatexHtml(segments[0].value, displayMode);
    if (!html) {
      return (
        <span className={cn("min-w-0 wrap-anywhere", className)}>
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

  // Mixed prose + math: prose wraps; each math run stays inline and can scroll if huge
  return (
    <span className={cn("math-rich-text inline min-w-0 wrap-anywhere", className)}>
      {segments.map((segment, index) => {
        if (segment.type === "text") {
          return <span key={index}>{segment.value}</span>;
        }

        const html = renderKatexHtml(segment.value, false);
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
