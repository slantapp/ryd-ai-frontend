import type { FormulaExample } from "@/data/curriculumData";
import { Sparkles } from "lucide-react";
import MathText from "./MathText";
import { cn } from "@/lib/utils";
import { formatFormulaBoardText } from "@/utils/formulaBoard";

interface MathFormulaBoardProps {
  example: FormulaExample;
  liveFormula?: string;
  compact?: boolean;
  className?: string;
}

export default function MathFormulaBoard({
  example,
  liveFormula,
  compact = false,
  className,
}: MathFormulaBoardProps) {
  const raw = liveFormula ?? example.formula ?? "";
  // Keep authored newlines/spaces; only tidy "; " separators for multi-statements
  // that were written on one line without \n.
  const formula = /\n/.test(raw)
    ? raw.replace(/\r\n/g, "\n")
    : formatFormulaBoardText(raw).replace(/\s*;\s*/g, "\n");
  // Explicit notation wins; otherwise detect LaTeX commands / $…$ so older
  // sampler boards (B6/B7) still render stacked fractions.
  const notation =
    example.notation === "latex" ||
    example.notation === "plain"
      ? example.notation
      : /\\[a-zA-Z]+|\$[^$\n]+\$/.test(raw)
        ? "latex"
        : "plain";

  return (
    <div
      className={cn(
        "min-w-0 overflow-hidden rounded-2xl border-2 border-primary/15 bg-white shadow-md shadow-primary/5",
        compact ? "p-3 sm:p-4" : "p-4 sm:p-5",
        className,
      )}
    >
      <div
        className={cn(
          "min-w-0 overflow-x-auto rounded-xl bg-linear-to-br from-primary/5 via-primary/[0.03] to-white",
          compact ? "px-3 py-4 sm:px-4" : "px-4 py-5 sm:px-5",
        )}
      >
        <div className="mb-2 flex items-center justify-center gap-2 text-primary">
          <Sparkles className="size-3.5 shrink-0 sm:size-4" aria-hidden />
          <span className="text-[0.65rem] font-bold uppercase tracking-wider sm:text-xs">
            Worked example
          </span>
        </div>
        <MathText
          displayMode
          mode={notation}
          className={cn(
            "text-gray-900",
            compact
              ? "text-sm sm:text-base lg:text-lg"
              : "text-base sm:text-lg lg:text-xl",
          )}
        >
          {formula}
        </MathText>
      </div>

      {example.description && !compact && (
        <p className="mt-3 min-w-0 text-sm leading-relaxed text-gray-600 wrap-anywhere whitespace-pre-wrap">
          <MathText mode="marked">{example.description}</MathText>
        </p>
      )}
      {example.explanation && !liveFormula && (
        <p
          className={cn(
            "min-w-0 leading-relaxed text-gray-700 wrap-anywhere whitespace-pre-wrap",
            compact ? "mt-2 text-xs sm:text-sm" : "mt-3 text-sm sm:text-base",
          )}
        >
          <MathText mode="marked">{example.explanation}</MathText>
        </p>
      )}
    </div>
  );
}
