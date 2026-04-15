import { type ReactNode, useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import SideNav from "./SideNav";
import TopNav from "./TopNav";
import { cn } from "@/lib/utils";
import SubscriptionGateFlow from "@/components/subscription/SubscriptionGateFlow";
import { loadSubscription } from "@/utils/subscriptionSession";
import { useAuthStore } from "@/stores/authStore";
import { PUBLIC_PATHS } from "@/utils/routePaths";

interface DashboardProps {
  children?: ReactNode;
}

const DashboardLayout = ({ children }: DashboardProps) => {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const closeMobileNav = useCallback(() => setMobileNavOpen(false), []);
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);

  const [hasActiveSubscription, setHasActiveSubscription] = useState(
    () => loadSubscription() !== null
  );

  const showSubscriptionGate = !hasActiveSubscription;

  const handleSubscriptionComplete = useCallback(() => {
    setHasActiveSubscription(true);
  }, []);

  const handleSignOutFromGate = useCallback(() => {
    logout();
    navigate(PUBLIC_PATHS.LOGIN, { replace: true });
  }, [logout, navigate]);

  return (
    <div className="flex h-screen flex-col items-stretch gap-4 overflow-hidden bg-white bg-[url('/images/auth-bg.png')] bg-cover bg-center bg-no-repeat">
      <TopNav onOpenMobileNav={() => setMobileNavOpen(true)} />
      <div className="relative md:mt-24 mt-20 flex h-full min-h-0 w-full gap-4 overflow-hidden rounded-t-2xl px-3 pb-6 transition-all duration-300 ease-in-out sm:px-4 sm:pb-4">
        <SideNav
          mobileNavOpen={mobileNavOpen}
          onMobileNavClose={closeMobileNav}
        />
        <div
          className={cn(
            "min-h-0 w-full min-w-0 flex-1 overflow-y-auto rounded-[20px] bg-white p-3 shadow-lg scrollbar-hide sm:p-4 lg:ml-[19rem]",
            mobileNavOpen && "max-lg:overflow-hidden",
          )}
          inert={showSubscriptionGate ? true : undefined}
        >
          {children}
        </div>
      </div>

      <SubscriptionGateFlow
        open={showSubscriptionGate}
        onSubscriptionComplete={handleSubscriptionComplete}
        onSignOut={handleSignOutFromGate}
      />
    </div>
  );
};

export default DashboardLayout;
