import AuthGuard from "../lib/AuthGuard";
import { PRIVATE_ROUTES, PUBLIC_ROUTES } from "./routes";
import { useRoutes, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import AuthLayout from "@/layout/AuthLayout";
import DashboardLayout from "@/layout/dashboardLayout";

const PublicRouteWrapper = () => {
  const routes = useRoutes(PUBLIC_ROUTES);
  return routes;
};
const PrivateRouteWrapper = () => {
  const routes = useRoutes(PRIVATE_ROUTES);
  return routes;
};

const Pages = () => {
  const location = useLocation();
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);

  return isLoggedIn ? (
    <AuthGuard>
      <DashboardLayout>
        <PrivateRouteWrapper key={location.pathname} />
      </DashboardLayout>
    </AuthGuard>
  ) : (
    <AuthLayout>
      <PublicRouteWrapper key={location.pathname} />
    </AuthLayout>
  );
};

export default Pages;
