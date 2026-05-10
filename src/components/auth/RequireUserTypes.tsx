import { useEffect, useRef, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuthStore } from "@/stores/authStore";
import { PRIVATE_PATHS } from "@/utils/routePaths";
import { userHasAllowedType } from "@/auth/accessControl";

export interface RequireUserTypesProps {
  /** Only these `user.userType` values (API casing; matched case-insensitively) may render `children`. */
  allowed: readonly string[];
  children: ReactNode;
  /** Where to send users who are logged in but not allowed. */
  redirectTo?: string;
  /** Optional toast when access is denied (shown once per mount). */
  deniedToast?: string;
}

/**
 * Route-level guard for logged-in users: restricts content by `user.userType`.
 * Use inside private routes only (caller should already ensure authentication).
 */
export function RequireUserTypes({
  allowed,
  children,
  redirectTo = PRIVATE_PATHS.DASHBOARD,
  deniedToast = "You don't have access to this page.",
}: RequireUserTypesProps) {
  const user = useAuthStore((s) => s.user);
  const ok = userHasAllowedType(user, allowed);
  const toastShown = useRef(false);

  useEffect(() => {
    if (!ok && deniedToast && !toastShown.current) {
      toastShown.current = true;
      toast.error(deniedToast);
    }
  }, [ok, deniedToast]);

  if (!ok) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
