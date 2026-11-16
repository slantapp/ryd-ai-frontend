import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, ChevronLeft, Play } from "lucide-react";
import { LanguageMark } from "@/features/tests/components/LanguageMark";
import { cn } from "@/lib/utils";
import type { Pathway } from "../types";

type PathStickyBarProps = {
  pathway: Pathway;
  pathways: Pathway[];
  percent: number;
  unitNumber: number;
  unitTotal: number;
  lessonNumber: number;
  lessonTotal: number;
  finished: boolean;
  onBack?: () => void;
  onSelectPath: (id: string) => void;
  onUpNext?: () => void;
};

/** Stays on screen while the path scrolls, so "All paths" is always a tap away. */
export function PathStickyBar({
  pathway,
  pathways,
  percent,
  unitNumber,
  unitTotal,
  lessonNumber,
  lessonTotal,
  finished,
  onBack,
  onSelectPath,
  onUpNext,
}: PathStickyBarProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const canSwitch = pathways.length > 1;
  const place = finished
    ? `Path complete · ${lessonTotal} lesson${lessonTotal === 1 ? "" : "s"}`
    : `Unit ${unitNumber} of ${unitTotal} · lesson ${lessonNumber} of ${lessonTotal}`;

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [pathway.id]);

  return (
    <div className="sticky top-0 z-30 -mx-1 mb-4 bg-[#F5F4F7]/95 px-1 pb-3 pt-1 backdrop-blur-sm">
      <div className="flex flex-wrap items-center gap-2 rounded-[22px] border border-[#E7E4EE] bg-white px-2.5 py-2 shadow-[0_10px_28px_-18px_rgba(28,27,58,0.45)] sm:gap-3 sm:px-3 sm:py-2.5">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex h-10 shrink-0 items-center gap-0.5 rounded-full border border-[#E7E4EE] bg-white px-3 font-inter text-sm font-semibold text-[#1C1B3A] transition hover:bg-[#FBF7FA]"
          >
            <ChevronLeft className="size-4" aria-hidden />
            All paths
          </button>
        )}

        <div ref={menuRef} className="relative min-w-[200px] flex-1">
          <button
            type="button"
            onClick={() => canSwitch && setOpen((value) => !value)}
            aria-haspopup={canSwitch ? "listbox" : undefined}
            aria-expanded={canSwitch ? open : undefined}
            className={cn(
              "flex w-full min-w-0 items-center gap-2.5 rounded-2xl px-1.5 py-1 text-left",
              canSwitch && "hover:bg-[#FBF7FA]",
            )}
          >
            <LanguageMark title={pathway.subcategoryTitle || pathway.title} size="sm" />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-solway text-sm font-bold text-[#132050] sm:text-[15px]">{pathway.title}</span>
              <span className="block truncate font-inter text-xs text-[#6B6578]">{place}</span>
            </span>
            {canSwitch && (
              <ChevronDown className={cn("size-4 shrink-0 text-[#6B6578] transition", open && "rotate-180")} aria-hidden />
            )}
          </button>
          {open && canSwitch && (
            <ul
              role="listbox"
              aria-label="Switch learning path"
              className="absolute left-0 right-0 top-[calc(100%+6px)] z-40 max-h-72 overflow-y-auto rounded-2xl border border-[#E7E4EE] bg-white p-1.5 shadow-[0_16px_40px_-20px_rgba(28,27,58,0.45)]"
            >
              {pathways.map((item) => {
                const selected = item.id === pathway.id;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => {
                        setOpen(false);
                        if (!selected) onSelectPath(item.id);
                      }}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left",
                        selected ? "bg-[#FBF4F8]" : "hover:bg-[#F7F5FA]",
                      )}
                    >
                      <LanguageMark title={item.subcategoryTitle || item.title} size="xs" />
                      <span className="min-w-0 flex-1 truncate font-inter text-sm font-semibold text-[#132050]">{item.title}</span>
                      {selected && <Check className="size-4 shrink-0 text-primary" aria-hidden />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
          <MiniRing percent={percent} />
          {onUpNext && (
            <button
              type="button"
              onClick={onUpNext}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-primary bg-white px-3.5 font-inter text-sm font-bold text-primary transition hover:bg-[#FBF4F8] sm:px-4"
            >
              <Play className="size-3.5 fill-current" aria-hidden />
              Up next
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function MiniRing({ percent }: { percent: number }) {
  const shown = Math.max(0, Math.min(100, Math.round(percent)));
  const radius = 16;
  const circ = 2 * Math.PI * radius;
  return (
    <div className="relative grid size-11 place-items-center" aria-label={`${shown}% of this path complete`}>
      <svg viewBox="0 0 40 40" className="size-11 -rotate-90" aria-hidden>
        <circle cx="20" cy="20" r={radius} fill="none" stroke="#F3E8F1" strokeWidth="3.5" />
        <circle
          cx="20"
          cy="20"
          r={radius}
          fill="none"
          stroke="#AA468E"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - shown / 100)}
        />
      </svg>
      <span className="absolute font-inter text-[10px] font-bold tabular-nums text-[#132050]">{shown}%</span>
    </div>
  );
}
