import { useState, useCallback } from "react";
import { toast } from "react-toastify";
import type { AxiosError } from "axios";
import { Eye, EyeOff } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/stores/authStore";

const MIN_LEN = 5;

type FieldErrors = {
  passwordOld?: string;
  password1?: string;
  password2?: string;
};

function validate(
  passwordOld: string,
  password1: string,
  password2: string,
): FieldErrors {
  const errors: FieldErrors = {};
  if (!passwordOld.trim()) {
    errors.passwordOld = "Enter your current password.";
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

const PasswordContent = () => {
  const updatePassword = useAuthStore((s) => s.updatePassword);

  const [passwordOld, setPasswordOld] = useState("");
  const [password1, setPassword1] = useState("");
  const [password2, setPassword2] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);

  const clearField = useCallback((key: keyof FieldErrors) => {
    setErrors((e) => {
      const next = { ...e };
      delete next[key];
      return next;
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next = validate(passwordOld, password1, password2);
    setErrors(next);
    const firstKey = Object.keys(next)[0] as keyof FieldErrors | undefined;
    if (firstKey) {
      const msg = next[firstKey];
      if (msg) toast.error(msg);
      document.getElementById(`pw-${firstKey}`)?.scrollIntoView({ block: "center" });
      return;
    }

    setLoading(true);
    try {
      await updatePassword({ passwordOld, password1, password2 });
      toast.success("Password updated successfully.");
      setPasswordOld("");
      setPassword1("");
      setPassword2("");
      setErrors({});
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

  const inputClass =
    "h-12 rounded-xl border-[#E8E8EC] bg-[#F8F8FA] px-4 font-inter text-[#0A090B] placeholder:text-[#4F4D55]/70";

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold font-solway text-gray-900">
        Change password
      </h2>
      <p className="text-sm text-gray-600">
        If you signed in with a temporary password from email, enter that as
        your current password, then choose your new password below.
      </p>

      <Card className="rounded-2xl shadow-none border-none">
        <CardContent className="p-0">
          <form
            onSubmit={handleSubmit}
            className="space-y-5 rounded-[20px] p-6 sm:p-8"
            noValidate
          >
            <div className="space-y-2">
              <Label htmlFor="pw-passwordOld" className="font-inter text-[#0A090B]">
                Current password
              </Label>
              <div className="relative">
                <Input
                  id="pw-passwordOld"
                  type={showOld ? "text" : "password"}
                  autoComplete="current-password"
                  value={passwordOld}
                  onChange={(e) => {
                    setPasswordOld(e.target.value);
                    clearField("passwordOld");
                  }}
                  className={`${inputClass} pr-11 ${errors.passwordOld ? "border-destructive ring-1 ring-destructive/30" : ""}`}
                  aria-invalid={Boolean(errors.passwordOld)}
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
              {errors.passwordOld ? (
                <p className="text-xs text-destructive">{errors.passwordOld}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="pw-password1" className="font-inter text-[#0A090B]">
                New password
              </Label>
              <div className="relative">
                <Input
                  id="pw-password1"
                  type={showNew ? "text" : "password"}
                  autoComplete="new-password"
                  value={password1}
                  onChange={(e) => {
                    setPassword1(e.target.value);
                    clearField("password1");
                    clearField("password2");
                  }}
                  className={`${inputClass} pr-11 ${errors.password1 ? "border-destructive ring-1 ring-destructive/30" : ""}`}
                  aria-invalid={Boolean(errors.password1)}
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
              {errors.password1 ? (
                <p className="text-xs text-destructive">{errors.password1}</p>
              ) : (
                <p className="text-xs text-[#4F4D55]">At least {MIN_LEN} characters.</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="pw-password2" className="font-inter text-[#0A090B]">
                Confirm new password
              </Label>
              <Input
                id="pw-password2"
                type={showNew ? "text" : "password"}
                autoComplete="new-password"
                value={password2}
                onChange={(e) => {
                  setPassword2(e.target.value);
                  clearField("password2");
                }}
                className={`${inputClass} ${errors.password2 ? "border-destructive ring-1 ring-destructive/30" : ""}`}
                aria-invalid={Boolean(errors.password2)}
              />
              {errors.password2 ? (
                <p className="text-xs text-destructive">{errors.password2}</p>
              ) : null}
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="h-12 w-full max-w-xs rounded-xl font-solway text-base font-semibold"
            >
              {loading ? "Updating…" : "Update password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default PasswordContent;
