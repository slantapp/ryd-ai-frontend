import type { AuthUser } from "@/stores/authStore";

/** Values returned by the API on `user.userType` (normalized to uppercase for checks). */
export const USER_TYPES = {
  NORMAL_PARENT: "NORMAL_PARENT",
  ADMIN: "ADMIN",
  TEACHER: "TEACHER",
} as const;

export type KnownUserType = (typeof USER_TYPES)[keyof typeof USER_TYPES];

/** Roles allowed to use curriculum preview / authoring flows in the app shell. */
export const CURRICULUM_PREVIEW_USER_TYPES = [
  USER_TYPES.ADMIN,
  USER_TYPES.TEACHER,
] as const;

export function normalizeUserType(raw: unknown): string | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  return s ? s.toUpperCase() : null;
}

/**
 * Returns true if `userTypeRaw` matches one of `allowed` (case-insensitive).
 */
export function userTypeMatchesAny(
  userTypeRaw: unknown,
  allowed: readonly string[],
): boolean {
  const normalized = normalizeUserType(userTypeRaw);
  if (!normalized) return false;
  const set = new Set(allowed.map((a) => a.toUpperCase()));
  return set.has(normalized);
}

/**
 * Reusable check for route guards, nav filtering, feature flags, etc.
 */
export function userHasAllowedType(
  user: Pick<AuthUser, "userType"> | null | undefined,
  allowed: readonly string[],
): boolean {
  return userTypeMatchesAny(user?.userType, allowed);
}
