import { useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import type { AxiosError } from "axios";
import { useAuthStore } from "@/stores/authStore";
import { PRIVATE_PATHS } from "@/utils/routePaths";
import type { SignUpFormData } from "./PersonalInfoStep";

type Props = {
  formData: SignUpFormData;
  setFormData: React.Dispatch<React.SetStateAction<SignUpFormData>>;
  onBack: () => void;
  step: number;
};

const inputClass =
  "h-11 rounded-xl border-[#E8E8EC] bg-[#F8F8FA] px-4 font-inter text-[#0A090B] placeholder:text-[#4F4D55]/70";

const MIN_PASSWORD_LENGTH = 8;

type PasswordFieldErrors = Partial<Record<"password" | "confirmPassword", string>>;

function validatePasswordStep(
  password: string,
  confirm: string
): PasswordFieldErrors {
  const errors: PasswordFieldErrors = {};

  if (!password.trim()) {
    errors.password = "Password is required.";
  } else if (password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }

  if (!confirm.trim()) {
    errors.confirmPassword = "Please confirm your password.";
  } else if (password !== confirm) {
    errors.confirmPassword = "Passwords must match.";
  }

  return errors;
}

export function PasswordStep({ formData, setFormData, onBack, step }: Props) {
  const navigate = useNavigate();
  const register = useAuthStore((s) => s.register);
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<PasswordFieldErrors>({});

  const clearFieldError = (key: keyof PasswordFieldErrors) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validatePasswordStep(formData.password, confirm);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      const first = Object.values(errors)[0];
      toast.error(
        typeof first === "string" ? first : "Please fix the errors below."
      );
      const firstKey = errors.password ? "su-pw" : "su-pw2";
      requestAnimationFrame(() => {
        document.getElementById(firstKey)?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      });
      return;
    }

    setFieldErrors({});
    setLoading(true);
    try {
      const { password, ...rest } = formData;
      await register({
        ...rest,
        password,
      });
      toast.success("Account created — welcome!");
      navigate(PRIVATE_PATHS.DASHBOARD, { replace: true });
    } catch (err) {
      const ax = err as AxiosError<{ message?: string }>;
      const msg =
        ax.response?.data?.message ||
        (err instanceof Error ? err.message : "Registration failed");
      toast.error(typeof msg === "string" ? msg : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Secure your account"
      subtitle="Step 2 of 2 — choose a strong password."
    >
      <div className="mb-6 flex justify-center gap-2">
        {[1, 2].map((n) => (
          <div
            key={n}
            className={`h-2 w-10 rounded-full transition-colors ${
              n <= step ? "bg-primary" : "bg-[#E8E8EC]"
            }`}
          />
        ))}
      </div>
      <form className="space-y-5" onSubmit={handleSubmit} noValidate>
        <div className="space-y-2">
          <Label htmlFor="su-pw" className="font-inter text-[#0A090B]">
            Password
          </Label>
          <div className="relative">
            <Input
              id="su-pw"
              type={showPw ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Test@12345"
              value={formData.password}
              onChange={(e) => {
                clearFieldError("password");
                setFormData((p) => ({ ...p, password: e.target.value }));
              }}
              aria-invalid={Boolean(fieldErrors.password)}
              className={cn(
                inputClass,
                "pr-11",
                fieldErrors.password && "border-destructive ring-1 ring-destructive/25"
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
          </Label>
          <Input
            id="su-pw2"
            type={showPw ? "text" : "password"}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => {
              clearFieldError("confirmPassword");
              setConfirm(e.target.value);
            }}
            aria-invalid={Boolean(fieldErrors.confirmPassword)}
            className={cn(
              inputClass,
              fieldErrors.confirmPassword &&
                "border-destructive ring-1 ring-destructive/25"
            )}
          />
          {fieldErrors.confirmPassword ? (
            <p className="font-inter text-xs text-destructive" role="alert">
              {fieldErrors.confirmPassword}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-xl font-inter"
            onClick={onBack}
            disabled={loading}
          >
            Back
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="h-11 flex-1 rounded-xl font-solway font-semibold sm:max-w-[12rem]"
          >
            {loading ? "Creating…" : "Create account"}
          </Button>
        </div>
      </form>
    </AuthShell>
  );
}
