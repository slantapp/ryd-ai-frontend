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
  showOriginalPrice: boolean;
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
  const compareAtPrice =
    plan.compareAtPriceLabel?.trim() ||
    (plan.compareAtAmount != null
      ? formatPlanMoney(plan.compareAtAmount, plan.billingCurrency || "USD")
      : "");
  const referralOriginalPrice =
    plan.originalPriceLabel?.trim() || plan.priceLabel.trim();
  const originalPrice =
    plan.showSlashPrice === true && compareAtPrice
      ? compareAtPrice
      : referralOriginalPrice;
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
  // Slash / compare-at savings when no referral save label yet
  if (
    !saveLabel &&
    plan.showSlashPrice === true &&
    plan.compareAtAmount != null
  ) {
    const saleAmount =
      plan.discountedAmount ??
      (typeof plan.amountUsd === "number" ? plan.amountUsd : null);
    if (saleAmount != null && plan.compareAtAmount > saleAmount) {
      saveLabel = formatPlanMoney(
        plan.compareAtAmount - saleAmount,
        plan.billingCurrency || "USD",
      );
    }
  }

  return {
    referralDiscountApplied,
    displayPrice,
    originalPrice,
    showOriginalPrice:
      (plan.showSlashPrice === true && Boolean(compareAtPrice)) ||
      referralDiscountApplied,
    saveLabel,
    referralCode: plan.referralCode?.trim() || null,
  };
}
