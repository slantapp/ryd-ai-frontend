/** How far the rewind control jumps back. */
export const REWIND_SECONDS = 10;

/**
 * Gap between stopping the avatar and re-speaking. Long enough for the
 * speech-end event triggered by the stop to arrive and be swallowed.
 */
export const REWIND_RESPEAK_DELAY_MS = 180;

/** Used only until the avatar reports subtitle progress (Deepgram @ rate 0.9). */
const FALLBACK_CHARS_PER_SECOND = 11;
const MIN_CHARS_PER_SECOND = 4;
const MAX_CHARS_PER_SECOND = 30;
/** Shorter windows are too noisy to extrapolate a speaking rate from. */
const MIN_RATE_WINDOW_MS = 1500;
const MAX_SAMPLES = 2000;

export type SpeechSlice = {
  /** Text to hand back to `speakText`. */
  text: string;
  /** Where `text` starts inside the full utterance. */
  startIndex: number;
};

/** One observed (playback time → spoken character) pair. */
type ProgressSample = { playbackMs: number; index: number };

export type SpeechRewindTracker = {
  /** A brand new utterance is being spoken from the top. */
  beginUtterance: (fullText: string) => void;
  /** The same utterance is being re-spoken from `startIndex` (after a rewind). */
  beginChunk: (startIndex: number) => void;
  /** Audio actually started — re-anchors the clock past TTS synthesis latency. */
  noteAudioStart: () => void;
  /** Live subtitle text (spoken-so-far) from the avatar. */
  noteSubtitle: (spokenSoFar: string) => void;
  notePause: () => void;
  noteResume: () => void;
  reset: () => void;
  /** Text that replays the last `seconds`, or null when nothing can be replayed. */
  computeRewind: (seconds?: number) => SpeechSlice | null;
  /** Text from the current position onwards, for resuming a dropped utterance. */
  computeResume: () => SpeechSlice | null;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function isSpace(char: string | undefined): boolean {
  return !!char && /\s/.test(char);
}

/** Nearest word start at or before `index`, skipping any leading whitespace. */
function snapToWordStart(text: string, index: number): number {
  let i = clamp(Math.floor(index), 0, text.length);
  while (i > 0 && !isSpace(text[i - 1])) i--;
  while (i < text.length && isSpace(text[i])) i++;
  return i;
}

/** Start of the word before `index` — guarantees movement backwards. */
function wordStartBefore(text: string, index: number): number {
  const at = snapToWordStart(text, index);
  if (at < index) return at;
  let i = at - 1;
  while (i > 0 && isSpace(text[i])) i--;
  return snapToWordStart(text, i);
}

/**
 * Map subtitle text onto a character count inside `chunkText`.
 * Handles both cumulative subtitles and per-phrase ones; returns null when the
 * subtitle can't be located (avatar rewrote the text) so the caller keeps the
 * last known position.
 */
function alignSpokenLength(
  chunkText: string,
  spokenSoFar: string,
  hint: number,
): number | null {
  const spoken = spokenSoFar.trim();
  if (!spoken) return null;

  const haystack = chunkText.toLowerCase();
  const needle = spoken.toLowerCase();

  if (haystack.startsWith(needle)) return needle.length;

  const from = Math.max(0, hint - needle.length);
  let at = haystack.indexOf(needle, from);
  if (at < 0) at = haystack.indexOf(needle);
  if (at < 0) return null;

  return at + needle.length;
}

/**
 * Tracks where the avatar actually is inside the utterance it is speaking, so
 * "rewind 10 seconds" replays real audio instead of a guess.
 *
 * Position comes from the avatar's own subtitle stream (time → character
 * samples), which means the estimate self-corrects to the live speaking rate.
 * A character-rate estimate is only used to reach back before the start of the
 * current chunk (e.g. tapping rewind twice in a row).
 */
export function createSpeechRewindTracker(): SpeechRewindTracker {
  let fullText = "";
  let chunkStartIndex = 0;
  let spokenIndex = 0;
  let samples: ProgressSample[] = [];
  /** Playback time accumulated before the current play stretch. */
  let playedBeforeMs = 0;
  /** Wall clock when the current play stretch began; 0 while paused. */
  let playingSinceMs = 0;
  /** Last rate observed for this utterance; survives re-speaks after a rewind. */
  let observedCharsPerSecond = 0;

  const playbackMs = () =>
    playedBeforeMs + (playingSinceMs > 0 ? Date.now() - playingSinceMs : 0);

  const startChunk = (startIndex: number) => {
    chunkStartIndex = clamp(startIndex, 0, fullText.length);
    spokenIndex = chunkStartIndex;
    samples = [{ playbackMs: 0, index: chunkStartIndex }];
    playedBeforeMs = 0;
    playingSinceMs = Date.now();
  };

  /** Re-derive the live speaking rate from the samples collected so far. */
  const measureRate = () => {
    const first = samples[0];
    const last = samples[samples.length - 1];
    if (!first || !last) return;
    const ms = last.playbackMs - first.playbackMs;
    const chars = last.index - first.index;
    if (ms < MIN_RATE_WINDOW_MS || chars <= 0) return;
    observedCharsPerSecond = clamp(
      (chars / ms) * 1000,
      MIN_CHARS_PER_SECOND,
      MAX_CHARS_PER_SECOND,
    );
  };

  const charsPerSecond = () =>
    observedCharsPerSecond || FALLBACK_CHARS_PER_SECOND;

  const sliceFrom = (index: number): SpeechSlice | null => {
    const startIndex = clamp(index, 0, fullText.length);
    const text = fullText.slice(startIndex).trim();
    return text ? { text, startIndex } : null;
  };

  return {
    beginUtterance(text) {
      fullText = text ?? "";
      observedCharsPerSecond = 0;
      startChunk(0);
    },

    beginChunk(startIndex) {
      if (!fullText) return;
      startChunk(startIndex);
    },

    noteAudioStart() {
      // Only re-anchor before any progress, so a stray event mid-line is ignored.
      if (spokenIndex !== chunkStartIndex) return;
      playedBeforeMs = 0;
      playingSinceMs = Date.now();
      samples = [{ playbackMs: 0, index: chunkStartIndex }];
    },

    noteSubtitle(spokenSoFar) {
      if (!fullText) return;
      const within = alignSpokenLength(
        fullText.slice(chunkStartIndex),
        spokenSoFar,
        spokenIndex - chunkStartIndex,
      );
      if (within == null) return;

      const index = clamp(chunkStartIndex + within, 0, fullText.length);
      if (index <= spokenIndex) return;

      spokenIndex = index;
      samples.push({ playbackMs: playbackMs(), index });
      if (samples.length > MAX_SAMPLES) samples.splice(1, 1);
      measureRate();
    },

    notePause() {
      if (playingSinceMs === 0) return;
      playedBeforeMs = playbackMs();
      playingSinceMs = 0;
    },

    noteResume() {
      if (playingSinceMs > 0) return;
      playingSinceMs = Date.now();
    },

    reset() {
      fullText = "";
      chunkStartIndex = 0;
      spokenIndex = 0;
      samples = [];
      playedBeforeMs = 0;
      playingSinceMs = 0;
      observedCharsPerSecond = 0;
    },

    computeRewind(seconds = REWIND_SECONDS) {
      if (!fullText.trim()) return null;

      const targetMs = playbackMs() - seconds * 1000;
      let targetIndex: number;

      if (targetMs >= 0) {
        // Walk the observed samples — no rate assumption needed.
        targetIndex = chunkStartIndex;
        for (const sample of samples) {
          if (sample.playbackMs > targetMs) break;
          targetIndex = sample.index;
        }
      } else {
        // Rewinding past the start of this chunk; estimate the overshoot.
        const deficitSeconds = -targetMs / 1000;
        targetIndex = chunkStartIndex - deficitSeconds * charsPerSecond();
      }

      let startIndex = snapToWordStart(
        fullText,
        clamp(targetIndex, 0, fullText.length),
      );
      // Never let a rewind land at or ahead of where the avatar already is.
      if (startIndex >= spokenIndex && spokenIndex > 0) {
        startIndex = wordStartBefore(fullText, spokenIndex);
      }

      return sliceFrom(startIndex);
    },

    computeResume() {
      if (!fullText.trim()) return null;
      return sliceFrom(snapToWordStart(fullText, spokenIndex));
    },
  };
}
