import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import type { AxiosError } from "axios";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/stores/authStore";
import { PUBLIC_PATHS } from "@/utils/routePaths";
import { PASSWORD_RESET_EMAIL_KEY } from "@/utils/passwordResetSession";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const requestPasswordReset = useAuthStore((s) => s.requestPasswordReset);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    setLoading(true);
    try {
      await requestPasswordReset(trimmed);
      sessionStorage.setItem(PASSWORD_RESET_EMAIL_KEY, trimmed);
      toast.success(
        "Check your email — use the temporary code we sent to set a new password."
      );
      navigate(PUBLIC_PATHS.RESET_PASSWORD, {
        replace: true,
        state: { email: trimmed },
      });
    } catch (err) {
      const ax = err as AxiosError<{ message?: string }>;
      const msg =
        ax.response?.data?.message ||
        (err instanceof Error ? err.message : "Request failed");
      toast.error(typeof msg === "string" ? msg : "Request failed");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "h-12 rounded-xl border-[#E8E8EC] bg-[#F8F8FA] px-4 font-inter text-[#0A090B] placeholder:text-[#4F4D55]/70";

  return (
    <AuthShell
      title="Reset password"
      subtitle="Enter your account email. We’ll send a temporary code — then you’ll choose a new password on the next step."
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="fp-email" className="font-inter text-[#0A090B]">
            Email
          </Label>
          <Input
            id="fp-email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </div>
        <Button
          type="submit"
          disabled={loading}
          className="h-12 w-full rounded-xl font-solway text-base font-semibold"
        >
          {loading ? "Sending…" : "Send temporary code"}
        </Button>
        <p className="text-center font-inter text-sm text-[#4F4D55]">
          <Link
            to={PUBLIC_PATHS.LOGIN}
            className="font-semibold text-primary hover:underline"
          >
            Back to sign in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
