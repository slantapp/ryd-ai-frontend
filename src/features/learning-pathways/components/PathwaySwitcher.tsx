import { cn } from "@/lib/utils";
import type { Pathway } from "../types";
import { pathwayIcon } from "./icons";

type PathwaySwitcherProps = {
  pathways: Pathway[];
  activeId: string;
  /** pathway id -> 0..100 progress (lesson-level). */
  percents: Record<string, number>;
  onSelect: (id: string) => void;
};

export function PathwaySwitcher({ pathways, activeId, percents, onSelect }: PathwaySwitcherProps) {
  return (
    <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2 pt-1 scrollbar-hide">
      {pathways.map((p) => {
        const Icon = pathwayIcon(p.icon);
        const active = p.id === activeId;
        const percent = percents[p.id] ?? 0;
        const r = 22;
        const c = 2 * Math.PI * r;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onSelect(p.id)}
            aria-pressed={active}
            className={cn(
              "group relative flex w-[232px] shrink-0 snap-start items-center gap-3 overflow-hidden rounded-[20px] border bg-white p-3 text-left transition-colors duration-200",
              !active && "border-[#EADCE8] hover:border-[#D6D3DF] hover:bg-[#FAFAFC]",
            )}
            style={active ? { borderColor: p.palette.base, boxShadow: `inset 0 0 0 1px ${p.palette.base}, 0 1px 2px rgba(19,32,80,0.06)` } : undefined}
          >
            <span className="relative flex size-14 shrink-0 items-center justify-center">
              <svg viewBox="0 0 52 52" className="absolute inset-0 size-14 -rotate-90" aria-hidden>
                <circle cx="26" cy="26" r={r} fill="none" stroke="#EEEDF3" strokeWidth="3" />
                <circle
                  cx="26"
                  cy="26"
                  r={r}
                  fill="none"
                  stroke={p.palette.base}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={c}
                  strokeDashoffset={c * (1 - percent / 100)}
                  className="transition-[stroke-dashoffset] duration-700 ease-out"
                />
              </svg>
              <span
                className="flex size-10 items-center justify-center rounded-full"
                style={{ background: p.palette.soft, color: p.palette.base }}
              >
                <Icon className="size-5" strokeWidth={2.2} />
              </span>
            </span>
            <span className="relative min-w-0">
              <span className="block truncate font-solway text-sm font-bold text-[#132050]">{p.title}</span>
              <span className="block truncate font-inter text-xs text-[#5C5468]">{p.language}</span>
              <span className="mt-1 inline-block font-inter text-[11px] font-bold tabular-nums" style={{ color: p.palette.base }}>
                {percent}% complete
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
