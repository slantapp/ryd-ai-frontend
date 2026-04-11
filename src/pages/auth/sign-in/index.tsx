import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import type { AxiosError } from "axios";
import { Eye, EyeOff } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/stores/authStore";
import { PRIVATE_PATHS, PUBLIC_PATHS } from "@/utils/routePaths";

export default function SignInPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isLoggedIn) {
      navigate(PRIVATE_PATHS.DASHBOARD, { replace: true });
    }
  }, [isLoggedIn, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email.trim(), password);
      toast.success("Welcome back!");
      navigate(PRIVATE_PATHS.DASHBOARD, { replace: true });
    } catch (err) {
      const ax = err as AxiosError<{ message?: string }>;
      const msg =
        ax.response?.data?.message ||
        (err instanceof Error ? err.message : "Sign in failed");
      toast.error(typeof msg === "string" ? msg : "Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "h-12 rounded-xl border-[#E8E8EC] bg-[#F8F8FA] px-4 font-inter text-[#0A090B] placeholder:text-[#4F4D55]/70";

  return (
    <AuthShell
      title="Sign in"
      subtitle="Use your AI LMS parent account to continue."
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="ai-email" className="font-inter text-[#0A090B]">
            Email
          </Label>
          <Input
            id="ai-email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="ai-password" className="font-inter text-[#0A090B]">
              Password
            </Label>
            <Link
              to={PUBLIC_PATHS.FORGOT_PASSWORD}
              className="font-inter text-xs font-medium text-[#0063F7] hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="ai-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${inputClass} pr-11`}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4F4D55] hover:text-[#0A090B]"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
            </button>
          </div>
        </div>
        <Button
          type="submit"
          disabled={loading}
          className="h-12 w-full rounded-xl font-solway text-base font-semibold"
        >
          {loading ? "Signing in…" : "Sign in"}
        </Button>
        <p className="text-center font-inter text-sm text-[#4F4D55]">
          New here?{" "}
          <Link
            to={PUBLIC_PATHS.SIGN_UP}
            className="font-semibold text-primary hover:underline"
          >
            Create an account
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
