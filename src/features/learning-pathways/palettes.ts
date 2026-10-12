import type { UnitPalette } from "./types";

/** Brand-derived palettes: plum (#AA468E) and blue (#0063F7), plus two blends between them. */
export const PALETTES = {
  plum: { base: "#AA468E", shade: "#7E2F68", soft: "#F8EAF3", accent: "#DDA5D2" },
  iris: { base: "#6A55D8", shade: "#4A38AE", soft: "#F3ECFE", accent: "#B9A9F7" },
  royal: { base: "#0063F7", shade: "#0047B3", soft: "#E6F0FF", accent: "#7DB0FF" },
  rose: { base: "#B44C93", shade: "#943C78", soft: "#FBEAF4", accent: "#EFB3DA" },
} satisfies Record<string, UnitPalette>;
