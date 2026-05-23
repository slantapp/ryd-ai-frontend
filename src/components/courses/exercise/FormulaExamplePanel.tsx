import type { FormulaExample } from "@/data/curriculumData";

interface FormulaExamplePanelProps {
  example: FormulaExample;
  /** Live typed formula during instructor demo (optional). */
  liveFormula?: string;
  compact?: boolean;
}

export default function FormulaExamplePanel({
  example,
  liveFormula,
  compact = false,
}: FormulaExamplePanelProps) {
  const displayFormula = liveFormula ?? example.formula;

  return (
    <div
      className={`rounded-xl border border-indigo-200 bg-linear-to-br from-indigo-50/90 via-white to-violet-50/80 shadow-sm ${
        compact ? "p-3" : "p-5"
      }`}
    >
      {example.description && (
        <p
          className={`font-medium text-indigo-900/80 ${compact ? "mb-2 text-xs" : "mb-3 text-sm"}`}
        >
          {example.description}
        </p>
      )}
      <pre
        className={`overflow-x-auto whitespace-pre-wrap font-mono text-indigo-950 ${
          compact ? "text-sm" : "text-base sm:text-lg"
        }`}
      >
        {displayFormula}
      </pre>
      {example.explanation && !compact && (
        <p className="mt-3 border-t border-indigo-100 pt-3 text-sm leading-relaxed text-gray-700">
          {example.explanation}
        </p>
      )}
    </div>
  );
}
