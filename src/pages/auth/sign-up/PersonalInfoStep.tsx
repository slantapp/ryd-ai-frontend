import * as React from "react";
import { toast } from "react-toastify";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link } from "react-router-dom";
import { PUBLIC_PATHS } from "@/utils/routePaths";
import type { AiRegisterPayload } from "@/stores/authStore";
import { cn } from "@/lib/utils";
import { HEAR_ABOUT_US_OPTIONS } from "@/data/signupReferralSources";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type SignUpFormData = Omit<AiRegisterPayload, "password"> & {
  password: string;
};

export type PersonalInfoFieldErrors = Partial<
  Record<"email" | "survey" | "terms", string>
>;

function validatePersonalInfo(
  formData: SignUpFormData,
  termsAccepted: boolean
): PersonalInfoFieldErrors {
  const errors: PersonalInfoFieldErrors = {};

  const email = formData.email.trim();
  if (!email) {
    errors.email = "Email is required.";
  } else if (!EMAIL_RE.test(email)) {
    errors.email = "Enter a valid email address.";
  }

  if (!formData.survey?.trim()) {
    errors.survey = "Please tell us how you heard about us.";
  }

  if (!termsAccepted) {
    errors.terms = "You must agree to the terms to continue.";
  }

  return errors;
}

type Props = {
  formData: SignUpFormData;
  setFormData: React.Dispatch<React.SetStateAction<SignUpFormData>>;
  onNext: () => void;
  step: number;
  /** When true (from `?ref=`), referral code is prefilled and not editable. */
  referralCodeLocked?: boolean;
};

const inputClass =
  "h-11 rounded-xl border-border bg-[#F8F8FA] px-4 font-inter text-[#0A090B] placeholder:text-[#4F4D55]/70 shadow-none";

function RequiredMark() {
  return (
    <span className="text-destructive" aria-hidden="true">
      {" *"}
    </span>
  );
}

export function PersonalInfoStep({
  formData,
  setFormData,
  onNext,
  step,
  referralCodeLocked = false,
}: Props) {
  const [fieldErrors, setFieldErrors] = React.useState<PersonalInfoFieldErrors>({});
  const [termsAccepted, setTermsAccepted] = React.useState(false);

  const clearFieldError = React.useCallback((key: keyof PersonalInfoFieldErrors) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validatePersonalInfo(formData, termsAccepted);

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      const first = Object.values(errors)[0];
      toast.error(
        typeof first === "string"
          ? first
          : "Please fill in all required fields correctly."
      );
      const order: (keyof PersonalInfoFieldErrors)[] = [
        "email",
        "survey",
        "terms",
      ];
      const firstKey = order.find((k) => errors[k]);
      if (firstKey) {
        const idMap: Record<string, string> = {
          email: "su-email",
          survey: "su-hear",
          terms: "su-terms",
        };
        const elId = idMap[firstKey];
        if (elId) {
          requestAnimationFrame(() => {
            document.getElementById(elId)?.scrollIntoView({
              behavior: "smooth",
              block: "center",
            });
          });
        }
      }
      return;
    }

    setFieldErrors({});
    onNext();
  };

  return (
    <AuthShell
      title="Create account"
      subtitle="Step 1 of 2 — enter your email and how you found us."
    >
      <div className="mb-6 flex justify-center gap-2">
        {[1, 2].map((n) => (
          <div
            key={n}
            className={`h-2 w-10 rounded-full transition-colors ${n <= step ? "bg-primary" : "bg-[#E8E8EC]"
              }`}
          />
        ))}
      </div>
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <div className="space-y-2">
          <Label htmlFor="su-email" className="font-inter text-[#0A090B]">
            Email
            <RequiredMark />
          </Label>
          <Input
            id="su-email"
            type="email"
            autoComplete="email"
            placeholder="parent@example.com"
            value={formData.email}
            onChange={(e) => {
              clearFieldError("email");
              setFormData((p) => ({ ...p, email: e.target.value }));
            }}
            aria-invalid={Boolean(fieldErrors.email)}
            className={cn(
              inputClass,
              fieldErrors.email && "border-destructive ring-1 ring-destructive/25"
            )}
          />
          {fieldErrors.email ? (
            <p className="font-inter text-xs text-destructive" role="alert">
              {fieldErrors.email}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="su-hear" className="font-inter text-[#0A090B]">
            How did you hear about us?
            <RequiredMark />
          </Label>
          <Select
            value={formData.survey || undefined}
            onValueChange={(value) => {
              clearFieldError("survey");
              setFormData((p) => ({ ...p, survey: value }));
            }}
          >
            <SelectTrigger
              id="su-hear"
              aria-invalid={Boolean(fieldErrors.survey)}
              className={cn(
                inputClass,
                fieldErrors.survey && "border-destructive ring-1 ring-destructive/25"
              )}
            >
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              {HEAR_ABOUT_US_OPTIONS.map(({ value, label }) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fieldErrors.survey ? (
            <p className="font-inter text-xs text-destructive" role="alert">
              {fieldErrors.survey}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="su-referral" className="font-inter text-[#0A090B]">
            Referral code
            {!referralCodeLocked ? (
              <span className="font-normal text-[#4F4D55]"> (optional)</span>
            ) : null}
          </Label>
          <Input
            id="su-referral"
            autoComplete="off"
            placeholder="KDIW134"
            value={formData.referralCode ?? ""}
            onChange={(e) =>
              setFormData((p) => ({ ...p, referralCode: e.target.value }))
            }
            disabled={referralCodeLocked}
            readOnly={referralCodeLocked}
            className={cn(
              inputClass,
              referralCodeLocked && "cursor-not-allowed opacity-80",
            )}
          />
        </div>

        <div className="space-y-2 pt-1">
          <div className="flex items-start gap-3">
            <input
              id="su-terms"
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => {
                clearFieldError("terms");
                setTermsAccepted(e.target.checked);
              }}
              aria-invalid={Boolean(fieldErrors.terms)}
              className={cn(
                "mt-1 size-4 shrink-0 rounded border-[#E8E8EC] accent-primary",
                fieldErrors.terms && "border-destructive ring-1 ring-destructive/25"
              )}
            />
            <label
              htmlFor="su-terms"
              className="font-inter text-xs leading-relaxed text-[#4F4D55]"
            >
              I agree to the terms and privacy policy for the AI LMS.
              <RequiredMark />
            </label>
          </div>
          {fieldErrors.terms ? (
            <p className="font-inter text-xs text-destructive pl-7" role="alert">
              {fieldErrors.terms}
            </p>
          ) : null}
        </div>
        <Button
          type="submit"
          className="h-12 w-full rounded-xl font-solway text-base font-semibold"
        >
          Continue
        </Button>
        <p className="text-center font-inter text-sm text-[#4F4D55]">
          Already have an account?{" "}
          <Link
            to={PUBLIC_PATHS.LOGIN}
            className="font-semibold text-primary hover:underline"
          >
            Sign in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
