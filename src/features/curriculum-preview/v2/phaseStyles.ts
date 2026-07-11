import type { BeatPhase } from "./types";

/** Phase chips / soft backgrounds using primary brand shades. */
export const PHASE_META: Record<
  BeatPhase,
  { label: string; emoji: string; chip: string; soft: string }
> = {
  hook: {
    label: "Let's begin",
    emoji: "👋",
    chip: "bg-primary/15 text-primary border-primary/25",
    soft: "from-primary/10 to-primary/5",
  },
  teach: {
    label: "Learn",
    emoji: "📚",
    chip: "bg-primary/20 text-primary border-primary/30",
    soft: "from-primary/15 via-white to-primary/5",
  },
  assess: {
    label: "Quick check",
    emoji: "🧠",
    chip: "bg-primary/15 text-primary border-primary/25",
    soft: "from-primary/10 to-white",
  },
  practice: {
    label: "Your turn",
    emoji: "✏️",
    chip: "bg-primary/25 text-primary border-primary/35",
    soft: "from-primary/20 via-primary/5 to-white",
  },
  reflect: {
    label: "Wrap up",
    emoji: "⭐",
    chip: "bg-primary/15 text-primary border-primary/25",
    soft: "from-primary/10 to-primary/5",
  },
};

export function phaseMeta(phase?: BeatPhase) {
  return phase ? PHASE_META[phase] : null;
}
