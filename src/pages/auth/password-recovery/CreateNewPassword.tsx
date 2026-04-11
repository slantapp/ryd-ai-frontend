import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import type { AxiosError } from "axios";
import { Eye, EyeOff } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/stores/authStore";
import { PUBLIC_PATHS } from "@/utils/routePaths";
import { PASSWORD_RESET_EMAIL_KEY } from "@/utils/passwordResetSession";

type LocationState = { email?: string };

export default function CreateNewPasswordPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const completePasswordReset = useAuthStore((s) => s.completePasswordReset);

  const stateEmail = (location.state as LocationState | null)?.email?.trim();
  const storedEmail =
    typeof sessionStorage !== "undefined"
      ? sessionStorage.getItem(PASSWORD_RESET_EMAIL_KEY)?.trim() ?? ""
      : "";

  const [email, setEmail] = useState(
    () => stateEmail || storedEmail || ""
  );
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mismatch, setMismatch] = useState(false);

  const inputClass =
    "h-12 rounded-xl border-[#E8E8EC] bg-[#F8F8FA] px-4 font-inter text-[#0A090B] placeholder:text-[#4F4D55]/70";

  const hasEmailContext = Boolean(email.trim() || storedEmail || stateEmail);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      toast.error("Enter the email you used to request the code.");
      return;
    }
    if (!code.trim()) {
      toast.error("Enter the temporary code from your email.");
      return;
    }
    if (password !== confirm) {
      setMismatch(true);
      return;
    }
    setMismatch(false);
    setLoading(true);
    try {
      await completePasswordReset({
        email: trimmedEmail,
        code: code.trim(),
        password,
      });
      sessionStorage.removeItem(PASSWORD_RESET_EMAIL_KEY);
      toast.success("Password updated — you can sign in now.");
      navigate(PUBLIC_PATHS.LOGIN, { replace: true });
    } catch (err) {
      const ax = err as AxiosError<{ message?: string }>;
      const msg =
        ax.response?.data?.message ||
        (err instanceof Error ? err.message : "Reset failed");
      toast.error(typeof msg === "string" ? msg : "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  if (!hasEmailContext) {
    return (
      <AuthShell
        title="New password"
        subtitle="Start by requesting a reset code from your email."
      >
        <div className="rounded-xl bg-amber-50 p-4 font-inter text-sm text-amber-950 ring-1 ring-amber-200">
          Request a temporary code first, then you&apos;ll land here automatically
          to set your new password.
        </div>
        <Button
          type="button"
          className="mt-4 h-12 w-full rounded-xl font-solway font-semibold"
          onClick={() => navigate(PUBLIC_PATHS.FORGOT_PASSWORD)}
        >
          Request reset code
        </Button>
        <p className="mt-6 text-center font-inter text-sm text-[#4F4D55]">
          <Link
            to={PUBLIC_PATHS.LOGIN}
            className="font-semibold text-primary hover:underline"
          >
            Back to sign in
          </Link>
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create new password"
      subtitle="Paste the temporary code from your email, then choose a new password."
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="np-email" className="font-inter text-[#0A090B]">
            Email
          </Label>
          <Input
            id="np-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
          <p className="font-inter text-xs text-[#4F4D55]">
            Should match the address you used on the previous step.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="np-code" className="font-inter text-[#0A090B]">
            Temporary code from email
          </Label>
          <Input
            id="np-code"
            type="text"
            required
            autoComplete="one-time-code"
            placeholder="Enter the code from your email"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="np-pw" className="font-inter text-[#0A090B]">
            New password
          </Label>
          <div className="relative">
            <Input
              id="np-pw"
              type={show ? "text" : "password"}
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${inputClass} pr-11`}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4F4D55]"
              onClick={() => setShow((v) => !v)}
              aria-label={show ? "Hide password" : "Show password"}
            >
              {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
            </button>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="np-pw2" className="font-inter text-[#0A090B]">
            Confirm password
          </Label>
          <Input
            id="np-pw2"
            type={show ? "text" : "password"}
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => {
              setConfirm(e.target.value);
              setMismatch(false);
            }}
            className={inputClass}
          />
          {mismatch ? (
            <p className="font-inter text-xs text-destructive">
              Passwords must match.
            </p>
          ) : null}
        </div>
        <Button
          type="submit"
          disabled={loading}
          className="h-12 w-full rounded-xl font-solway text-base font-semibold"
        >
          {loading ? "Saving…" : "Update password"}
        </Button>
        <p className="text-center font-inter text-sm text-[#4F4D55]">
          Wrong email?{" "}
          <Link
            to={PUBLIC_PATHS.FORGOT_PASSWORD}
            className="font-semibold text-primary hover:underline"
          >
            Start over
          </Link>
          {" · "}
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
