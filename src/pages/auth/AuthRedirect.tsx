import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuthStore } from "@/stores/authStore";
import { validateLoginCode } from "@/utils/loginCode";
import { PRIVATE_PATHS, RYD_PARENT_SIGN_IN_URL } from "@/utils/routePaths";
import type { AxiosError } from "axios";

interface RedirectState {
  loading: boolean;
  error: string | null;
  hasProcessed: boolean;
}

const AuthRedirect = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const code = searchParams.get("code");
  const loginFromParentCode = useAuthStore((s) => s.loginFromParentCode);

  const [state, setState] = useState<RedirectState>({
    loading: true,
    error: null,
    hasProcessed: false,
  });

  const handleLogin = useCallback(
    async (
      decoded: NonNullable<ReturnType<typeof validateLoginCode>["decoded"]>
    ) => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));
        await loginFromParentCode(decoded);
        toast.success("Login successful");
        navigate(PRIVATE_PATHS.DASHBOARD, { replace: true });
      } catch (err: unknown) {
        const ax = err as AxiosError<{ message?: string }>;
        const message =
          ax.response?.data?.message || "Authentication failed";
        toast.error(message);
        setState((prev) => ({
          ...prev,
          loading: false,
          error: message,
        }));
      }
    },
    [loginFromParentCode, navigate]
  );

  const handleRetry = () => {
    setState({
      loading: true,
      error: null,
      hasProcessed: false,
    });
  };

  useEffect(() => {
    if (!code && !state.hasProcessed) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: "No authorization code found in URL",
        hasProcessed: true,
      }));
      return;
    }

    if (code && !state.hasProcessed) {
      const payload = validateLoginCode(code);

      if (!payload.status || !payload.decoded) {
        const errorMsg = "Invalid or expired authorization code";
        toast.error(errorMsg);
        setState((prev) => ({
          ...prev,
          loading: false,
          error: errorMsg,
          hasProcessed: true,
        }));
        return;
      }

      setState((prev) => ({ ...prev, hasProcessed: true }));
      void handleLogin(payload.decoded);
    }
  }, [code, state.hasProcessed, handleLogin]);

  const ErrorIcon = () => (
    <svg
      className="mx-auto mb-4 h-16 w-16 text-destructive"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
      />
    </svg>
  );

  const LoadingSpinner = () => (
    <div
      className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-4 border-primary border-t-transparent"
      aria-hidden
    />
  );

  if (state.error) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="mx-auto max-w-md text-center">
          <ErrorIcon />
          <h2 className="mb-2 text-xl font-semibold text-foreground">
            Authentication error
          </h2>
          <p className="mb-6 text-muted-foreground">{state.error}</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={handleRetry}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Try again
            </button>
            <a
              href={RYD_PARENT_SIGN_IN_URL}
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              Sign in on RYD
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="text-center">
        <LoadingSpinner />
        <p className="text-muted-foreground">
          {state.loading ? "Signing you in…" : "Processing…"}
        </p>
        <p className="mt-2 text-sm text-muted-foreground/80">
          Please wait while we verify your credentials
        </p>
      </div>
    </div>
  );
};

export default AuthRedirect;
