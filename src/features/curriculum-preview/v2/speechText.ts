import { toSpeech } from "@/utils/mathSpeech";

/** Strip light markdown so TTS reads learning text naturally. */
export function stripMarkdownForSpeech(raw: string): string {
  return raw
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\$([^$\n]+)\$/g, "$1")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/\n{2,}/g, ". ")
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+\./g, ".")
    .trim();
}

/**
 * Prepare text for the avatar voice.
 * When `maths` is true, also run `toSpeech()` for symbols / fractions / emoji.
 */
export function prepareSpeechText(
  raw: string | undefined | null,
  maths = false,
): string {
  if (!raw) return "";
  const stripped = stripMarkdownForSpeech(raw);
  return maths ? toSpeech(stripped) : stripped;
}

/** Join non-empty speech parts with a short pause-friendly separator. */
export function joinSpeechParts(
  parts: Array<string | undefined | null>,
  maths = false,
): string {
  return parts
    .map((p) => (p ? prepareSpeechText(p, maths) : ""))
    .filter(Boolean)
    .join(" ");
}
