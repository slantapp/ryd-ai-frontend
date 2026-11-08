import { cn } from "@/lib/utils";
import { TYPE_META } from "../cards/cardStyles";
import type { TestQuestionType } from "../types";

const GRADE_TONE: Record<string, string> = {
  A: "bg-[#ECFDF3] text-[#15803D] ring-[#16A34A]/30",
  B: "bg-[#EFF6FF] text-[#1D4ED8] ring-[#2563EB]/30",
  C: "bg-[#FFFBEB] text-[#B45309] ring-[#D97706]/30",
  D: "bg-[#FEF2F2] text-[#B91C1C] ring-[#DC2626]/30",
  PASS: "bg-[#ECFDF3] text-[#15803D] ring-[#16A34A]/30",
  FAIL: "bg-[#FEF2F2] text-[#B91C1C] ring-[#DC2626]/30",
};

/** Letter grades (legacy) stay circular; Pass/Fail use a wider pill. */
export function GradeBadge({ grade, size = "md" }: { grade: string | null | undefined; size?: "sm" | "md" | "lg" }) {
  if (!grade) return null;
  const key = grade.toUpperCase();
  const tone = GRADE_TONE[key] ?? "bg-[#F6E9FB] text-primary ring-primary/30";
  const isWord = grade.length > 1;
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center font-extrabold ring-2",
        tone,
        isWord
          ? cn(
              "rounded-full px-3",
              size === "sm" && "h-7 text-xs",
              size === "md" && "h-10 px-4 text-sm",
              size === "lg" && "h-14 px-6 text-xl",
            )
          : cn(
              "rounded-full",
              size === "sm" && "size-7 text-xs",
              size === "md" && "size-10 text-base",
              size === "lg" && "size-20 text-4xl",
            ),
      )}
      aria-label={key === "PASS" || key === "FAIL" ? key : `Grade ${grade}`}
    >
      {grade}
    </span>
  );
}

/**
 * Compact type pills for test cards. Shows a few named chips, then "+N more"
 * so a sampler with many board types stays readable.
 */
export function TypeChips({
  types,
  maxVisible = 2,
}: {
  types: TestQuestionType[];
  /** How many named chips to show before collapsing the rest. Use 0 to hide names and only show a count. */
  maxVisible?: number;
}) {
  const known = types.filter((t) => TYPE_META[t]);
  if (!known.length) return null;

  const shown = maxVisible > 0 ? known.slice(0, maxVisible) : [];
  const hidden = known.slice(shown.length);
  const hiddenLabels = hidden.map((t) => TYPE_META[t]!.label).join(", ");

  return (
    <div className="flex flex-wrap gap-1.5">
      {shown.map((t) => {
        const meta = TYPE_META[t]!;
        const Icon = meta.icon;
        return (
          <span key={t} className="inline-flex items-center gap-1 rounded-full bg-[#F6E9FB] px-2.5 py-1 text-[11px] font-semibold text-primary">
            <Icon className="size-3" aria-hidden />
            {meta.label}
          </span>
        );
      })}
      {hidden.length > 0 ? (
        <span
          className="inline-flex items-center rounded-full bg-[#F3EEF7] px-2.5 py-1 text-[11px] font-semibold text-[#6B6572]"
          title={hiddenLabels}
          aria-label={`${hidden.length} more card types: ${hiddenLabels}`}
        >
          {shown.length === 0 ? `${known.length} card types` : `+${hidden.length} more`}
        </span>
      ) : null}
    </div>
  );
}

export function MetaChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-[#F8F8FA] px-2.5 py-1 font-inter text-xs font-medium text-[#132050]/75">
      {children}
    </span>
  );
}
