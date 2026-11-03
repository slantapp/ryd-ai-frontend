/**
 * Browse layout shared by the Learning Path and Knowledge Tests pages:
 * category tabs → subcategory chips (with "More") → rows of cards that scroll sideways.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Filter, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { chipClass } from "./browseStyles";

export type BrowseOption = { value: string; label: string };

/** Close a popover on an outside pointer press or Escape. */
function useDismiss(open: boolean, ref: React.RefObject<HTMLElement | null>, close: () => void) {
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, ref, close]);
}

/** Underlined category tabs. */
export function CategoryTabs({
  options,
  value,
  onChange,
}: {
  options: BrowseOption[];
  value: string | null;
  onChange: (value: string) => void;
}) {
  return (
    <div className="min-w-0 overflow-x-auto border-b border-[#EDEAF3] [-webkit-overflow-scrolling:touch] scrollbar-hide">
      <div role="tablist" aria-label="Category" className="flex min-w-min gap-4 sm:gap-6">
        {options.map((option) => {
          const on = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => onChange(option.value)}
              className={cn(
                "mb-[-1px] shrink-0 border-0 border-b-2 bg-transparent pb-2.5 pt-1 text-sm whitespace-nowrap transition-colors",
                on
                  ? "border-primary font-solway font-bold text-[#132050]"
                  : "border-transparent font-medium text-[#132050]/55 hover:text-[#132050]",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** "All" plus the first few subcategories as chips; the rest sit under "More" with a filter box. */
export function TopicChips({
  options,
  value,
  onChange,
  maxVisible = 5,
}: {
  options: BrowseOption[];
  /** null = All */
  value: string | null;
  onChange: (value: string | null) => void;
  maxVisible?: number;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(open, ref, () => setOpen(false));
  if (!options.length) return null;

  const visible = options.slice(0, maxVisible);
  const hasMore = options.length > maxVisible;
  const list = options.filter(
    (t) => !query.trim() || t.label.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <div className="relative flex min-w-0 items-center gap-1.5" ref={ref}>
      <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto pb-0.5 [-webkit-overflow-scrolling:touch] scrollbar-hide">
        <button type="button" aria-pressed={value == null} onClick={() => onChange(null)} className={chipClass(value == null)}>
          All
        </button>
        {visible.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={value === option.value}
            onClick={() => onChange(value === option.value ? null : option.value)}
            className={chipClass(value === option.value)}
          >
            {option.label}
          </button>
        ))}
        {hasMore && (
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            className="inline-flex h-8 shrink-0 items-center gap-0.5 px-2 text-xs font-semibold text-primary"
          >
            More
            <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
          </button>
        )}
      </div>
      {open && (
        <div
          role="dialog"
          aria-label="More topics"
          className="absolute left-0 top-9 z-20 flex w-[min(17rem,calc(100vw-2rem))] flex-col gap-2 rounded-xl border border-[#EDEAF3] bg-white p-2.5 shadow-[0_12px_28px_rgba(19,32,80,0.12)]"
        >
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter this list"
            className="h-8 rounded-md border-[#EDEAF3] bg-[#F8F8FA] text-xs shadow-none"
          />
          <div className="flex max-h-56 flex-col overflow-y-auto">
            {list.map((option) => {
              const on = value === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "rounded-md px-2.5 py-2 text-left text-xs font-medium",
                    on ? "bg-primary/10 text-primary" : "text-[#132050] hover:bg-[#F8F8FA]",
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export type FilterSection = {
  label: string;
  options: BrowseOption[];
  value: string;
  onChange: (value: string) => void;
};

/** "Filters" button with a small popover of chip groups (Level, Progress…). */
export function FiltersPopover({
  sections,
  activeCount,
  resultCount,
  onReset,
}: {
  sections: FilterSection[];
  activeCount: number;
  resultCount: number;
  onReset: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(open, ref, () => setOpen(false));
  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "inline-flex h-9 items-center gap-1.5 rounded-md border border-[#EDEAF3] bg-[#F8F8FA] px-2.5 text-xs font-semibold text-[#132050]/75 shadow-none transition-colors hover:bg-white",
          activeCount > 0 && "border-primary/30 bg-primary/5 text-primary",
        )}
      >
        <Filter className="size-3.5" aria-hidden />
        <span className="hidden sm:inline">{activeCount ? `Filters · ${activeCount}` : "Filters"}</span>
        {activeCount > 0 && (
          <span className="flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white sm:hidden">
            {activeCount}
          </span>
        )}
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Filters"
          className="absolute right-0 top-10 z-30 flex w-[min(18rem,calc(100vw-2rem))] flex-col gap-3 rounded-xl border border-[#EDEAF3] bg-white p-3 shadow-[0_12px_28px_rgba(19,32,80,0.12)]"
        >
          {sections.map((section) => (
            <div key={section.label} className="flex flex-col gap-1.5">
              <span className="app-type-label">{section.label}</span>
              <div className="flex flex-wrap gap-1.5">
                {section.options.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={section.value === option.value}
                    onClick={() => section.onChange(option.value)}
                    className={chipClass(section.value === option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between gap-2 pt-0.5">
            <button type="button" onClick={onReset} className="h-8 px-1 text-xs font-semibold text-primary">
              Reset
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex h-8 items-center rounded-full bg-[#132050] px-3.5 text-xs font-semibold text-white"
            >
              Show {resultCount}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** A removable chip for an active search or filter. */
export function ActiveChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <button
      type="button"
      onClick={onClear}
      className="inline-flex h-7 items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 text-[11px] font-semibold text-primary"
    >
      {label}
      <X className="size-3" strokeWidth={2.5} aria-hidden />
    </button>
  );
}

/** A titled row of cards that scrolls sideways, with arrow buttons on larger screens. */
export function CardRail({
  title,
  count,
  noun,
  children,
}: {
  title: string;
  count: number;
  /** Singular noun for the count, e.g. "path" or "test". */
  noun: string;
  children: ReactNode;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const scrollByCard = (dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const amount = Math.min(el.clientWidth * 0.85, 360);
    el.scrollBy({ left: dir * amount, behavior: "smooth" });
  };

  return (
    <div className="flex min-w-0 flex-col gap-2.5">
      <div className="flex items-center gap-2">
        <h2 className="min-w-0 flex-1 truncate font-solway text-base font-bold text-[#132050] sm:text-lg">{title}</h2>
        <span className="hidden text-xs font-medium tabular-nums text-[#5C5468] sm:inline">
          {count} {noun}
          {count === 1 ? "" : "s"}
        </span>
        <div className="hidden items-center gap-1 sm:flex">
          <button
            type="button"
            aria-label={`Scroll ${title} left`}
            onClick={() => scrollByCard(-1)}
            className="inline-flex size-8 items-center justify-center rounded-full border border-[#EDEAF3] bg-white text-[#132050]/70 transition hover:border-primary/30 hover:text-primary"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            aria-label={`Scroll ${title} right`}
            onClick={() => scrollByCard(1)}
            className="inline-flex size-8 items-center justify-center rounded-full border border-[#EDEAF3] bg-white text-[#132050]/70 transition hover:border-primary/30 hover:text-primary"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
      <div
        ref={scrollerRef}
        className="-mx-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-3 pb-1 [-webkit-overflow-scrolling:touch] scrollbar-hide sm:-mx-1 sm:gap-3.5 sm:px-1"
      >
        {children}
      </div>
    </div>
  );
}
