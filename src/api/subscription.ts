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
  durationMonths: number;
  billingCurrency: string;
  priceLabel: string;
  amountNgn?: number;
  features?: string[];
};

export type PlansResponse = {
  monthly?: SubscriptionPlan;
  annual?: SubscriptionPlan;
  other?: SubscriptionPlan[];
};

export type CheckoutRequest = {
  planKey: string;
  successUrl: string;
  cancelUrl: string;
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
  planKey: string;
  currentPeriodEnd: string;
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
    "/parent/subscription/plans"
  );
  return res.data;
}

export async function createCheckoutSession(payload: CheckoutRequest) {
  const res = await axiosInstance.post<ApiEnvelope<CheckoutResponse>>(
    "/parent/subscription/checkout",
    payload
  );
  return res.data;
}

export async function fetchSubscriptionStatus() {
  const res = await axiosInstance.get<ApiEnvelope<SubscriptionStatusResponse>>(
    "/parent/subscription/status"
  );
  return res.data;
}

export async function fetchSubscriptionHistory() {
  const res = await axiosInstance.get<ApiEnvelope<SubscriptionHistoryItem[]>>(
    "/parent/subscription/history"
  );
  return res.data;
}

