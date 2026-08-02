import * as React from "react";
import { toast } from "react-toastify";
import type { AxiosError } from "axios";
import { Eye, EyeOff } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
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
import { HEAR_ABOUT_US_OPTIONS } from "@/data/signupReferralSources";
import { cn } from "@/lib/utils";
import type { AiRegisterPayload } from "@/stores/authStore";
import { useAuthStore } from "@/stores/authStore";
import { useLocationDefaultsStore } from "@/stores/locationDefaultsStore";
import { isEmailAlreadyRegisteredError, getErrorMessage } from "@/utils/authErrors";
import { PRIVATE_PATHS, PUBLIC_PATHS } from "@/utils/routePaths";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

export type SignUpFormData = Omit<AiRegisterPayload, "password"> & {
  password: string;
};

export type SignUpFieldErrors = Partial<
  Record<"email" | "survey" | "password" | "confirmPassword" | "terms", string>
>;

function validateSignUp(
  formData: SignUpFormData,
  confirmPassword: string,
  termsAccepted: boolean,
): SignUpFieldErrors {
  const errors: SignUpFieldErrors = {};

  const email = formData.email.trim();
  if (!email) {
    errors.email = "Email is required.";
  } else if (!EMAIL_RE.test(email)) {
    errors.email = "Enter a valid email address.";
  }

  if (!formData.survey?.trim()) {
    errors.survey = "Please tell us how you heard about us.";
  }

  const password = formData.password;
  if (!password.trim()) {
    errors.password = "Password is required.";
  } else if (password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }

  if (!confirmPassword.trim()) {
    errors.confirmPassword = "Please confirm your password.";
  } else if (password !== confirmPassword) {
    errors.confirmPassword = "Passwords must match.";
  }

  if (!termsAccepted) {
    errors.terms = "You must agree to the terms to continue.";
  }

  return errors;
}

type Props = {
  formData: SignUpFormData;
  setFormData: React.Dispatch<React.SetStateAction<SignUpFormData>>;
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
  referralCodeLocked = false,
}: Props) {
  const navigate = useNavigate();
  const register = useAuthStore((s) => s.register);
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPw, setShowPw] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [fieldErrors, setFieldErrors] = React.useState<SignUpFieldErrors>({});
  const [termsAccepted, setTermsAccepted] = React.useState(false);

  const clearFieldError = React.useCallback((key: keyof SignUpFieldErrors) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateSignUp(formData, confirmPassword, termsAccepted);

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      const first = Object.values(errors)[0];
      toast.error(
        typeof first === "string"
          ? first
          : "Please fill in all required fields correctly.",
      );
      const order: (keyof SignUpFieldErrors)[] = [
        "email",
        "password",
        "confirmPassword",
        "survey",
        "terms",
      ];
      const firstKey = order.find((k) => errors[k]);
      if (firstKey) {
        const idMap: Record<string, string> = {
          email: "su-email",
          survey: "su-hear",
          password: "su-pw",
          confirmPassword: "su-pw2",
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
    setLoading(true);
    try {
      const location = await useLocationDefaultsStore
        .getState()
        .ensureCountryForCheckout();
      await register({
        email: formData.email.trim(),
        password: formData.password,
        survey: formData.survey?.trim() || undefined,
        referralCode: formData.referralCode?.trim() || undefined,
        country: location.country?.trim() || undefined,
      });
      toast.success("Account created — welcome!");
      navigate(PRIVATE_PATHS.DASHBOARD, { replace: true });
    } catch (err) {
      const ax = err as AxiosError<{ message?: string; status?: boolean }>;
      const errorMessage = getErrorMessage(err, "Registration failed");
      toast.error(errorMessage);

      if (
        isEmailAlreadyRegisteredError(ax.response?.status, errorMessage)
      ) {
        navigate(PUBLIC_PATHS.LOGIN, {
          replace: true,
          state: {
            email: formData.email.trim(),
          },
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Create account"
      subtitle="Sign up free and try a real AI lesson right away — no subscription needed to start your sneak peek."
    >
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
              fieldErrors.email && "border-destructive ring-1 ring-destructive/25",
            )}
          />
          {fieldErrors.email ? (
            <p className="font-inter text-xs text-destructive" role="alert">
              {fieldErrors.email}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="su-pw" className="font-inter text-[#0A090B]">
            Password
            <RequiredMark />
          </Label>
          <div className="relative">
            <Input
              id="su-pw"
              type={showPw ? "text" : "password"}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              value={formData.password}
              onChange={(e) => {
                clearFieldError("password");
                setFormData((p) => ({ ...p, password: e.target.value }));
              }}
              aria-invalid={Boolean(fieldErrors.password)}
              className={cn(
                inputClass,
                "pr-11",
                fieldErrors.password &&
                "border-destructive ring-1 ring-destructive/25",
              )}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4F4D55]"
              onClick={() => setShowPw((v) => !v)}
              aria-label={showPw ? "Hide password" : "Show password"}
            >
              {showPw ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
            </button>
          </div>
          {fieldErrors.password ? (
            <p className="font-inter text-xs text-destructive" role="alert">
              {fieldErrors.password}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="su-pw2" className="font-inter text-[#0A090B]">
            Confirm password
            <RequiredMark />
          </Label>
          <Input
            id="su-pw2"
            type={showPw ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => {
              clearFieldError("confirmPassword");
              setConfirmPassword(e.target.value);
            }}
            aria-invalid={Boolean(fieldErrors.confirmPassword)}
            className={cn(
              inputClass,
              fieldErrors.confirmPassword &&
              "border-destructive ring-1 ring-destructive/25",
            )}
          />
          {fieldErrors.confirmPassword ? (
            <p className="font-inter text-xs text-destructive" role="alert">
              {fieldErrors.confirmPassword}
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
                fieldErrors.survey &&
                "border-destructive ring-1 ring-destructive/25",
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
                fieldErrors.terms && "border-destructive ring-1 ring-destructive/25",
              )}
            />
            <label
              htmlFor="su-terms"
              className="font-inter text-xs leading-relaxed text-[#4F4D55]"
            >
              I agree to the{" "}
              <Link
                to={PUBLIC_PATHS.TERMS}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-primary hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                Terms of Service & Privacy Policy
              </Link>
              .
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
          disabled={loading}
          className="h-12 w-full rounded-xl font-solway text-base font-semibold"
        >
          {loading ? "Creating…" : "Create account"}
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
