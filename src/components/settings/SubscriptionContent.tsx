import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  ChevronLeft,
  CreditCard,
  Building2,
  Smartphone,
  Loader2,
  ShieldCheck,
  Sparkles,
  Zap,
  Lock,
} from "lucide-react";
import { toast } from "react-toastify";

const STORAGE_KEY = "ryd-ai-subscription-v3";

export type PlanId = "monthly" | "quarterly" | "annual";

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

const PLAN_META: Record<
  PlanId,
  {
    name: string;
    tagline: string;
    durationLabel: string;
    durationMonths: number;
    priceLabel: string;
    amountNgn: number;
    periodSuffix: string;
    accent: string;
    borderAccent: string;
    icon: typeof Sparkles;
    features: string[];
    popular?: boolean;
  }
> = {
  monthly: {
    name: "Monthly",
    tagline: "Flexible — renew every month",
    durationLabel: "1-month access",
    durationMonths: 1,
    priceLabel: "₦4,500",
    amountNgn: 4_500,
    periodSuffix: "/ month",
    accent: "from-[#E8E0FF] to-[#F3ECFE]",
    borderAccent: "border-transparent",
    icon: Zap,
    features: [
      "Full AI LMS access (courses, AI tools, progress tracking)",
      "Same platform features as every plan",
      "Renews monthly unless cancelled",
    ],
  },
  quarterly: {
    name: "Quarterly",
    tagline: "Balanced — one payment every 3 months",
    durationLabel: "3-month access",
    durationMonths: 3,
    priceLabel: "₦11,500",
    amountNgn: 11_500,
    periodSuffix: "/ quarter",
    accent: "from-[#CCE0FD] to-[#E8F0FF]",
    borderAccent: "ring-2 ring-[#0063F7]/35",
    icon: Sparkles,
    popular: true,
    features: [
      "Full AI LMS access for the entire quarter",
      "Fewer transactions — convenient for steady learners",
      "Renews every 3 months unless cancelled",
    ],
  },
  annual: {
    name: "Annual",
    tagline: "Best value — pay once per year",
    durationLabel: "12-month access",
    durationMonths: 12,
    priceLabel: "₦38,000",
    amountNgn: 38_000,
    periodSuffix: "/ year",
    accent: "from-[#FCE7F3] to-[#F3ECFE]",
    borderAccent: "border-transparent",
    icon: ShieldCheck,
    features: [
      "Full AI LMS access for 12 months",
      "Lowest cost per month — best savings",
      "Renews annually unless cancelled",
    ],
  },
};

type PaymentMethod = "card" | "bank" | "ussd";
type CheckoutStep =
  | "select-method"
  | "card-details"
  | "pin"
  | "otp"
  | "bank-transfer"
  | "ussd"
  | "processing"
  | "success";

const TEST_CARDS = {
  success: {
    number: "4084 0840 8408 4081",
    expiry: "03/27",
    cvv: "408",
    pin: "",
    otp: "",
    label: "Visa (No PIN/OTP)",
  },
  pinOnly: {
    number: "5078 5078 5078 5078 12",
    expiry: "03/27",
    cvv: "081",
    pin: "1111",
    otp: "",
    label: "Mastercard (PIN only)",
  },
  pinOtp: {
    number: "5060 6666 6666 6666 666",
    expiry: "03/27",
    cvv: "123",
    pin: "1234",
    otp: "123456",
    label: "Verve (PIN + OTP)",
  },
};

const loadSub = (): Subscription | null => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Subscription;
  } catch {
    return null;
  }
};

const saveSub = (sub: Subscription) => {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(sub));
};

const formatCardNumber = (value: string) => {
  const digits = value.replace(/\D/g, "");
  const groups = digits.match(/.{1,4}/g);
  return groups ? groups.join(" ") : "";
};

const formatExpiry = (value: string) => {
  const digits = value.replace(/\D/g, "");
  if (digits.length >= 2) {
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}`;
  }
  return digits;
};

const SubscriptionContent = () => {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanId | null>(null);
  const [step, setStep] = useState<CheckoutStep>("select-method");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");

  // Card form state
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardPin, setCardPin] = useState("");
  const [cardOtp, setCardOtp] = useState("");
  const [requiresPin, setRequiresPin] = useState(false);
  const [requiresOtp, setRequiresOtp] = useState(false);
  const [expectedPin, setExpectedPin] = useState("");
  const [expectedOtp, setExpectedOtp] = useState("");

  // Bank transfer state
  const [transferAccount] = useState({
    bank: "Wema Bank",
    accountNumber: "0123456789",
    accountName: "Paystack-RYD",
    expiresIn: "30:00",
  });

  // USSD state
  const [ussdCode] = useState("*737*000*4500#");

  useEffect(() => {
    setSubscription(loadSub());
  }, []);

  const selectedMeta = useMemo(
    () => (selectedPlan ? PLAN_META[selectedPlan] : null),
    [selectedPlan]
  );

  const openCheckout = (planId: PlanId) => {
    setSelectedPlan(planId);
    setStep("select-method");
    setPaymentMethod("card");
    resetCardForm();
    setCheckoutOpen(true);
  };

  const resetCardForm = () => {
    setCardNumber("");
    setCardExpiry("");
    setCardCvv("");
    setCardPin("");
    setCardOtp("");
    setRequiresPin(false);
    setRequiresOtp(false);
    setExpectedPin("");
    setExpectedOtp("");
  };

  const closeCheckout = () => {
    setCheckoutOpen(false);
    setStep("select-method");
    setSelectedPlan(null);
    resetCardForm();
  };

  const completePayment = useCallback(
    (method: string, last4?: string) => {
      if (!selectedPlan || !selectedMeta) return;
      const ref = `PY_${Date.now().toString(36).toUpperCase()}`;
      const paidAt = new Date().toISOString();
      const renews = new Date();
      renews.setMonth(renews.getMonth() + selectedMeta.durationMonths);
      const next: Subscription = {
        planId: selectedPlan,
        planName: selectedMeta.name,
        amountKobo: selectedMeta.amountNgn * 100,
        paystackReference: ref,
        paidAt,
        renewsAt: renews.toISOString(),
        paymentMethod: method,
        last4,
      };
      setSubscription(next);
      saveSub(next);
      setStep("success");
      toast.success("Payment successful!");
    },
    [selectedPlan, selectedMeta]
  );

  const handleCardSubmit = async () => {
    const cleanNumber = cardNumber.replace(/\s/g, "");

    // Check which test card was used
    let matchedCard: (typeof TEST_CARDS)[keyof typeof TEST_CARDS] | null = null;
    for (const card of Object.values(TEST_CARDS)) {
      if (cleanNumber === card.number.replace(/\s/g, "")) {
        matchedCard = card;
        break;
      }
    }

    if (matchedCard) {
      if (matchedCard.pin && !requiresPin) {
        setRequiresPin(true);
        setExpectedPin(matchedCard.pin);
        if (matchedCard.otp) {
          setRequiresOtp(true);
          setExpectedOtp(matchedCard.otp);
        }
        setStep("pin");
        return;
      }
    }

    // No PIN required or unknown card — process directly
    setStep("processing");
    await new Promise((r) => setTimeout(r, 2000));
    completePayment("Card", cleanNumber.slice(-4));
  };

  const handlePinSubmit = async () => {
    if (cardPin !== expectedPin) {
      toast.error("Incorrect PIN. Please try again.");
      return;
    }

    if (requiresOtp) {
      setStep("otp");
      toast.info("An OTP has been sent to your phone.");
      return;
    }

    setStep("processing");
    await new Promise((r) => setTimeout(r, 2000));
    completePayment("Card", cardNumber.replace(/\s/g, "").slice(-4));
  };

  const handleOtpSubmit = async () => {
    if (cardOtp !== expectedOtp) {
      toast.error("Incorrect OTP. Please try again.");
      return;
    }

    setStep("processing");
    await new Promise((r) => setTimeout(r, 2000));
    completePayment("Card", cardNumber.replace(/\s/g, "").slice(-4));
  };

  const handleBankTransferConfirm = async () => {
    setStep("processing");
    await new Promise((r) => setTimeout(r, 3000));
    completePayment("Bank Transfer");
  };

  const handleUssdConfirm = async () => {
    setStep("processing");
    await new Promise((r) => setTimeout(r, 3000));
    completePayment("USSD");
  };

  const inputClass =
    "h-11 rounded-lg border-gray-200 bg-white px-3 font-inter text-[#0A090B] placeholder:text-gray-400";

  const renderCheckoutContent = () => {
    if (!selectedMeta) return null;

    switch (step) {
      case "select-method":
        return (
          <div className="space-y-4">
            <div className="rounded-xl bg-[#F8F8FA] p-3 sm:p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="font-inter text-sm text-gray-600">Amount</span>
                <div className="text-left sm:text-right">
                  <span className="font-solway text-lg font-bold text-gray-900 sm:text-xl">
                    {selectedMeta.priceLabel}
                  </span>
                  <span className="ml-1 font-inter text-sm text-gray-500">
                    {selectedMeta.periodSuffix}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="font-inter text-sm font-medium text-gray-700">
                Select payment method
              </p>
              <div className="grid gap-2">
                {[
                  { id: "card" as const, icon: CreditCard, label: "Pay with Card" },
                  { id: "bank" as const, icon: Building2, label: "Bank Transfer" },
                  { id: "ussd" as const, icon: Smartphone, label: "USSD" },
                ].map((method) => (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setPaymentMethod(method.id)}
                    className={cn(
                      "flex min-h-13 w-full min-w-0 items-center gap-3 rounded-xl border-2 p-3 text-left transition-all sm:min-h-0 sm:p-4",
                      paymentMethod === method.id
                        ? "border-primary bg-primary/5"
                        : "border-gray-200 hover:border-gray-300"
                    )}
                  >
                    <div
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-lg sm:size-10",
                        paymentMethod === method.id
                          ? "bg-primary text-white"
                          : "bg-gray-100 text-gray-600"
                      )}
                    >
                      <method.icon className="size-4 sm:size-5" />
                    </div>
                    <span className="min-w-0 flex-1 font-inter text-sm font-medium text-gray-900 sm:text-base">
                      {method.label}
                    </span>
                    {paymentMethod === method.id && (
                      <Check className="size-5 shrink-0 text-primary" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2 text-gray-400">
              <Lock className="size-4" />
              <span className="font-inter text-xs">
                Secured by Paystack
              </span>
            </div>
          </div>
        );

      case "card-details":
        return (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setStep("select-method")}
              className="flex items-center gap-1 font-inter text-sm text-gray-600 hover:text-gray-900"
            >
              <ChevronLeft className="size-4" />
              Back
            </button>

            <div className="rounded-xl bg-[#F8F8FA] p-3 sm:p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="font-inter text-sm text-gray-600">
                  Pay {selectedMeta.priceLabel}
                </span>
                <Badge variant="outline" className="w-fit shrink-0 text-xs">
                  {selectedMeta.name}
                </Badge>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="card-number" className="font-inter text-sm">
                  Card Number
                </Label>
                <Input
                  id="card-number"
                  placeholder="0000 0000 0000 0000"
                  value={cardNumber}
                  onChange={(e) =>
                    setCardNumber(formatCardNumber(e.target.value))
                  }
                  maxLength={23}
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="card-expiry" className="font-inter text-sm">
                    Expiry
                  </Label>
                  <Input
                    id="card-expiry"
                    placeholder="MM/YY"
                    value={cardExpiry}
                    onChange={(e) =>
                      setCardExpiry(formatExpiry(e.target.value))
                    }
                    maxLength={5}
                    className={inputClass}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="card-cvv" className="font-inter text-sm">
                    CVV
                  </Label>
                  <Input
                    id="card-cvv"
                    placeholder="123"
                    type="password"
                    value={cardCvv}
                    onChange={(e) =>
                      setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 4))
                    }
                    maxLength={4}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-blue-50 p-2.5 sm:p-3">
              <p className="wrap-break-word font-inter text-[11px] leading-relaxed text-blue-800 sm:text-xs">
                <strong>Test cards:</strong> Use{" "}
                <code className="break-all rounded bg-blue-100 px-1 py-0.5 text-[10px] sm:text-xs">
                  4084 0840 8408 4081
                </code>{" "}
                (CVV: 408) for instant success, or{" "}
                <code className="break-all rounded bg-blue-100 px-1 py-0.5 text-[10px] sm:text-xs">
                  5078 5078 5078 5078 12
                </code>{" "}
                (CVV: 081, PIN: 1111) to test PIN flow.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 text-gray-400">
              <Lock className="size-4" />
              <span className="font-inter text-xs">
                Your card details are secure
              </span>
            </div>
          </div>
        );

      case "pin":
        return (
          <div className="space-y-4">
            <div className="text-center">
              <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-primary/10">
                <Lock className="size-6 text-primary" />
              </div>
              <h3 className="font-solway text-lg font-semibold text-gray-900">
                Enter your PIN
              </h3>
              <p className="mt-1 font-inter text-sm text-gray-600">
                Please enter your 4-digit card PIN to authorize this payment
              </p>
            </div>

            <div className="mx-auto w-full max-w-[200px]">
              <Input
                type="password"
                placeholder="••••"
                value={cardPin}
                onChange={(e) =>
                  setCardPin(e.target.value.replace(/\D/g, "").slice(0, 4))
                }
                maxLength={4}
                className="h-14 text-center text-2xl tracking-[0.5em]"
                autoFocus
              />
            </div>

            <p className="text-center font-inter text-xs text-gray-500">
              Test PIN: <code className="rounded bg-gray-100 px-1">{expectedPin}</code>
            </p>
          </div>
        );

      case "otp":
        return (
          <div className="space-y-4">
            <div className="text-center">
              <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-primary/10">
                <Smartphone className="size-6 text-primary" />
              </div>
              <h3 className="font-solway text-lg font-semibold text-gray-900">
                Enter OTP
              </h3>
              <p className="mt-1 font-inter text-sm text-gray-600">
                Enter the 6-digit code sent to your phone
              </p>
            </div>

            <div className="mx-auto w-full max-w-[240px]">
              <Input
                type="text"
                placeholder="000000"
                value={cardOtp}
                onChange={(e) =>
                  setCardOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                maxLength={6}
                className="h-14 text-center text-2xl tracking-[0.3em]"
                autoFocus
              />
            </div>

            <p className="text-center font-inter text-xs text-gray-500">
              Test OTP: <code className="rounded bg-gray-100 px-1">{expectedOtp}</code>
            </p>
          </div>
        );

      case "bank-transfer":
        return (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setStep("select-method")}
              className="flex items-center gap-1 font-inter text-sm text-gray-600 hover:text-gray-900"
            >
              <ChevronLeft className="size-4" />
              Back
            </button>

            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 sm:p-4">
              <p className="mb-3 font-inter text-sm text-gray-700">
                Transfer{" "}
                <strong className="text-gray-900">{selectedMeta.priceLabel}</strong>{" "}
                to the account below:
              </p>

              <div className="space-y-3 rounded-lg bg-white p-3 sm:p-4">
                <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                  <span className="shrink-0 font-inter text-sm text-gray-500">Bank</span>
                  <span className="min-w-0 wrap-break-word text-left font-inter font-medium text-gray-900 sm:text-right">
                    {transferAccount.bank}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                  <span className="shrink-0 font-inter text-sm text-gray-500">
                    Account Number
                  </span>
                  <span className="break-all text-left font-mono text-sm font-semibold text-gray-900 sm:text-base sm:text-right">
                    {transferAccount.accountNumber}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                  <span className="shrink-0 font-inter text-sm text-gray-500">
                    Account Name
                  </span>
                  <span className="min-w-0 wrap-break-word text-left font-inter font-medium text-gray-900 sm:text-right">
                    {transferAccount.accountName}
                  </span>
                </div>
              </div>

              <p className="mt-3 text-center font-inter text-xs text-amber-700">
                This account expires in {transferAccount.expiresIn}
              </p>
            </div>

            <p className="font-inter text-xs text-gray-500">
              Click "I've sent the money" after completing the transfer. Your
              subscription will be activated once payment is confirmed.
            </p>
          </div>
        );

      case "ussd":
        return (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setStep("select-method")}
              className="flex items-center gap-1 font-inter text-sm text-gray-600 hover:text-gray-900"
            >
              <ChevronLeft className="size-4" />
              Back
            </button>

            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-center sm:p-4">
              <p className="mb-3 font-inter text-sm text-gray-700">
                Dial the code below on your phone to pay{" "}
                <strong>{selectedMeta.priceLabel}</strong>
              </p>

              <div className="rounded-lg bg-white p-3 sm:p-4">
                <p className="break-all font-mono text-lg font-bold leading-snug text-gray-900 sm:text-2xl">
                  {ussdCode}
                </p>
              </div>

              <p className="mt-3 font-inter text-xs text-gray-500">
                Follow the prompts to complete payment
              </p>
            </div>
          </div>
        );

      case "processing":
        return (
          <div className="py-8 text-center">
            <Loader2 className="mx-auto size-12 animate-spin text-primary" />
            <p className="mt-4 font-solway text-lg font-semibold text-gray-900">
              Processing payment...
            </p>
            <p className="mt-1 font-inter text-sm text-gray-600">
              Please wait while we confirm your transaction
            </p>
          </div>
        );

      case "success":
        return (
          <div className="py-4 text-center">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-green-100">
              <Check className="size-8 text-green-600" />
            </div>
            <h3 className="font-solway text-xl font-bold text-gray-900">
              Payment Successful!
            </h3>
            <p className="mt-2 font-inter text-sm text-gray-600">
              Your {selectedMeta.name} subscription is now active.
            </p>
            {subscription && (
              <p className="mt-3 font-mono text-xs text-gray-500">
                Reference: {subscription.paystackReference}
              </p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const renderCheckoutFooter = () => {
    switch (step) {
      case "select-method":
        return (
          <>
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full rounded-xl sm:h-10 sm:w-auto"
              onClick={closeCheckout}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="h-11 w-full rounded-xl font-solway sm:h-10 sm:w-auto"
              onClick={() => {
                if (paymentMethod === "card") setStep("card-details");
                else if (paymentMethod === "bank") setStep("bank-transfer");
                else if (paymentMethod === "ussd") setStep("ussd");
              }}
            >
              Continue
            </Button>
          </>
        );

      case "card-details":
        return (
          <Button
            type="button"
            className="h-11 w-full rounded-xl font-solway sm:h-10"
            onClick={() => void handleCardSubmit()}
            disabled={
              cardNumber.replace(/\s/g, "").length < 16 ||
              cardExpiry.length < 5 ||
              cardCvv.length < 3
            }
          >
            Pay {selectedMeta?.priceLabel}
          </Button>
        );

      case "pin":
        return (
          <Button
            type="button"
            className="h-11 w-full rounded-xl font-solway sm:h-10"
            onClick={() => void handlePinSubmit()}
            disabled={cardPin.length < 4}
          >
            Authorize
          </Button>
        );

      case "otp":
        return (
          <Button
            type="button"
            className="h-11 w-full rounded-xl font-solway sm:h-10"
            onClick={() => void handleOtpSubmit()}
            disabled={cardOtp.length < 6}
          >
            Verify & Pay
          </Button>
        );

      case "bank-transfer":
        return (
          <Button
            type="button"
            className="w-full rounded-xl font-solway"
            onClick={() => void handleBankTransferConfirm()}
          >
            I've sent the money
          </Button>
        );

      case "ussd":
        return (
          <Button
            type="button"
            className="h-11 w-full rounded-xl font-solway sm:h-10"
            onClick={() => void handleUssdConfirm()}
          >
            I've completed the payment
          </Button>
        );

      case "success":
        return (
          <Button
            type="button"
            className="h-11 w-full rounded-xl font-solway sm:h-10"
            onClick={closeCheckout}
          >
            Done
          </Button>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h2 className="font-solway text-lg font-semibold text-gray-900 sm:text-xl">
          Subscription
        </h2>
        <p className="mt-1 font-inter text-sm text-gray-600">
          Access to the AI LMS (courses, tools, and features) requires an{" "}
          <span className="font-semibold text-gray-800">active subscription</span>.
          Choose a billing period that works for you.
        </p>
      </div>

      {/* Current plan */}
      <Card className="rounded-2xl border-none shadow-none">
        <CardContent className="rounded-[20px] bg-[#F8F8FA] p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-inter text-xs font-semibold uppercase tracking-wide text-gray-500">
                Current plan
              </p>
              {subscription ? (
                <>
                  <p className="mt-1 font-solway text-xl font-bold text-gray-900">
                    {subscription.planName}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge className="bg-green-100 font-inter text-xs font-medium text-green-800 hover:bg-green-100">
                      Active
                    </Badge>
                    {subscription.last4 && (
                      <Badge
                        variant="outline"
                        className="border-gray-200 font-inter text-xs"
                      >
                        •••• {subscription.last4}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-2 font-inter text-xs text-gray-600 sm:text-sm">
                    <span className="font-semibold text-gray-800">
                      {PLAN_META[subscription.planId].durationLabel}
                    </span>
                    {" · "}
                    Renews{" "}
                    {new Date(subscription.renewsAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-1 font-solway text-xl font-bold text-gray-900">
                    No active plan
                  </p>
                  <p className="mt-1 font-inter text-sm text-gray-600">
                    Subscribe to unlock full access to all courses and AI features.
                  </p>
                </>
              )}
            </div>
            {subscription && (
              <div className="rounded-xl bg-white p-4 shadow-xs ring-1 ring-gray-100 sm:max-w-xs">
                <p className="font-inter text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  Last payment
                </p>
                <p className="mt-1 font-inter text-sm text-gray-800">
                  ₦{(subscription.amountKobo / 100).toLocaleString()} via{" "}
                  {subscription.paymentMethod}
                </p>
                <p className="font-mono text-xs text-gray-500">
                  {subscription.paystackReference}
                </p>
              </div>
            )}
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
                  <Badge className="bg-[#0063F7] font-inter text-[10px] font-semibold uppercase tracking-wider text-white hover:bg-[#0063F7]">
                    Most popular
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
                <p className="mt-1 font-inter text-sm text-gray-600">
                  {plan.tagline}
                </p>
                <div className="mt-4 flex flex-wrap items-baseline gap-x-1 gap-y-0.5">
                  <span className="font-solway text-3xl font-bold tracking-tight text-gray-900">
                    {plan.priceLabel}
                  </span>
                  <span className="font-inter text-sm text-gray-600">
                    {plan.periodSuffix}
                  </span>
                </div>
                <ul className="mt-5 flex-1 space-y-2.5">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className="flex gap-2 font-inter text-sm text-gray-700"
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
                  {isCurrent ? "Renew" : "Subscribe"}
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

      <Dialog
        open={checkoutOpen}
        onOpenChange={(o) => {
          if (!o && step !== "processing") closeCheckout();
        }}
      >
        <DialogContent
          className={cn(
            "top-4 max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] max-w-lg translate-y-0 gap-0 overflow-hidden rounded-2xl border-0 p-0 sm:top-1/2 sm:max-h-[min(86dvh,760px)] sm:w-full sm:-translate-y-1/2",
            "flex flex-col"
          )}
          showCloseButton={step !== "processing" && step !== "success"}
        >
          <DialogHeader className="shrink-0 space-y-0 border-b border-gray-100 px-4 pb-3 pt-4 pr-12 text-left sm:px-6 sm:pb-4 sm:pt-5 sm:pr-14">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <img
                src="https://website-v3-assets.s3.amazonaws.com/assets/img/hero/Paystack-mark-white-twitter.png"
                alt="Paystack"
                className="size-7 shrink-0 rounded-lg bg-[#00C3F7] p-1.5 sm:size-8"
              />
              <DialogTitle className="min-w-0 font-solway text-base leading-snug sm:text-lg">
                {step === "success" ? "Payment Complete" : "Checkout"}
              </DialogTitle>
            </div>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain px-4 py-3 sm:px-6 sm:py-4">
            {renderCheckoutContent()}
          </div>

          {step !== "processing" && (
            <DialogFooter
              className={cn(
                "shrink-0 flex-col gap-2 border-t border-gray-100 bg-white px-4 py-3 sm:flex-row sm:justify-end sm:gap-2 sm:px-6 sm:py-4"
              )}
            >
              {renderCheckoutFooter()}
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SubscriptionContent;
