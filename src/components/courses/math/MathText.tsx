import { useMemo } from "react";
import katex from "katex";
import { cn } from "@/lib/utils";
import {
  curriculumMathToLatex,
  looksLikeMath,
} from "@/utils/mathLatex";

interface MathTextProps {
  children: string;
  /** Block-style formula (centered, larger). */
  displayMode?: boolean;
  className?: string;
  /** Force KaTeX even for plain prose. */
  forceMath?: boolean;
}

export default function MathText({
  children,
  displayMode = false,
  className,
  forceMath = false,
}: MathTextProps) {
  const html = useMemo(() => {
    const text = children?.trim() ?? "";
    if (!text) return "";

    if (!forceMath && !looksLikeMath(text)) {
      return null;
    }

    try {
      const latex = curriculumMathToLatex(text);
      return katex.renderToString(latex, {
        displayMode,
        throwOnError: false,
        strict: "ignore",
        trust: false,
      });
    } catch {
      return null;
    }
  }, [children, displayMode, forceMath]);

  if (html === null) {
    return <span className={className}>{children}</span>;
  }

  return (
    <span
      className={cn(
        "math-text max-w-full min-w-0 [&_.katex]:text-[inherit] [&_.katex-display]:max-w-full [&_.katex-display]:overflow-x-auto",
        displayMode && "math-text-display block text-center",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
