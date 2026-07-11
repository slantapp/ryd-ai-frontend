import { phaseMeta } from "../phaseStyles";
import type { BeatPhase } from "../types";

export function PhaseBadge({ phase }: { phase?: BeatPhase }) {
  const meta = phaseMeta(phase);
  if (!meta) return null;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold tracking-wide ${meta.chip}`}
    >
      <span aria-hidden>{meta.emoji}</span>
      {meta.label}
    </span>
  );
}
