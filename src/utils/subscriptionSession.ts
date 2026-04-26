/** Client-side subscription record (demo / Paystack-style flow). Session-scoped. */
export const SUBSCRIPTION_STORAGE_KEY = "ryd-ai-subscription-v3";

export type PlanId = "monthly" | "annual";

export interface Subscription {
  planId: PlanId;
  planName: string;
  amountKobo: number;
  paystackReference: string;
  paidAt: string;
  renewsAt: string;
  paymentMethod: string;
  last4?: string;
}

export function loadSubscription(): Subscription | null {
  try {
    const raw = sessionStorage.getItem(SUBSCRIPTION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const planId = parsed.planId;

    if (planId === "quarterly") {
      const sub = parsed as unknown as Subscription;
      const migrated: Subscription = {
        ...sub,
        planId: "annual",
        planName: "Annual",
      };
      saveSubscription(migrated);
      return migrated;
    }

    if (planId !== "monthly" && planId !== "annual") {
      return null;
    }

    return parsed as unknown as Subscription;
  } catch {
    return null;
  }
}

export function saveSubscription(sub: Subscription): void {
  sessionStorage.setItem(SUBSCRIPTION_STORAGE_KEY, JSON.stringify(sub));
}
