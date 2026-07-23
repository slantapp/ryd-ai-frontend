import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileCollapsibleProps {
  /** Short noun used in the toggle, e.g. "question" → "Show question". */
  label: string;
  children: ReactNode;
  /** Open on first render. Defaults to collapsed so the workspace gets priority. */
  defaultOpen?: boolean;
  className?: string;
  /** Optional right-aligned hint text shown in the toggle bar. */
  hint?: string;
}

/**
 * Lightweight show/hide disclosure used to keep secondary lesson content
 * (question prompts, hints) out of the way on small screens so the code
 * editor / workspace can take the full available height. Purely presentational
 * — no effect on the desktop layout, which renders content directly instead.
 */
export function MobileCollapsible({
  label,
  children,
  defaultOpen = false,
  className,
  hint,
}: MobileCollapsibleProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-primary/15 bg-white/85 shadow-sm",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs font-semibold text-primary transition-colors hover:bg-primary/5 active:bg-primary/10 sm:text-sm"
      >
        <span className="flex items-center gap-1.5">
          {open ? `Hide ${label}` : `Show ${label}`}
        </span>
        <span className="flex items-center gap-1.5 text-[0.65rem] font-medium text-primary/60">
          {hint && !open ? <span className="truncate">{hint}</span> : null}
          <ChevronDown
            className={cn(
              "size-4 shrink-0 transition-transform duration-200",
              open && "rotate-180",
            )}
            aria-hidden
          />
        </span>
      </button>
      {open && (
        <div className="border-t border-primary/10 px-3 py-3">{children}</div>
      )}
    </div>
  );
}

export default MobileCollapsible;
