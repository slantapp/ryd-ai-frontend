import axiosInstance from "@/lib/axios";

export type ApiEnvelope<T> = {
  status: boolean;
  message: string;
  data: T;
};

export type SubscriptionPlan = {
  id: number;
  key: string; // "monthly" | "annual" | ...
  name: string;
  tagline?: string;
  durationLabel?: string;
  durationMonths: number;
  periodSuffix?: string;
  /** Tailwind gradient classes from API, e.g. "from-[#E8E0FF] to-[#F3ECFE]" */
  accent?: string;
  borderAccent?: string;
  /** Lucide icon name from API, e.g. "Zap" | "ShieldCheck" */
  icon?: string;
  popular?: boolean;
  features?: string[];
  billingCurrency: string;
  priceLabel: string;
  /** USD list / charge amount from plans API. */
  amountUsd?: number;
  amountNgn?: number;
  /** Show the comparison price crossed out beside the current price. */
  showSlashPrice?: boolean;
  compareAtPriceLabel?: string | null;
  compareAtAmount?: number | null;
  /** Whether a referral discount is applied to this plan. */
  referralDiscountApplied?: boolean;
  referralCode?: string | null;
  referralDiscountType?: "percentage" | "fixed" | string;
  referralDiscountValue?: number;
  originalPriceLabel?: string;
  discountAmount?: number;
  discountedAmount?: number;
  discountLabel?: string;
  discountedPriceLabel?: string;
};

export type PlansResponse = {
  monthly?: SubscriptionPlan;
  annual?: SubscriptionPlan;
  other?: SubscriptionPlan[];
};

export type ApplyReferralCodeRequest = {
  referralCode: string;
};

export async function applyReferralCode(payload: ApplyReferralCodeRequest) {
  const res = await axiosInstance.post<ApiEnvelope<unknown>>(
    "/parent/referral/code",
    payload,
  );
  if (!res.data.status) {
    throw new Error(res.data.message || "Could not apply referral code.");
  }
  return res.data;
}

export type CheckoutRequest = {
  planKey: string;
  successUrl: string;
  cancelUrl: string;
  country?: string;
};

export type CheckoutResponse = {
  url?: string;
  checkoutUrl?: string;
  sessionId?: string;
};

export type SubscriptionStatusItem = {
  id: number;
  parentId: number;
  status: string; // "active" | "canceled" | ...
  stripeSubscriptionId: string | null;
  stripeCustomerId: string | null;
  planKey: string;
  subscriptionPlanId: number | null;
  billingCurrency: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type SubscriptionStatusResponse = {
  subscribed: boolean;
  subscriptions: SubscriptionStatusItem[];
};

export type SubscriptionHistoryItem = {
  id: number;
  status: string;
  planKey: string;
  billingCurrency: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  updatedAt: string;
  plan?: {
    key: string;
    name: string;
    priceLabel: string;
    billingCurrency: string;
    amountNgn?: number;
  };
};

export async function fetchSubscriptionPlans() {
  const res = await axiosInstance.get<ApiEnvelope<PlansResponse>>(
    "/parent/subscription/plans",
  );
  return res.data;
}

export async function createCheckoutSession(payload: CheckoutRequest) {
  const res = await axiosInstance.post<ApiEnvelope<CheckoutResponse>>(
    "/parent/subscription/checkout",
    payload,
  );
  return res.data;
}

export async function fetchSubscriptionStatus() {
  const res = await axiosInstance.get<ApiEnvelope<SubscriptionStatusResponse>>(
    "/parent/subscription/status",
  );
  return res.data;
}

export async function fetchSubscriptionHistory() {
  const res = await axiosInstance.get<ApiEnvelope<SubscriptionHistoryItem[]>>(
    "/parent/subscription/history",
  );
  return res.data;
}

/** `{ immediate: false }` = cancel at period end; `{ immediate: true }` = cancel now. */
export async function cancelSubscription(options: { immediate: boolean }) {
  const res = await axiosInstance.post<ApiEnvelope<unknown>>(
    "/parent/subscription/cancel",
    { immediate: options.immediate },
  );
  return res.data;
}

/** Undo cancel-at-period-end while paid access remains. */
export async function resumeSubscription() {
  const res = await axiosInstance.post<ApiEnvelope<SubscriptionStatusResponse>>(
    "/parent/subscription/resume",
  );
  return res.data;
}

export type UpgradeSubscriptionRequest = {
  planKey: string;
};

/** Active subscription — move to a longer plan (e.g. monthly → annual). */
export async function upgradeSubscription(payload: UpgradeSubscriptionRequest) {
  const res = await axiosInstance.post<ApiEnvelope<SubscriptionStatusResponse>>(
    "/parent/subscription/upgrade",
    payload,
  );
  return res.data;
}
