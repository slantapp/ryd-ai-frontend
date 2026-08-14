import type { AvatarShowReplacement } from "./types";

/** One queued utterance: TTS string plus optional subtitle phrase swaps. */
export type SpeechUtterance = {
  text: string;
  show?: AvatarShowReplacement[];
};

export type SpeechPart =
  | string
  | null
  | undefined
  | {
      text?: string | null;
      show?: AvatarShowReplacement[];
    };

/**
 * Map live avatar sync text to a display subtitle.
 * Only completed `say` phrases are swapped (longest first) so timing stays
 * tied to speech. Incomplete islands stay as spoken words until they finish.
 */
export function applySubtitleShow(
  spokenSoFar: string,
  replacements?: AvatarShowReplacement[] | null,
): string {
  if (!spokenSoFar || !replacements?.length) return spokenSoFar;

  const pairs = replacements
    .map((r) => ({
      say: r.say?.trim() ?? "",
      as: r.as ?? "",
    }))
    .filter((r) => r.say.length > 0 && r.say !== r.as)
    .sort((a, b) => b.say.length - a.say.length);

  if (pairs.length === 0) return spokenSoFar;

  const haystack = spokenSoFar;
  const lower = haystack.toLowerCase();
  let out = "";
  let i = 0;

  while (i < haystack.length) {
    let matched = false;
    for (const { say, as } of pairs) {
      const sayLower = say.toLowerCase();
      if (lower.startsWith(sayLower, i)) {
        out += as;
        i += say.length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      out += haystack[i];
      i += 1;
    }
  }

  return out;
}

/** Attach `show` to an authored line; generated lines stay plain strings. */
export function withShow(
  text: string | undefined | null,
  show?: AvatarShowReplacement[],
): SpeechPart {
  const trimmed = text?.trim();
  if (!trimmed) return undefined;
  if (show && show.length > 0) return { text: trimmed, show };
  return trimmed;
}

export function normalizeSpeechPart(part: SpeechPart): SpeechUtterance | null {
  if (part == null) return null;
  if (typeof part === "string") {
    const text = part.trim();
    return text ? { text } : null;
  }
  const text = part.text?.trim() ?? "";
  if (!text) return null;
  return {
    text,
    show: part.show && part.show.length > 0 ? part.show : undefined,
  };
}
