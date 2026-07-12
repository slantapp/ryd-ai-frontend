import type { SubscriptionPlan } from "@/api/subscription";

export function formatPlanMoney(
  amount: number,
  billingCurrency = "USD",
): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: billingCurrency || "USD",
    }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

export type PlanDisplayPricing = {
  referralDiscountApplied: boolean;
  displayPrice: string;
  originalPrice: string;
  saveLabel: string | null;
  referralCode: string | null;
};

/**
 * Pricing shown on plan cards. When `referralDiscountApplied` is true,
 * prefer discounted labels and surface savings from `discountAmount`.
 */
export function getPlanDisplayPricing(
  plan: SubscriptionPlan,
): PlanDisplayPricing {
  const referralDiscountApplied = plan.referralDiscountApplied === true;
  const originalPrice =
    plan.originalPriceLabel?.trim() || plan.priceLabel.trim();
  const discountedLabel =
    plan.discountedPriceLabel?.trim() ||
    (plan.discountedAmount != null
      ? formatPlanMoney(plan.discountedAmount, plan.billingCurrency || "USD")
      : "") ||
    plan.priceLabel.trim();

  const displayPrice = referralDiscountApplied
    ? discountedLabel
    : plan.priceLabel.trim();

  let saveLabel: string | null = plan.discountLabel?.trim() || null;
  if (!saveLabel && referralDiscountApplied && (plan.discountAmount ?? 0) > 0) {
    saveLabel = formatPlanMoney(
      plan.discountAmount!,
      plan.billingCurrency || "USD",
    );
  }
  if (
    !saveLabel &&
    referralDiscountApplied &&
    plan.referralDiscountType === "percentage" &&
    plan.referralDiscountValue != null
  ) {
    saveLabel = `${plan.referralDiscountValue}%`;
  }

  return {
    referralDiscountApplied,
    displayPrice,
    originalPrice,
    saveLabel,
    referralCode: plan.referralCode?.trim() || null,
  };
}
