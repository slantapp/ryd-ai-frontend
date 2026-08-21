import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import type { AxiosError } from "axios";
import { Eye, EyeOff } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";

const MIN_LEN = 5;

type FieldErrors = {
  passwordOld?: string;
  password1?: string;
  password2?: string;
};

const inputClass =
  "h-11 rounded-xl border-border bg-[#F8F8FA] px-4 font-inter text-[#0A090B] placeholder:text-[#4F4D55]/70 shadow-none";

function validate(
  passwordOld: string,
  password1: string,
  password2: string,
): FieldErrors {
  const errors: FieldErrors = {};
  if (!passwordOld.trim()) {
    errors.passwordOld = "Enter the temporary password from your email.";
  }
  if (password1.length < MIN_LEN) {
    errors.password1 = `New password must be at least ${MIN_LEN} characters.`;
  }
  if (password2.length < MIN_LEN) {
    errors.password2 = `Confirm password must be at least ${MIN_LEN} characters.`;
  } else if (password1 !== password2) {
    errors.password2 = "New passwords must match.";
  }
  return errors;
}

type PasswordResetGateProps = {
  open: boolean;
  onComplete?: () => void;
  onSignOut: () => void;
};

/**
 * Blocking dialog after password-reset login — parents must set a new password
 * before using the rest of the app.
 */
export default function PasswordResetGate({
  open,
  onComplete,
  onSignOut,
}: PasswordResetGateProps) {
  const updatePassword = useAuthStore((s) => s.updatePassword);
  const [passwordOld, setPasswordOld] = useState("");
  const [password1, setPassword1] = useState("");
  const [password2, setPassword2] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPasswordOld("");
    setPassword1("");
    setPassword2("");
    setShowOld(false);
    setShowNew(false);
    setFieldErrors({});
  }, [open]);

  const clearFieldError = (key: keyof FieldErrors) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validate(passwordOld, password1, password2);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      const first = Object.values(errors)[0];
      toast.error(typeof first === "string" ? first : "Please check your passwords.");
      return;
    }

    setFieldErrors({});
    setLoading(true);
    try {
      await updatePassword({ passwordOld, password1, password2 });
      toast.success("Password updated — you're all set!");
      onComplete?.();
    } catch (err) {
      const ax = err as AxiosError<{ message?: string }>;
      const msg =
        ax.response?.data?.message ||
        (err instanceof Error ? err.message : "Could not update password");
      toast.error(typeof msg === "string" ? msg : "Could not update password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) return;
        // Blocking — ignore dismiss attempts.
      }}
    >
      <DialogContent
        showCloseButton={false}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        className="z-110 max-w-md rounded-2xl"
        overlayClassName="z-110"
      >
        <DialogHeader>
          <DialogTitle className="font-solway">Update your password</DialogTitle>
          <DialogDescription className="font-inter">
            You signed in with a temporary password. Choose a new password
            before continuing.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <div className="space-y-2">
            <Label htmlFor="prg-passwordOld" className="font-inter text-[#0A090B]">
              Temporary password
            </Label>
            <div className="relative">
              <Input
                id="prg-passwordOld"
                type={showOld ? "text" : "password"}
                autoComplete="current-password"
                value={passwordOld}
                onChange={(e) => {
                  clearFieldError("passwordOld");
                  setPasswordOld(e.target.value);
                }}
                aria-invalid={Boolean(fieldErrors.passwordOld)}
                className={cn(
                  inputClass,
                  "pr-11",
                  fieldErrors.passwordOld &&
                    "border-destructive ring-1 ring-destructive/25",
                )}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4F4D55]"
                onClick={() => setShowOld((v) => !v)}
                aria-label={showOld ? "Hide password" : "Show password"}
              >
                {showOld ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
              </button>
            </div>
            {fieldErrors.passwordOld ? (
              <p className="font-inter text-xs text-destructive" role="alert">
                {fieldErrors.passwordOld}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="prg-password1" className="font-inter text-[#0A090B]">
              New password
            </Label>
            <div className="relative">
              <Input
                id="prg-password1"
                type={showNew ? "text" : "password"}
                autoComplete="new-password"
                value={password1}
                onChange={(e) => {
                  clearFieldError("password1");
                  clearFieldError("password2");
                  setPassword1(e.target.value);
                }}
                aria-invalid={Boolean(fieldErrors.password1)}
                className={cn(
                  inputClass,
                  "pr-11",
                  fieldErrors.password1 &&
                    "border-destructive ring-1 ring-destructive/25",
                )}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4F4D55]"
                onClick={() => setShowNew((v) => !v)}
                aria-label={showNew ? "Hide password" : "Show password"}
              >
                {showNew ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
              </button>
            </div>
            {fieldErrors.password1 ? (
              <p className="font-inter text-xs text-destructive" role="alert">
                {fieldErrors.password1}
              </p>
            ) : (
              <p className="font-inter text-xs text-[#4F4D55]">
                At least {MIN_LEN} characters.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="prg-password2" className="font-inter text-[#0A090B]">
              Confirm new password
            </Label>
            <Input
              id="prg-password2"
              type={showNew ? "text" : "password"}
              autoComplete="new-password"
              value={password2}
              onChange={(e) => {
                clearFieldError("password2");
                setPassword2(e.target.value);
              }}
              aria-invalid={Boolean(fieldErrors.password2)}
              className={cn(
                inputClass,
                fieldErrors.password2 &&
                  "border-destructive ring-1 ring-destructive/25",
              )}
            />
            {fieldErrors.password2 ? (
              <p className="font-inter text-xs text-destructive" role="alert">
                {fieldErrors.password2}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onSignOut}
              disabled={loading}
            >
              Sign out
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Updating…" : "Update password"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
