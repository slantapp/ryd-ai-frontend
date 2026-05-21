import type {
  SubscriptionStatusItem,
  SubscriptionStatusResponse,
} from "@/api/subscription";

export function isSubscriptionPeriodActive(
  sub: Pick<SubscriptionStatusItem, "currentPeriodEnd">,
): boolean {
  const end = new Date(sub.currentPeriodEnd).getTime();
  return !Number.isNaN(end) && end > Date.now();
}

function byUpdatedDesc(
  a: Pick<SubscriptionStatusItem, "updatedAt">,
  b: Pick<SubscriptionStatusItem, "updatedAt">,
): number {
  return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
}

/** Best subscription row for UI when `data.subscribed` is true. */
export function getPrimarySubscription(
  data: SubscriptionStatusResponse | null | undefined,
): SubscriptionStatusItem | null {
  if (!data?.subscribed) return null;

  const list = data.subscriptions ?? [];
  if (list.length === 0) return null;

  const withAccess = list.filter(isSubscriptionPeriodActive);
  const pool = withAccess.length > 0 ? withAccess : list;

  const active = pool.find((s) => s.status?.toLowerCase() === "active");
  if (active) return active;

  return [...pool].sort(byUpdatedDesc)[0] ?? null;
}

export function getPrimaryPlanKey(
  data: SubscriptionStatusResponse | null | undefined,
): string | null {
  return getPrimarySubscription(data)?.planKey ?? null;
}

/** Active, auto-renewing, still inside the billing period. */
export function isFullyActiveSubscription(
  sub: SubscriptionStatusItem | null | undefined,
): boolean {
  if (!sub) return false;
  return (
    sub.status?.toLowerCase() === "active" &&
    !sub.cancelAtPeriodEnd &&
    isSubscriptionPeriodActive(sub)
  );
}

/**
 * User can call POST /subscription/resume: not fully active, still inside the paid
 * period, and renewal is off (scheduled cancel or already canceled in Stripe).
 */
export function canResumeSubscription(
  sub: SubscriptionStatusItem | null | undefined,
): boolean {
  if (!sub || !isSubscriptionPeriodActive(sub)) return false;
  if (isFullyActiveSubscription(sub)) return false;

  const status = sub.status?.toLowerCase();

  if (sub.cancelAtPeriodEnd) return true;
  if (status === "canceled") return true;

  return false;
}

/** Paid access remains but user must start a new checkout (not resume). */
export function hasCanceledAccessRemaining(
  sub: SubscriptionStatusItem | null | undefined,
): boolean {
  if (!sub || !isSubscriptionPeriodActive(sub)) return false;
  if (canResumeSubscription(sub)) return false;
  return false;
}

/** Only fully active subscriptions can be canceled or upgraded via API. */
export function canManageActiveSubscription(
  sub: SubscriptionStatusItem | null | undefined,
): boolean {
  if (!sub || !isSubscriptionPeriodActive(sub)) return false;
  return sub.status?.toLowerCase() === "active";
}

export function formatSubscriptionPeriodEnd(
  sub: Pick<SubscriptionStatusItem, "currentPeriodEnd"> | null | undefined,
): string | null {
  if (!sub?.currentPeriodEnd) return null;
  const dt = new Date(sub.currentPeriodEnd);
  if (Number.isNaN(dt.getTime())) return sub.currentPeriodEnd;
  return dt.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
