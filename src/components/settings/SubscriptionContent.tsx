import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  FlaskConical,
  Loader2,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { toast } from "react-toastify";

const DEMO_STORAGE_KEY = "ryd-ai-subscription-demo-v1";

export type PlanId = "lite" | "plus" | "family";

export interface SimulatedSubscription {
  planId: PlanId;
  planName: string;
  amountKobo: number;
  paystackReference: string;
  paidAt: string;
  renewsAt: string;
}

const PLAN_META: Record<
  PlanId,
  {
    name: string;
    tagline: string;
    /** Shown in “current plan” — how many learner profiles this tier allows */
    learnerProfilesLabel: string;
    priceLabel: string;
    amountNgn: number;
    accent: string;
    borderAccent: string;
    icon: typeof Sparkles;
    features: string[];
    popular?: boolean;
  }
> = {
  lite: {
    name: "Learner Lite",
    tagline: "One learner profile — same full course library as every plan",
    learnerProfilesLabel: "1 learner profile",
    priceLabel: "₦4,500",
    amountNgn: 4_500,
    accent: "from-[#E8E0FF] to-[#F3ECFE]",
    borderAccent: "border-transparent",
    icon: Zap,
    features: [
      "1 learner profile included",
      "Full access to all courses — identical catalog on every plan",
      "Core AI study companion & standard narration",
      "Community knowledge base",
    ],
  },
  plus: {
    name: "Learner Plus",
    tagline: "Up to 3 profiles — siblings or a small household, one library",
    learnerProfilesLabel: "Up to 3 learner profiles",
    priceLabel: "₦12,000",
    amountNgn: 12_000,
    accent: "from-[#CCE0FD] to-[#E8F0FF]",
    borderAccent: "ring-2 ring-[#0063F7]/35",
    icon: Sparkles,
    popular: true,
    features: [
      "Up to 3 learner profiles",
      "Full access to all courses — identical catalog on every plan",
      "Priority AI tutor responses",
      "Progress analytics & streak insights",
      "Email support within 24h",
    ],
  },
  family: {
    name: "Family Studio",
    tagline: "Up to 6 profiles — maximum seats, same courses for everyone",
    learnerProfilesLabel: "Up to 6 learner profiles",
    priceLabel: "₦28,000",
    amountNgn: 28_000,
    accent: "from-[#FCE7F3] to-[#F3ECFE]",
    borderAccent: "border-transparent",
    icon: ShieldCheck,
    features: [
      "Up to 6 learner profiles",
      "Full access to all courses — identical catalog on every plan",
      "Shared family progress hub (demo)",
      "Quarterly live Q&A slot (simulated)",
      "Dedicated success line (demo)",
    ],
  },
};

type PaystackPhase = "idle" | "redirect" | "bank" | "success";

const loadDemoSub = (): SimulatedSubscription | null => {
  try {
    const raw = sessionStorage.getItem(DEMO_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SimulatedSubscription;
  } catch {
    return null;
  }
};

const saveDemoSub = (sub: SimulatedSubscription) => {
  sessionStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(sub));
};

const SubscriptionContent = () => {
  const [subscription, setSubscription] = useState<SimulatedSubscription | null>(
    null
  );
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanId | null>(null);
  const [phase, setPhase] = useState<PaystackPhase>("idle");

  useEffect(() => {
    setSubscription(loadDemoSub());
  }, []);

  const selectedMeta = useMemo(
    () => (selectedPlan ? PLAN_META[selectedPlan] : null),
    [selectedPlan]
  );

  const openCheckout = (planId: PlanId) => {
    setSelectedPlan(planId);
    setPhase("idle");
    setCheckoutOpen(true);
  };

  const runSimulatedPaystack = useCallback(async () => {
    if (!selectedPlan || !selectedMeta) return;
    setPhase("redirect");
    await new Promise((r) => setTimeout(r, 900));
    setPhase("bank");
    await new Promise((r) => setTimeout(r, 1_400));
    const ref = `PAY_${Date.now().toString(36).toUpperCase()}_TST`;
    const paidAt = new Date().toISOString();
    const renews = new Date();
    renews.setMonth(renews.getMonth() + 1);
    const next: SimulatedSubscription = {
      planId: selectedPlan,
      planName: selectedMeta.name,
      amountKobo: selectedMeta.amountNgn * 100,
      paystackReference: ref,
      paidAt,
      renewsAt: renews.toISOString(),
    };
    setSubscription(next);
    saveDemoSub(next);
    setPhase("success");
    toast.success("Paystack (sandbox): payment captured successfully.");
  }, [selectedPlan, selectedMeta]);

  const closeCheckout = () => {
    setCheckoutOpen(false);
    setPhase("idle");
    setSelectedPlan(null);
  };

  const resetDemo = () => {
    sessionStorage.removeItem(DEMO_STORAGE_KEY);
    setSubscription(null);
    toast.info("Demo subscription cleared — you're back on the exploration tier.");
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Test environment ribbon */}
      {/* <div
        className={cn(
          "relative overflow-hidden rounded-2xl border border-amber-200/80 bg-linear-to-r from-amber-50 via-orange-50 to-amber-50 px-4 py-3 sm:px-5",
          "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6)]"
        )}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(-45deg, #000 0, #000 1px, transparent 1px, transparent 10px)",
          }}
        />
        <div className="relative flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3 sm:items-center">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/90 shadow-sm ring-1 ring-amber-100">
              <FlaskConical className="size-5 text-amber-700" aria-hidden />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-solway text-sm font-bold text-amber-950 sm:text-base">
                  Test &amp; demo environment
                </p>
                <Badge
                  variant="outline"
                  className="border-amber-300 bg-white/80 font-sans-serifbookflf text-[10px] font-semibold uppercase tracking-wide text-amber-900"
                >
                  No real charges
                </Badge>
              </div>
              <p className="mt-0.5 font-sans-serifbookflf text-xs leading-snug text-amber-900/80 sm:text-sm">
                Checkout below simulates Paystack hosted pay — perfect for
                stakeholder walkthroughs.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={resetDemo}
            className="shrink-0 border-amber-300 bg-white/90 font-sans-serifbookflf text-amber-900 hover:bg-amber-50"
          >
            Reset demo state
          </Button>
        </div>
      </div> */}

      <div>
        <h2 className="font-solway text-lg font-semibold text-gray-900 sm:text-xl">
          Subscription
        </h2>
        <p className="mt-1 font-sans-serifbookflf text-sm text-gray-600">
          Every plan includes the{" "}
          <span className="font-semibold text-gray-800">same course catalog</span>
          ; tiers only change how many{" "}
          <span className="font-semibold text-gray-800">learner profiles</span>{" "}
          you can add. Demo checkout below is simulated.
        </p>
      </div>

      {/* Current plan */}
      <Card className="rounded-2xl border-none shadow-none">
        <CardContent className="rounded-[20px] bg-[#F8F8FA] p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-sans-serifbookfl text-xs font-semibold uppercase tracking-wide text-[#081A28]">
                Current access
              </p>
              {subscription ? (
                <>
                  <p className="mt-1 font-solway text-xl font-bold text-gray-900">
                    {subscription.planName}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge className="bg-[#F3ECFE] font-sans-serifbookflf text-xs font-medium text-primary hover:bg-[#F3ECFE]">
                      Active (demo)
                    </Badge>
                    <Badge
                      variant="outline"
                      className="border-gray-200 font-sans-serifbookflf text-xs"
                    >
                      Ref: {subscription.paystackReference}
                    </Badge>
                  </div>
                  <p className="mt-2 font-sans-serifbookflf text-xs text-gray-600 sm:text-sm">
                    <span className="font-semibold text-gray-800">
                      {PLAN_META[subscription.planId].learnerProfilesLabel}
                    </span>
                    {" · "}
                    Simulated renewal:{" "}
                    {new Date(subscription.renewsAt).toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-1 font-solway text-xl font-bold text-gray-900">
                    Exploration tier
                  </p>
                  <p className="mt-1 font-sans-serifbookflf text-sm text-gray-600">
                    You&apos;re browsing with mock data — upgrade a plan to see
                    the Paystack sandbox receipt.
                  </p>
                </>
              )}
            </div>
            <div className="rounded-xl bg-white p-4 shadow-xs ring-1 ring-gray-100 sm:max-w-xs">
              <p className="font-sans-serifbookfl text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                Paystack (simulated)
              </p>
              {subscription ? (
                <p className="mt-2 font-mono text-xs text-gray-800">
                  {subscription.amountKobo / 100} NGN / mo · paid{" "}
                  {new Date(subscription.paidAt).toLocaleTimeString(undefined, {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              ) : (
                <p className="mt-2 font-sans-serifbookflf text-xs text-gray-600">
                  Awaiting first sandbox transaction.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plans */}
      <div className="grid gap-4 lg:grid-cols-3">
        {(Object.keys(PLAN_META) as PlanId[]).map((planId) => {
          const plan = PLAN_META[planId];
          const Icon = plan.icon;
          const isCurrent = subscription?.planId === planId;
          return (
            <Card
              key={planId}
              className={cn(
                "relative overflow-hidden rounded-2xl border-0 shadow-none transition hover:shadow-md",
                plan.borderAccent,
                plan.popular && "lg:scale-[1.02] lg:shadow-lg"
              )}
            >
              {plan.popular && (
                <div className="absolute right-4 top-4">
                  <Badge className="bg-[#0063F7] font-sans-serifbookflf text-[10px] font-semibold uppercase tracking-wider text-white hover:bg-[#0063F7]">
                    Most picked
                  </Badge>
                </div>
              )}
              <CardContent
                className={cn(
                  "flex h-full flex-col p-5 sm:p-6",
                  `bg-linear-to-br ${plan.accent}`
                )}
              >
                <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-white/90 shadow-sm ring-1 ring-white/60">
                  <Icon className="size-5 text-primary" aria-hidden />
                </div>
                <h3 className="font-solway text-lg font-bold text-gray-900">
                  {plan.name}
                </h3>
                <p className="mt-1 font-sans-serifbookflf text-sm text-gray-600">
                  {plan.tagline}
                </p>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="font-solway text-3xl font-bold tracking-tight text-gray-900">
                    {plan.priceLabel}
                  </span>
                  <span className="font-sans-serifbookflf text-sm text-gray-600">
                    / month
                  </span>
                </div>
                <ul className="mt-5 flex-1 space-y-2.5">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className="flex gap-2 font-sans-serifbookflf text-sm text-gray-700"
                    >
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  type="button"
                  onClick={() => openCheckout(planId)}
                  className={cn(
                    "mt-6 h-11 w-full rounded-xl font-solway font-semibold shadow-sm",
                    plan.popular
                      ? "bg-[#0063F7] hover:bg-[#0056d9]"
                      : "bg-primary hover:bg-primary/90"
                  )}
                >
                  {isCurrent ? "Renew / Change" : "Subscribe"}
                </Button>
                {isCurrent && (
                  <p className="mt-2 text-center font-sans-serifbookflf text-xs text-gray-600">
                    You&apos;re on this tier in the demo.
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="font-sans-serifbookflf text-center text-xs text-gray-500">
        Demo only — card networks, OTP, and webhooks are mocked for your meeting.
        Production will use live Paystack keys on the backend.
      </p>

      <Dialog
        open={checkoutOpen}
        onOpenChange={(o) => {
          if (!o) closeCheckout();
          else setCheckoutOpen(true);
        }}
      >
        <DialogContent className="max-w-md rounded-2xl border-0 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-solway text-xl">
              Paystack Checkout
            </DialogTitle>
            <DialogDescription className="font-sans-serifbookflf text-sm">
              Sandbox mirror — no funds move. Sequencing matches hosted pay:
              redirect → bank simulation → reference.
            </DialogDescription>
          </DialogHeader>

          {selectedMeta && (
            <div className="space-y-4">
              <div className="rounded-xl bg-[#F8F8FA] p-4 ring-1 ring-gray-100">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-sans-serifbookflf text-sm text-gray-600">
                    Plan
                  </span>
                  <span className="font-solway font-semibold text-gray-900">
                    {selectedMeta.name}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2 border-t border-gray-200/80 pt-2">
                  <span className="font-sans-serifbookflf text-sm text-gray-600">
                    Amount
                  </span>
                  <span className="font-solway text-lg font-bold text-gray-900">
                    {selectedMeta.priceLabel}
                  </span>
                </div>
                <p className="mt-2 font-mono text-[11px] text-gray-500">
                  publicKey=pk_test_••••RYD_LMS_DEMO
                </p>
              </div>

              {phase === "success" ? (
                <div className="rounded-xl border border-primary/20 bg-[#F3ECFE] p-4">
                  <div className="flex items-center gap-2 text-primary">
                    <ShieldCheck className="size-5 shrink-0" />
                    <span className="font-solway font-semibold">
                      Payment successful
                    </span>
                  </div>
                  <p className="mt-2 font-sans-serifbookflf text-sm text-gray-700">
                    Reference stored in session for the demo. In production,
                    your backend would verify via Paystack API.
                  </p>
                  {subscription && (
                    <p className="mt-2 break-all font-mono text-xs text-gray-800">
                      {subscription.paystackReference}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2 rounded-xl bg-white p-4 ring-1 ring-gray-100">
                  <p className="font-sans-serifbookfl text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Status
                  </p>
                  {phase === "idle" && (
                    <p className="font-sans-serifbookflf text-sm text-gray-700">
                      Ready to simulate customer authorization.
                    </p>
                  )}
                  {phase === "redirect" && (
                    <p className="flex items-center gap-2 font-sans-serifbookflf text-sm text-gray-700">
                      <Loader2 className="size-4 animate-spin text-primary" />
                      Redirecting to Paystack hosted page…
                    </p>
                  )}
                  {phase === "bank" && (
                    <p className="flex items-center gap-2 font-sans-serifbookflf text-sm text-gray-700">
                      <Loader2 className="size-4 animate-spin text-[#0063F7]" />
                      Test bank authorizing (sandbox)…
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            {phase === "success" ? (
              <Button
                type="button"
                className="w-full rounded-xl font-solway sm:w-auto"
                onClick={closeCheckout}
              >
                Done
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl font-sans-serifbookflf"
                  onClick={closeCheckout}
                  disabled={phase !== "idle"}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="rounded-xl font-solway"
                  onClick={() => void runSimulatedPaystack()}
                  disabled={phase !== "idle" || !selectedMeta}
                >
                  Pay securely
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SubscriptionContent;
