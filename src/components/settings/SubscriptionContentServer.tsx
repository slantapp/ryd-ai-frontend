import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "react-toastify";
import { Check, Loader2, ShieldCheck, Zap } from "lucide-react";
import { PRIVATE_PATHS } from "@/utils/routePaths";
import type { SubscriptionPlan } from "@/api/subscription";
import {
  canManageActiveSubscription,
  canResumeSubscription,
  formatSubscriptionPeriodEnd,
  getPrimarySubscription,
  isFullyActiveSubscription,
} from "@/utils/subscriptionStatus";
import {
  useCancelSubscription,
  useCreateCheckoutSession,
  useResumeSubscription,
  useSubscriptionHistory,
  useSubscriptionPlans,
  useSubscriptionStatus,
  useUpgradeSubscription,
} from "@/hooks/useSubscription";

type SubscriptionContentServerProps = {
  /** When true, hides settings chrome and notifies parent after successful subscription. */
  gateMode?: boolean;
  onSubscriptionComplete?: () => void;
};

function getAxiosishErrorMessage(err: unknown): string | null {
  if (!err || typeof err !== "object") return null;
  const e = err as {
    response?: { data?: { message?: string } };
    message?: string;
  };
  return e.response?.data?.message || e.message || null;
}

type PlanUiMeta = {
  /** Fallback when API doesn't provide. */
  nameFallback: string;
  taglineFallback: string;
  periodSuffixFallback: string;
  accent: string;
  borderAccent: string;
  icon: typeof Zap;
  popular?: boolean;
};

function SubscriptionPlansSkeleton({ gateMode }: { gateMode: boolean }) {
  const bar = "animate-pulse rounded-md bg-gray-900/8";
  return (
    <div
      className={cn(
        "grid gap-3 sm:gap-4",
        gateMode ? "grid-cols-1 md:grid-cols-2" : "md:grid-cols-2",
      )}
      aria-busy="true"
      aria-label="Loading subscription plans"
    >
      {[0, 1].map((i) => (
        <Card
          key={i}
          className="relative min-w-0 overflow-hidden rounded-2xl border-0 shadow-none"
        >
          <CardContent
            className={cn(
              "flex h-full min-w-0 flex-col bg-linear-to-br from-[#EDE9FE]/90 via-[#F5F3FF]/80 to-[#FAF5FF]/90",
              gateMode ? "p-4 sm:p-5" : "p-5 sm:p-6",
            )}
          >
            {i === 1 && (
              <div
                className={cn(
                  "absolute z-10",
                  gateMode ? "right-3 top-3" : "right-4 top-4",
                )}
              >
                <span className="inline-block h-5 w-18 animate-pulse rounded bg-white/50" />
              </div>
            )}

            <div className="mb-3 flex size-10 shrink-0 animate-pulse rounded-xl bg-white/70 shadow-sm ring-1 ring-white/50 sm:mb-4 sm:size-11" />

            <div className={cn("h-5 w-[55%] max-w-[180px]", bar)} />
            <div className="mt-2 h-3.5 w-[85%] max-w-[220px] animate-pulse rounded-md bg-gray-900/6" />

            <div className="mt-4 flex flex-wrap items-baseline gap-2 sm:mt-5">
              <div
                className={cn(
                  "h-9 w-28 sm:h-10",
                  bar,
                )}
              />
              <div className="h-4 w-14 animate-pulse rounded-md bg-gray-900/6" />
            </div>

            <ul className="mt-4 flex-1 space-y-2.5 sm:mt-5">
              {[0, 1, 2, 3].map((row) => (
                <li key={row} className="flex gap-2">
                  <span className="mt-0.5 size-4 shrink-0 animate-pulse rounded-full bg-primary/15" />
                  <span
                    className={cn(
                      "h-4 flex-1",
                      bar,
                      row === 3 && "max-w-[70%]",
                    )}
                  />
                </li>
              ))}
            </ul>

            <div
              className={cn(
                "mt-5 h-11 w-full animate-pulse rounded-xl bg-gray-900/10 sm:mt-6",
                gateMode && "sm:mt-5",
              )}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

const PLAN_UI_META: Record<string, PlanUiMeta> = {
  monthly: {
    nameFallback: "Monthly",
    taglineFallback: "Flexible — renew every month",
    periodSuffixFallback: "/ month",
    accent: "from-[#E8E0FF] to-[#F3ECFE]",
    borderAccent: "border-transparent",
    icon: Zap,
  },
  annual: {
    nameFallback: "Annual",
    taglineFallback: "Best value — pay once per year",
    periodSuffixFallback: "/ year",
    accent: "from-[#FCE7F3] to-[#F3ECFE]",
    borderAccent: "ring-2 ring-[#0063F7]/35",
    icon: ShieldCheck,
    popular: true,
  },
};

type PlanButtonAction = "subscribe" | "upgrade" | "resume" | "none";

type PlanButtonConfig = {
  label: string;
  helperText?: string;
  disabled: boolean;
  action: PlanButtonAction;
  isLoading: boolean;
};

function getPlanButtonConfig(
  plan: SubscriptionPlan,
  opts: {
    subscribed: boolean;
    isCurrent: boolean;
    canUpgrade: boolean;
    resumeEligible: boolean;
    isFullyActive: boolean;
    accessEndsLabel: string | null;
    checkoutPending: boolean;
    upgradePending: boolean;
    upgradeResuming: boolean;
    needsResumeBeforeUpgrade: boolean;
    resumePending: boolean;
  },
): PlanButtonConfig {
  const planName = plan.name || plan.key;
  const {
    subscribed,
    isCurrent,
    canUpgrade,
    resumeEligible,
    isFullyActive,
    accessEndsLabel,
    checkoutPending,
    upgradePending,
    upgradeResuming,
    needsResumeBeforeUpgrade,
    resumePending,
  } = opts;

  if (isCurrent && resumeEligible) {
    return {
      label: resumePending ? "Continuing…" : "Continue subscription",
      helperText: accessEndsLabel
        ? `Turn auto-renewal back on — you have access until ${accessEndsLabel}`
        : "Turn auto-renewal back on before your current period ends",
      disabled: resumePending,
      action: "resume",
      isLoading: resumePending,
    };
  }

  if (isCurrent && isFullyActive) {
    return {
      label: "Your plan",
      helperText: "You're subscribed and auto-renewal is on",
      disabled: true,
      action: "none",
      isLoading: false,
    };
  }

  if (!isCurrent && subscribed && canUpgrade) {
    const upgradeLabel = upgradePending
      ? upgradeResuming
        ? "Continuing…"
        : "Upgrading…"
      : `Upgrade to ${planName}`;
    return {
      label: upgradeLabel,
      helperText: needsResumeBeforeUpgrade
        ? "We'll turn auto-renewal back on, then move you to annual billing"
        : "Move to a longer billing cycle on your account",
      disabled: upgradePending,
      action: "upgrade",
      isLoading: upgradePending,
    };
  }

  if (!subscribed) {
    return {
      label: checkoutPending ? "Redirecting…" : "Subscribe",
      disabled: checkoutPending,
      action: "subscribe",
      isLoading: checkoutPending,
    };
  }

  if (!isCurrent && subscribed) {
    return {
      label: "Not available",
      helperText: "Shorter plans are not available while you have a subscription",
      disabled: true,
      action: "none",
      isLoading: false,
    };
  }

  return {
    label: "Your plan",
    helperText: accessEndsLabel
      ? `Access until ${accessEndsLabel}`
      : "Manage your subscription above",
    disabled: true,
    action: "none",
    isLoading: false,
  };
}

export default function SubscriptionContentServer({
  gateMode = false,
  onSubscriptionComplete,
}: SubscriptionContentServerProps) {
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelledAccessEndsAt, setCancelledAccessEndsAt] = useState<string | null>(
    null,
  );
  const [cancelJustRequested, setCancelJustRequested] = useState(false);
  const [upgradeFlowPlanKey, setUpgradeFlowPlanKey] = useState<string | null>(
    null,
  );
  const plansQuery = useSubscriptionPlans();
  const statusQuery = useSubscriptionStatus();
  const historyQuery = useSubscriptionHistory();
  const checkoutMutation = useCreateCheckoutSession();
  const cancelMutation = useCancelSubscription();
  const resumeMutation = useResumeSubscription();
  const upgradeMutation = useUpgradeSubscription();

  const statusData = statusQuery.data?.data;
  const subscribed = statusData?.subscribed === true;

  const primarySubscription = useMemo(
    () => getPrimarySubscription(statusData),
    [statusData],
  );

  const primaryPlanKey = primarySubscription?.planKey ?? null;

  const resumeEligible = useMemo(
    () => canResumeSubscription(primarySubscription),
    [primarySubscription],
  );

  const isFullyActive = useMemo(
    () => isFullyActiveSubscription(primarySubscription),
    [primarySubscription],
  );

  const accessEndsLabel = useMemo(
    () => formatSubscriptionPeriodEnd(primarySubscription),
    [primarySubscription],
  );

  const canCancel = useMemo(
    () => canManageActiveSubscription(primarySubscription),
    [primarySubscription],
  );

  const plans = useMemo(() => {
    const data = plansQuery.data?.data;
    const out: SubscriptionPlan[] = [];
    if (data?.monthly) out.push(data.monthly);
    if (data?.annual) out.push(data.annual);
    for (const p of data?.other ?? []) out.push(p);
    return out;
  }, [plansQuery.data?.data]);

  const currentPlan = useMemo(
    () => plans.find((p) => p.key === primaryPlanKey) ?? null,
    [plans, primaryPlanKey],
  );

  const isLongerPlan = useCallback(
    (target: SubscriptionPlan) => {
      if (!subscribed || !currentPlan || target.key === primaryPlanKey) {
        return false;
      }
      return target.durationMonths > currentPlan.durationMonths;
    },
    [subscribed, currentPlan, primaryPlanKey],
  );

  useEffect(() => {
    if (gateMode && subscribed) {
      onSubscriptionComplete?.();
    }
  }, [gateMode, onSubscriptionComplete, subscribed]);

  const confirmCancelSubscription = useCallback(() => {
    if (!canCancel) return;
    cancelMutation.mutate(
      {
        immediate: true,
      },
      {
        onSuccess: (envelope) => {
          // We intentionally compute access end time from subscription status/history
          // (cancelAtPeriodEnd + currentPeriodEnd), not from the cancel endpoint payload.
          setCancelJustRequested(true);
          toast.success(envelope.message?.trim() || "Subscription cancelled.");
          setCancelDialogOpen(false);
        },
        onError: (err: unknown) => {
          toast.error(
            getAxiosishErrorMessage(err) || "Could not update subscription.",
          );
        },
      },
    );
  }, [canCancel, cancelMutation]);

  useEffect(() => {
    if (!cancelJustRequested) return;

    // Prefer latest history item because it includes cancelAtPeriodEnd + currentPeriodEnd.
    const items = historyQuery.data?.data ?? [];
    const latest = [...items].sort((a, b) => {
      const aTime = new Date(a.updatedAt).getTime();
      const bTime = new Date(b.updatedAt).getTime();
      return bTime - aTime;
    })[0];

    if (latest) {
      const endsAt = latest.cancelAtPeriodEnd
        ? latest.currentPeriodEnd
        : new Date().toISOString();
      setCancelledAccessEndsAt(endsAt);
      setCancelJustRequested(false);
      return;
    }

    // Fallback: if status is already updated and there is no history yet, end now.
    if (statusQuery.data?.data) {
      setCancelledAccessEndsAt(new Date().toISOString());
      setCancelJustRequested(false);
    }
  }, [cancelJustRequested, historyQuery.data?.data, statusQuery.data?.data]);

  const formattedAccessEndsAt = useMemo(() => {
    if (!cancelledAccessEndsAt) return null;
    const dt = new Date(cancelledAccessEndsAt);
    if (Number.isNaN(dt.getTime())) return cancelledAccessEndsAt;
    return dt.toLocaleString();
  }, [cancelledAccessEndsAt]);

  const confirmResumeSubscription = useCallback(() => {
    resumeMutation.mutate(undefined, {
      onSuccess: (envelope) => {
        setCancelledAccessEndsAt(null);
        setCancelJustRequested(false);
        toast.success(
          envelope.message?.trim() || "Subscription resumed. Auto-renewal is on.",
        );
      },
      onError: (err: unknown) => {
        toast.error(
          getAxiosishErrorMessage(err) || "Could not resume subscription.",
        );
      },
    });
  }, [resumeMutation]);

  const startCheckout = useCallback(
    async (planKey: string) => {
      const origin = window.location.origin;
      // const httpsOrigin = origin.replace(/^http:/, "https:");
      const successUrl = `${origin}${PRIVATE_PATHS.DASHBOARD}?subscription=success&session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${origin}${PRIVATE_PATHS.DASHBOARD}?subscription=cancelled`;


      try {
        const res = await checkoutMutation.mutateAsync({
          planKey,
          successUrl,
          cancelUrl,
        });
        const url = res.data?.checkoutUrl ?? res.data?.url;
        if (!res.status || !url) {
          throw new Error(res.message || "Failed to create checkout session");
        }
        window.location.assign(url);
      } catch (err: unknown) {
        toast.error(getAxiosishErrorMessage(err) || "Checkout failed");
      }
    },
    [checkoutMutation],
  );

  const performUpgrade = useCallback(
    async (plan: SubscriptionPlan) => {
      setUpgradeFlowPlanKey(plan.key);
      try {
        if (resumeEligible) {
          const resumeEnvelope = await resumeMutation.mutateAsync();
          if (!resumeEnvelope.status) {
            throw new Error(
              resumeEnvelope.message?.trim() ||
                "Could not resume subscription.",
            );
          }
          setCancelledAccessEndsAt(null);
          setCancelJustRequested(false);
        }

        const upgradeEnvelope = await upgradeMutation.mutateAsync({
          planKey: plan.key,
        });
        if (!upgradeEnvelope.status) {
          throw new Error(
            upgradeEnvelope.message?.trim() ||
              "Could not upgrade subscription.",
          );
        }

        toast.success(
          upgradeEnvelope.message?.trim() ||
            `Upgraded to ${plan.name || plan.key}.`,
        );
      } catch (err: unknown) {
        toast.error(
          getAxiosishErrorMessage(err) || "Could not upgrade subscription.",
        );
      } finally {
        setUpgradeFlowPlanKey(null);
      }
    },
    [resumeEligible, resumeMutation, upgradeMutation],
  );

  const handlePlanAction = useCallback(
    (plan: SubscriptionPlan, action: PlanButtonAction) => {
      if (action === "none") return;

      if (action === "resume") {
        confirmResumeSubscription();
        return;
      }

      if (action === "upgrade") {
        void performUpgrade(plan);
        return;
      }

      void startCheckout(plan.key);
    },
    [confirmResumeSubscription, performUpgrade, startCheckout],
  );

  return (
    <div className={cn("space-y-4 sm:space-y-6", gateMode && "sm:space-y-5")}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h2 className="font-solway text-2xl font-bold text-gray-900">
            {gateMode ? "Choose a plan to continue" : "Subscription"}
          </h2>
          <p className="font-inter text-sm text-gray-600">
            {gateMode
              ? "Complete your subscription to unlock the dashboard."
              : "Your access is determined by your server subscription status."}
          </p>
        </div>

        {!gateMode && (
          <div className="flex items-center gap-2">
            {statusQuery.isLoading ? (
              <Badge className="bg-slate-100 text-slate-800 ring-1 ring-slate-200 hover:bg-slate-100">
                Checking…
              </Badge>
            ) : subscribed ? (
              <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                Subscribed
              </Badge>
            ) : (
              <Badge className="bg-amber-100 text-amber-900 ring-1 ring-amber-200 hover:bg-amber-100">
                Not subscribed
              </Badge>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void statusQuery.refetch()}
              disabled={statusQuery.isFetching}
            >
              {statusQuery.isFetching ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Refreshing…
                </>
              ) : (
                "Refresh"
              )}
            </Button>
          </div>
        )}
      </div>

      {!gateMode && (
        <Card className="rounded-2xl border-none shadow-none">
          <CardContent className="rounded-[20px] bg-[#F8F8FA] p-5 sm:p-6">
            <p className="font-inter text-xs font-semibold uppercase tracking-wide text-gray-500">
              Current plan
            </p>
            <p className="mt-1 font-solway text-xl font-bold text-gray-900">
              {subscribed
                ? primaryPlanKey ?? "Subscribed"
                : "No active plan"}
            </p>
            {primarySubscription && (
              <p className="mt-1 font-inter text-sm text-gray-600">
                Status:{" "}
                <span className="font-medium capitalize text-gray-800">
                  {primarySubscription.status.replace(/_/g, " ")}
                </span>
                {primarySubscription.cancelAtPeriodEnd
                  ? " · Cancels at period end"
                  : null}
              </p>
            )}
            {accessEndsLabel && subscribed && (
              <p className="mt-1 font-inter text-sm text-gray-600">
                {resumeEligible ? "Access until" : "Renews / ends"}:{" "}
                <span className="font-medium text-gray-800">{accessEndsLabel}</span>
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {!gateMode && resumeEligible && (
        <Card className="rounded-2xl border border-primary/25 bg-[#F3ECFE]/40 shadow-none">
          <CardContent className="space-y-3 p-5 sm:p-6">
            <div>
              <p className="font-inter text-xs font-semibold uppercase tracking-wide text-gray-500">
                Manage subscription
              </p>
              <h3 className="mt-1 font-solway text-lg font-bold text-gray-900">
                Resume subscription
              </h3>
              <p className="mt-1 font-inter text-sm text-gray-600">
                You cancelled auto-renewal but still have access until{" "}
                {accessEndsLabel ? (
                  <span className="font-semibold text-gray-800">
                    {accessEndsLabel}
                  </span>
                ) : (
                  "the end of your billing period"
                )}
                . Resume to keep your plan renewing automatically.
              </p>
            </div>
            <Button
              type="button"
              className="w-full rounded-xl bg-primary font-solway font-semibold hover:bg-primary/90 sm:w-auto"
              disabled={resumeMutation.isPending}
              onClick={confirmResumeSubscription}
            >
              {resumeMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Resuming…
                </>
              ) : (
                "Resume auto-renewal"
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {!gateMode && canCancel && !resumeEligible && (
        <Card className="rounded-2xl border border-gray-200/80 shadow-none">
          <CardContent className="space-y-3 p-5 sm:p-6">
            <div>
              <p className="font-inter text-xs font-semibold uppercase tracking-wide text-gray-500">
                Manage subscription
              </p>
              <h3 className="mt-1 font-solway text-lg font-bold text-gray-900">
                Cancel subscription
              </h3>
              <p className="mt-1 font-inter text-sm text-gray-600">
                Cancelling will stop your access immediately.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button
                type="button"
                variant="outline"
                className="w-full rounded-xl border-red-200 bg-red-50/80 font-inter text-red-800 hover:bg-red-100/90 sm:w-auto"
                disabled={cancelMutation.isPending}
                onClick={() => setCancelDialogOpen(true)}
              >
                Cancel Subscription
              </Button>
            </div>
            {formattedAccessEndsAt && (
              <div className="rounded-xl bg-amber-50 p-4 font-inter text-sm text-amber-950 ring-1 ring-amber-200">
                <p className="font-semibold">Subscription cancelled</p>
                <p className="mt-1">
                  Access ends: <span className="font-semibold">{formattedAccessEndsAt}</span>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog
        open={cancelDialogOpen}
        onOpenChange={(open) => {
          setCancelDialogOpen(open);
        }}
      >
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-solway text-lg">
              Cancel subscription?
            </DialogTitle>
            <DialogDescription className="font-inter text-base text-gray-600">
              Your access will end right away and you won&apos;t be charged again.
              If you need help, contact support.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl font-inter"
              disabled={cancelMutation.isPending}
              onClick={() => setCancelDialogOpen(false)}
            >
              Keep subscription
            </Button>
            <Button
              type="button"
              className={cn(
                "rounded-xl font-solway",
                "bg-red-600 text-white hover:bg-red-700",
              )}
              disabled={cancelMutation.isPending}
              onClick={confirmCancelSubscription}
            >
              {cancelMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Working…
                </>
              ) : (
                "Cancel now"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {plansQuery.isLoading ? (
        <SubscriptionPlansSkeleton gateMode={gateMode} />
      ) : (
        <div
          className={cn(
            "grid gap-3 sm:gap-4",
            gateMode ? "grid-cols-1 md:grid-cols-2" : "md:grid-cols-2"
          )}
        >
          {plans.length === 0 && (
            <Card className="rounded-2xl">
              <CardContent className="p-5">
                <p className="font-inter text-sm text-gray-600">
                  No plans available.
                </p>
              </CardContent>
            </Card>
          )}

          {plans.length > 0 &&
            plans.map((p) => {
              const isCurrent = primaryPlanKey === p.key;
              const canUpgrade = isLongerPlan(p);
              const upgradeFlowActive = upgradeFlowPlanKey === p.key;
              const upgradePending =
                upgradeFlowActive &&
                (resumeMutation.isPending || upgradeMutation.isPending);
              const upgradeResuming =
                upgradeFlowActive &&
                resumeMutation.isPending &&
                !upgradeMutation.isPending;
              const planButton = getPlanButtonConfig(p, {
                subscribed,
                isCurrent,
                canUpgrade,
                resumeEligible: isCurrent && resumeEligible,
                isFullyActive: isCurrent && isFullyActive,
                accessEndsLabel,
                checkoutPending: checkoutMutation.isPending,
                upgradePending,
                upgradeResuming,
                needsResumeBeforeUpgrade: canUpgrade && resumeEligible,
                resumePending:
                  (resumeMutation.isPending &&
                    isCurrent &&
                    resumeEligible &&
                    !upgradeFlowActive) ||
                  upgradeResuming,
              });
              const blockOtherActionsWhileBusy =
                (checkoutMutation.isPending ||
                  upgradeFlowPlanKey !== null ||
                  resumeMutation.isPending ||
                  upgradeMutation.isPending) &&
                !planButton.isLoading;
              const meta = PLAN_UI_META[p.key] ?? {
                nameFallback: p.name,
                taglineFallback: "",
                periodSuffixFallback: "",
                accent: "from-[#E8E0FF] to-[#F3ECFE]",
                borderAccent: "border-transparent",
                icon: Zap,
              };
              const Icon = meta.icon;
              const features = (p.features ?? []).slice(0, gateMode ? 6 : 8);
              return (
                <Card
                  key={p.key}
                  className={cn(
                    "relative min-w-0 overflow-hidden rounded-2xl border-0 shadow-none transition hover:shadow-md",
                    meta.borderAccent,
                    meta.popular && !gateMode && "lg:scale-[1.02] lg:shadow-lg"
                  )}
                >
                  {meta.popular && (
                    <div
                      className={cn(
                        "absolute z-10",
                        gateMode ? "right-3 top-3" : "right-4 top-4"
                      )}
                    >
                      <Badge className="bg-[#0063F7] font-inter text-[10px] font-semibold uppercase tracking-wider text-white hover:bg-[#0063F7]">
                        Most popular
                      </Badge>
                    </div>
                  )}

                  <CardContent
                    className={cn(
                      "flex h-full min-w-0 flex-col",
                      gateMode ? "p-4 sm:p-5" : "p-5 sm:p-6",
                      `bg-linear-to-br ${meta.accent}`
                    )}
                  >
                    <div
                      className={cn(
                        "mb-3 flex size-10 items-center justify-center rounded-xl bg-white/90 shadow-sm ring-1 ring-white/60 sm:mb-4 sm:size-11"
                      )}
                    >
                      <Icon className="size-4 text-primary sm:size-5" aria-hidden />
                    </div>

                    <h3 className="font-solway text-base font-bold text-gray-900 sm:text-lg">
                      {p.name || meta.nameFallback}
                    </h3>
                    {(meta.taglineFallback || p.durationMonths) && (
                      <p
                        className={cn(
                          "mt-1 font-inter text-gray-600",
                          gateMode ? "text-xs leading-snug sm:text-sm" : "text-sm"
                        )}
                      >
                        {meta.taglineFallback ||
                          (p.durationMonths
                            ? `${p.durationMonths} month${p.durationMonths === 1 ? "" : "s"} access`
                            : "")}
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap items-baseline gap-x-1 gap-y-0.5 sm:mt-4">
                      <span
                        className={cn(
                          "font-solway font-bold tracking-tight text-gray-900",
                          gateMode ? "text-2xl sm:text-3xl" : "text-3xl"
                        )}
                      >
                        {p.priceLabel}
                      </span>
                      {meta.periodSuffixFallback && (
                        <span
                          className={cn(
                            "font-inter text-gray-600",
                            gateMode ? "text-xs sm:text-sm" : "text-sm"
                          )}
                        >
                          {meta.periodSuffixFallback}
                        </span>
                      )}
                    </div>

                    {features.length > 0 && (
                      <ul
                        className={cn(
                          "flex-1",
                          gateMode ? "mt-4 space-y-2" : "mt-5 space-y-2.5"
                        )}
                      >
                        {features.map((f) => (
                          <li
                            key={f}
                            className={cn(
                              "flex gap-2 font-inter text-gray-700",
                              gateMode
                                ? "text-xs leading-relaxed sm:text-sm"
                                : "text-sm"
                            )}
                          >
                            <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                            <span className="min-w-0">{f}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    <Button
                      type="button"
                      onClick={() =>
                        handlePlanAction(p, planButton.action)
                      }
                      className={cn(
                        "h-11 w-full rounded-xl font-solway font-semibold shadow-sm",
                        gateMode ? "mt-4 sm:mt-5" : "mt-6",
                        planButton.disabled && planButton.action === "none"
                          ? "bg-gray-200 text-gray-600 hover:bg-gray-200"
                          : meta.popular
                            ? "bg-[#0063F7] hover:bg-[#0056d9]"
                            : "bg-primary hover:bg-primary/90",
                      )}
                      disabled={
                        planButton.disabled || blockOtherActionsWhileBusy
                      }
                    >
                      {planButton.isLoading ? (
                        <>
                          <Loader2 className="mr-2 size-4 animate-spin" />
                          {planButton.label}
                        </>
                      ) : (
                        planButton.label
                      )}
                    </Button>

                    {planButton.helperText && (
                      <p className="mt-2 text-center font-inter text-xs text-gray-600">
                        {planButton.helperText}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
        </div>
      )}
    </div>
  );
}

