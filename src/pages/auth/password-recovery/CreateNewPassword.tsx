import { Navigate } from "react-router-dom";
import { PUBLIC_PATHS } from "@/utils/routePaths";

/** Legacy route: password is now changed after login in Settings. */
export default function ResetPasswordRedirectPage() {
  return <Navigate to={PUBLIC_PATHS.LOGIN} replace />;
}
