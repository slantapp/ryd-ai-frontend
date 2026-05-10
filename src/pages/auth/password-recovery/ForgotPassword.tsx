import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import type { AxiosError } from "axios";
import { Mail } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/stores/authStore";
import { PUBLIC_PATHS } from "@/utils/routePaths";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const requestPasswordReset = useAuthStore((s) => s.requestPasswordReset);
  const [email, setEmail] = useState("");
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [step, setStep] = useState<"form" | "success">("form");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    setLoading(true);
    try {
      await requestPasswordReset(trimmed);
      setSubmittedEmail(trimmed);
      setStep("success");
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

  const goToSignIn = () => {
    navigate(PUBLIC_PATHS.LOGIN, {
      state: submittedEmail ? { email: submittedEmail } : undefined,
    });
  };

  const inputClass =
    "h-12 rounded-xl border-[#E8E8EC] bg-[#F8F8FA] px-4 font-inter text-[#0A090B] placeholder:text-[#4F4D55]/70";

  if (step === "success") {
    return (
      <AuthShell
        title="Check your email"
        subtitle="We’ve sent something to your inbox so you can get back into your account."
      >
        <div className="space-y-6">
          <div className="flex justify-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Mail className="size-8" aria-hidden />
            </div>
          </div>

          <div className="rounded-xl bg-[#F8F8FA] p-5 font-inter text-sm text-[#0A090B] ring-1 ring-[#E8E8EC]">
            <p className="font-medium text-[#0A090B]">What to do next</p>
            <ol className="mt-3 list-decimal space-y-3 pl-5 text-[#4F4D55]">
              <li>
                Open the email we sent
                {submittedEmail ? (
                  <>
                    {" "}
                    to <span className="font-medium text-[#0A090B]">{submittedEmail}</span>
                  </>
                ) : null}
                .
              </li>
              <li>
                Use the <strong className="font-semibold text-[#0A090B]">temporary password or code</strong>{" "}
                from that email to sign in (same email field as usual).
              </li>
              <li>
                After you’re signed in, go to{" "}
                <strong className="font-semibold text-[#0A090B]">Settings</strong> →{" "}
                <strong className="font-semibold text-[#0A090B]">Change Password</strong>{" "}
                to set a new password you’ll use from now on.
              </li>
            </ol>
          </div>

          <Button
            type="button"
            onClick={goToSignIn}
            className="h-12 w-full rounded-xl font-solway text-base font-semibold"
          >
            Continue to sign in
          </Button>

          <p className="text-center font-inter text-sm text-[#4F4D55]">
            Wrong address?{" "}
            <button
              type="button"
              onClick={() => {
                setStep("form");
                setSubmittedEmail("");
              }}
              className="font-semibold text-primary hover:underline"
            >
              Use a different email
            </button>
          </p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Reset password"
      subtitle="Enter your account email. We’ll send a temporary password or code — sign in with it, then set a new password under Settings → Change Password."
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
          {loading ? "Sending…" : "Send reset email"}
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
