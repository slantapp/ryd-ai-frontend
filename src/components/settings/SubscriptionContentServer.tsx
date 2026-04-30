import { useCallback, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "react-toastify";
import { Check, Loader2, ShieldCheck, Zap } from "lucide-react";
import { PRIVATE_PATHS } from "@/utils/routePaths";
import type { SubscriptionPlan } from "@/api/subscription";
import {
  useCreateCheckoutSession,
  useSubscriptionHistory,
  useSubscriptionPlans,
  useSubscriptionStatus,
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

export default function SubscriptionContentServer({
  gateMode = false,
  onSubscriptionComplete,
}: SubscriptionContentServerProps) {
  const plansQuery = useSubscriptionPlans();
  const statusQuery = useSubscriptionStatus();
  const historyQuery = useSubscriptionHistory();
  const checkoutMutation = useCreateCheckoutSession();

  const subscribed = statusQuery.data?.data?.subscribed === true;
  const activePlanKey =
    statusQuery.data?.data?.subscriptions?.find((s) => s.status === "active")
      ?.planKey ?? null;

  useEffect(() => {
    if (gateMode && subscribed) {
      onSubscriptionComplete?.();
    }
  }, [gateMode, onSubscriptionComplete, subscribed]);

  const plans = useMemo(() => {
    const data = plansQuery.data?.data;
    const out: SubscriptionPlan[] = [];
    if (data?.monthly) out.push(data.monthly);
    if (data?.annual) out.push(data.annual);
    for (const p of data?.other ?? []) out.push(p);
    return out;
  }, [plansQuery.data?.data]);

  const startCheckout = useCallback(
    async (planKey: string) => {
      const origin = window.location.origin;
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
    [checkoutMutation]
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
              <Badge variant="secondary">Checking…</Badge>
            ) : subscribed ? (
              <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                Subscribed
              </Badge>
            ) : (
              <Badge variant="secondary">Not subscribed</Badge>
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
              {subscribed ? activePlanKey ?? "Active" : "No active plan"}
            </p>
            <p className="mt-2 font-inter text-sm text-gray-600">
              History records: {historyQuery.data?.data?.length ?? 0}
            </p>
          </CardContent>
        </Card>
      )}

      <div
        className={cn(
          "grid gap-3 sm:gap-4",
          gateMode ? "grid-cols-1 md:grid-cols-2" : "md:grid-cols-2"
        )}
      >
        {plansQuery.isLoading && (
          <Card className="rounded-2xl">
            <CardContent className="p-5">
              <p className="font-inter text-sm text-gray-600">Loading plans…</p>
            </CardContent>
          </Card>
        )}

        {!plansQuery.isLoading && plans.length === 0 && (
          <Card className="rounded-2xl">
            <CardContent className="p-5">
              <p className="font-inter text-sm text-gray-600">
                No plans available.
              </p>
            </CardContent>
          </Card>
        )}

        {plans.map((p) => {
          const isCurrent = activePlanKey === p.key;
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
                  onClick={() => void startCheckout(p.key)}
                  className={cn(
                    "h-11 w-full rounded-xl font-solway font-semibold shadow-sm",
                    gateMode ? "mt-4 sm:mt-5" : "mt-6",
                    meta.popular
                      ? "bg-[#0063F7] hover:bg-[#0056d9]"
                      : "bg-primary hover:bg-primary/90"
                  )}
                  disabled={checkoutMutation.isPending}
                >
                  {checkoutMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Redirecting…
                    </>
                  ) : isCurrent ? (
                    "Renew"
                  ) : (
                    "Subscribe"
                  )}
                </Button>

                {isCurrent && (
                  <p className="mt-2 text-center font-inter text-xs text-gray-600">
                    Your current plan
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

