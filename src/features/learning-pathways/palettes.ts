import type { UnitPalette } from "./types";

/** Brand-derived palettes: plum (#AA468E) and blue (#0063F7), plus two blends between them. */
export const PALETTES = {
  plum: { base: "#AA468E", shade: "#7E2F68", soft: "#F8EAF3", accent: "#DDA5D2" },
  iris: { base: "#6A55D8", shade: "#4A38AE", soft: "#F3ECFE", accent: "#B9A9F7" },
  royal: { base: "#0063F7", shade: "#0047B3", soft: "#E6F0FF", accent: "#7DB0FF" },
  rose: { base: "#B44C93", shade: "#943C78", soft: "#FBEAF4", accent: "#EFB3DA" },
} satisfies Record<string, UnitPalette>;

/**
 * Soft companion pastels that sit next to plum. Small accents only (tiles, pills, card washes):
 * `tint` is the pastel fill, `wash` an even lighter card background, `line` a matching border,
 * and `ink` the same-hue text/icon colour (≥ 4.5:1 on `tint`, `wash` and white).
 */
export const PASTELS = {
  lilac: { tint: "#F3ECFE", wash: "#FAF5FF", line: "#E4D9FB", ink: "#6A55D8" },
  pink: { tint: "#FCE7F3", wash: "#FDF2F8", line: "#F7D0E6", ink: "#A61E6E" },
  peach: { tint: "#FFEDD5", wash: "#FFF7ED", line: "#FBD9B5", ink: "#9A3412" },
  sunshine: { tint: "#FEF3C7", wash: "#FFFBEB", line: "#F8E2A0", ink: "#92400E" },
  mint: { tint: "#DCFCE7", wash: "#F0FDF4", line: "#C3EFD3", ink: "#166534" },
} as const;

export type Pastel = (typeof PASTELS)[keyof typeof PASTELS];

/** Order used when cycling pastels (badges, unit chips). */
export const PASTEL_CYCLE: Pastel[] = [PASTELS.lilac, PASTELS.pink, PASTELS.peach, PASTELS.mint, PASTELS.sunshine];
