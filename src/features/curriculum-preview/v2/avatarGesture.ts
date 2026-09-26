import type { TeachingGestureName } from "@thattobi/narrator-avatar";

/** TalkingHead's rig-safe hand poses. */
export const AVATAR_HAND_GESTURE_NAMES = [
  "handup",
  "index",
  "ok",
  "thumbup",
  "thumbdown",
  "side",
  "shrug",
  "namaste",
] as const;

/** Semantic teaching beats and combined sequences exposed by the package. */
export const AVATAR_TEACHING_GESTURE_NAMES = [
  "greet",
  "invite",
  "explain",
  "count",
  "emphasize",
  "celebrate",
  "encourage",
  "think",
  "caution",
  "thanks",
  "recap",
  "transition",
  "wave",
  "bow",
  "nod",
  "disagree",
  "present",
  "whiteboard",
  "welcomeSequence",
  "boardExplainSequence",
  "guidedQuestionSequence",
  "celebrateSequence",
  "gentleCorrectionSequence",
  "recapSequence",
  "goodbyeSequence",
] as const satisfies readonly TeachingGestureName[];

export const AVATAR_GESTURE_NAMES = [
  ...AVATAR_HAND_GESTURE_NAMES,
  ...AVATAR_TEACHING_GESTURE_NAMES,
] as const;

export type AvatarGestureName = (typeof AVATAR_GESTURE_NAMES)[number];

const GESTURE_NAME_SET = new Set<string>(AVATAR_GESTURE_NAMES);
const GESTURE_NAME_LOOKUP = new Map<string, AvatarGestureName>(
  AVATAR_GESTURE_NAMES.map((name) => [name.toLowerCase(), name]),
);
const TEACHING_GESTURE_NAME_SET = new Set<string>(AVATAR_TEACHING_GESTURE_NAMES);

/** Optional authored gesture: string name or options object. */
export type AvatarGesture =
  | AvatarGestureName
  | {
      name: AvatarGestureName;
      /** Hold duration in seconds (package default ~3). */
      dur?: number;
      /** Use right hand when true (default left). */
      mirror?: boolean;
      /** Hand-pose transition time in ms; also accepted as a teaching blend fallback. */
      ms?: number;
      /** Teaching gesture transition time in ms. */
      blendMs?: number;
      /** Optional eye-contact pulse while gesturing. */
      eyeContactMs?: number;
      /** Optional TalkingHead mood (e.g. happy, neutral). */
      mood?: string;
    };

export type NormalizedAvatarGesture = {
  name: AvatarGestureName;
  dur?: number;
  mirror?: boolean;
  ms?: number;
  blendMs?: number;
  eyeContactMs?: number;
  mood?: string;
};

export function isAvatarGestureName(value: string): value is AvatarGestureName {
  return GESTURE_NAME_SET.has(value);
}

/** Accept case-insensitive authored JSON while preserving sequence camelCase. */
export function resolveAvatarGestureName(value: string): AvatarGestureName | null {
  return GESTURE_NAME_LOOKUP.get(value.trim().toLowerCase()) ?? null;
}

/** Normalize curriculum gesture field; returns null when absent/invalid. */
export function normalizeAvatarGesture(
  value: unknown,
): NormalizedAvatarGesture | null {
  if (value == null) return null;
  if (typeof value === "string") {
    const name = resolveAvatarGestureName(value);
    return name ? { name } : null;
  }
  if (typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (typeof row.name !== "string") return null;
  const name = resolveAvatarGestureName(row.name);
  if (!name) return null;

  const out: NormalizedAvatarGesture = { name };
  if (typeof row.dur === "number" && Number.isFinite(row.dur) && row.dur > 0) {
    out.dur = row.dur;
  }
  if (typeof row.mirror === "boolean") out.mirror = row.mirror;
  if (typeof row.ms === "number" && Number.isFinite(row.ms) && row.ms >= 0) {
    out.ms = row.ms;
  }
  if (
    typeof row.blendMs === "number" &&
    Number.isFinite(row.blendMs) &&
    row.blendMs >= 0
  ) {
    out.blendMs = row.blendMs;
  }
  if (
    typeof row.eyeContactMs === "number" &&
    Number.isFinite(row.eyeContactMs) &&
    row.eyeContactMs > 0
  ) {
    out.eyeContactMs = row.eyeContactMs;
  }
  if (typeof row.mood === "string" && row.mood.trim()) {
    out.mood = row.mood.trim();
  }
  return out;
}

export type GestureCapableAvatar = {
  playGesture?: (
    name: string,
    dur?: number,
    mirror?: boolean,
    ms?: number,
  ) => void;
  playTeachingGesture?: (
    name: TeachingGestureName,
    options?: { dur?: number; mirror?: boolean; blendMs?: number },
  ) => boolean;
  makeEyeContact?: (durationMs?: number) => void;
  setMood?: (mood: string) => void;
};

/** Best-effort play; never throws into the lesson flow. */
export function playAvatarGesture(
  avatar: GestureCapableAvatar | null | undefined,
  gesture: NormalizedAvatarGesture | null | undefined,
): void {
  if (!avatar || !gesture) return;
  try {
    if (gesture.mood && typeof avatar.setMood === "function") {
      avatar.setMood(gesture.mood);
    }
    if (
      typeof gesture.eyeContactMs === "number" &&
      typeof avatar.makeEyeContact === "function"
    ) {
      avatar.makeEyeContact(gesture.eyeContactMs);
    }
    if (TEACHING_GESTURE_NAME_SET.has(gesture.name)) {
      avatar.playTeachingGesture?.(gesture.name as TeachingGestureName, {
        dur: gesture.dur,
        mirror: gesture.mirror,
        blendMs: gesture.blendMs ?? gesture.ms,
      });
    } else if (typeof avatar.playGesture === "function") {
      avatar.playGesture(
        gesture.name,
        gesture.dur,
        gesture.mirror,
        gesture.ms,
      );
    }
  } catch (error) {
    console.warn("Avatar gesture failed:", error);
  }
}
