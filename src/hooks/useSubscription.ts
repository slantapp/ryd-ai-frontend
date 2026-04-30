import {
  createCheckoutSession,
  fetchSubscriptionHistory,
  fetchSubscriptionPlans,
  fetchSubscriptionStatus,
  type CheckoutRequest,
} from "@/api/subscription";
import { useMutation, useQuery } from "@tanstack/react-query";

export const subscriptionKeys = {
  root: ["subscription"] as const,
  plans: () => ["subscription", "plans"] as const,
  status: () => ["subscription", "status"] as const,
  history: () => ["subscription", "history"] as const,
};

export function useSubscriptionPlans() {
  return useQuery({
    queryKey: subscriptionKeys.plans(),
    queryFn: fetchSubscriptionPlans,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSubscriptionStatus() {
  return useQuery({
    queryKey: subscriptionKeys.status(),
    queryFn: fetchSubscriptionStatus,
    staleTime: 30 * 1000,
  });
}

export function useSubscriptionHistory() {
  return useQuery({
    queryKey: subscriptionKeys.history(),
    queryFn: fetchSubscriptionHistory,
    staleTime: 60 * 1000,
  });
}

export function useCreateCheckoutSession() {
  return useMutation({
    mutationFn: (payload: CheckoutRequest) => createCheckoutSession(payload),
  });
}

