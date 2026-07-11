/** Strip light markdown so TTS reads learning text naturally. */
export function stripMarkdownForSpeech(raw: string): string {
  return raw
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/\n{2,}/g, ". ")
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+\./g, ".")
    .trim();
}

/** Join non-empty speech parts with a short pause-friendly separator. */
export function joinSpeechParts(parts: Array<string | undefined | null>): string {
  return parts
    .map((p) => (p ? stripMarkdownForSpeech(p) : ""))
    .filter(Boolean)
    .join(" ");
}
