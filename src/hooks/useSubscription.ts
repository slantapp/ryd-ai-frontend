import {
  applyReferralCode,
  cancelSubscription,
  confirmAlatOneTimeCheckout,
  createCheckoutSession,
  fetchSubscriptionHistory,
  fetchSubscriptionPlans,
  fetchSubscriptionStatus,
  initAlatOneTimeCheckout,
  resumeSubscription,
  upgradeSubscription,
  type CheckoutRequest,
  type ApplyReferralCodeRequest,
  type AlatOneTimeInitRequest,
  type AlatOneTimeConfirmRequest,
  type UpgradeSubscriptionRequest,
} from "@/api/subscription";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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

export function useApplyReferralCode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ApplyReferralCodeRequest) =>
      applyReferralCode(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: subscriptionKeys.plans(),
      });
    },
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

export function useInitAlatOneTimeCheckout() {
  return useMutation({
    mutationFn: (payload: AlatOneTimeInitRequest) => initAlatOneTimeCheckout(payload),
  });
}

export function useConfirmAlatOneTimeCheckout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AlatOneTimeConfirmRequest) =>
      confirmAlatOneTimeCheckout(payload),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: subscriptionKeys.status() });
      void queryClient.invalidateQueries({ queryKey: subscriptionKeys.history() });
    },
  });
}

export function useCancelSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => cancelSubscription({ immediate: false }),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: subscriptionKeys.status() });
      void queryClient.invalidateQueries({ queryKey: subscriptionKeys.history() });
    },
  });
}

export function useResumeSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => resumeSubscription(),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: subscriptionKeys.status() });
      void queryClient.invalidateQueries({ queryKey: subscriptionKeys.history() });
    },
  });
}

export function useUpgradeSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpgradeSubscriptionRequest) =>
      upgradeSubscription(payload),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: subscriptionKeys.status() });
      void queryClient.invalidateQueries({ queryKey: subscriptionKeys.history() });
    },
  });
}

