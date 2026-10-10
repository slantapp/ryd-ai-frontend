import { cn } from "@/lib/utils";
import type { Pathway } from "../types";
import { PATHWAY_ICONS } from "./icons";

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
        const Icon = PATHWAY_ICONS[p.icon];
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
              "group relative flex w-[232px] shrink-0 snap-start items-center gap-3 overflow-hidden rounded-[20px] p-3 text-left transition-all duration-300",
              active
                ? "lp-sky shadow-[0_14px_30px_-14px_rgba(19,32,80,0.7)]"
                : "border border-[#EDEAF3] bg-white hover:-translate-y-0.5 hover:border-[#DDB5D2] hover:shadow-[0_10px_24px_-14px_rgba(170,70,142,0.45)]",
            )}
          >
            {active && (
              <span
                className="pointer-events-none absolute -right-8 -top-10 size-28 rounded-full opacity-60 blur-2xl"
                style={{ background: p.palette.base }}
                aria-hidden
              />
            )}
            <span className="relative flex size-14 shrink-0 items-center justify-center">
              <svg viewBox="0 0 52 52" className="absolute inset-0 size-14 -rotate-90" aria-hidden>
                <circle cx="26" cy="26" r={r} fill="none" stroke={active ? "rgba(243,236,254,0.15)" : "#F3ECFE"} strokeWidth="3" />
                <circle
                  cx="26"
                  cy="26"
                  r={r}
                  fill="none"
                  stroke={active ? p.palette.accent : p.palette.base}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={c}
                  strokeDashoffset={c * (1 - percent / 100)}
                  className="transition-[stroke-dashoffset] duration-700 ease-out"
                />
              </svg>
              <span
                className="flex size-10 items-center justify-center rounded-full text-white"
                style={{ background: `radial-gradient(circle at 32% 26%, ${p.palette.accent}, ${p.palette.base} 55%, ${p.palette.shade})` }}
              >
                <Icon className="size-5" strokeWidth={2.2} />
              </span>
            </span>
            <span className="relative min-w-0">
              <span className={cn("block truncate font-solway text-sm font-bold", active ? "text-white" : "text-[#0A090B]")}>
                {p.title}
              </span>
              <span className={cn("block truncate font-inter text-xs", active ? "text-[#F3ECFE]/70" : "text-[#4F4D55]")}>
                {p.language}
              </span>
              <span
                className="mt-1 inline-block font-inter text-[11px] font-bold tabular-nums"
                style={{ color: active ? p.palette.accent : p.palette.base }}
              >
                {percent}% · {p.level}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
