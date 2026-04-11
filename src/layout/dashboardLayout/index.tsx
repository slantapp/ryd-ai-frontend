import { type ReactNode, useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import SideNav from "./SideNav";
import TopNav from "./TopNav";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import SubscriptionContent from "@/components/settings/SubscriptionContent";
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

      <Dialog
        open={showSubscriptionGate}
        onOpenChange={(open) => {
          if (open) return;
        }}
      >
        <DialogContent
          showCloseButton={false}
          className={cn(
            "flex flex-col gap-0 overflow-hidden border-0 p-0 shadow-xl",
            // Mobile: below status bar, use dynamic viewport & safe areas
            "top-[max(0.5rem,env(safe-area-inset-top,0px))] max-h-[calc(100dvh-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px)-0.75rem)] w-[calc(100vw-1rem)] max-w-4xl translate-y-0 rounded-xl",
            // Tablet portrait: a bit more margin; still top-anchored until sm centering
            "min-[480px]:w-[calc(100vw-1.25rem)] min-[480px]:max-w-4xl",
            // Tablet landscape & up: vertically centered, taller usable height
            "sm:top-1/2 sm:max-h-[min(calc(100dvh-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px)-1.5rem),920px)] sm:w-[min(calc(100vw-1.5rem),56rem)] sm:max-w-[min(calc(100vw-1.5rem),56rem)] sm:-translate-y-1/2 sm:rounded-2xl",
            "md:w-[min(calc(100vw-2rem),56rem)] md:max-w-[min(calc(100vw-2rem),56rem)]",
            // Large tablet / desktop
            "lg:max-h-[min(calc(100dvh-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px)-2rem),940px)]"
          )}
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Activate your subscription</DialogTitle>
            <DialogDescription>
              Subscribe to a plan to access the dashboard and all platform features.
            </DialogDescription>
          </DialogHeader>

          <div
            className={cn(
              "min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain py-3 sm:py-4 md:py-5",
              "pl-[max(0.75rem,env(safe-area-inset-left,0px))] pr-[max(0.75rem,env(safe-area-inset-right,0px))]",
              "sm:pl-5 sm:pr-5 md:pl-6 md:pr-6"
            )}
          >
            <SubscriptionContent
              gateMode
              onSubscriptionComplete={handleSubscriptionComplete}
            />
          </div>

          <div
            className={cn(
              "shrink-0 border-t border-gray-100 bg-white px-4 py-3 text-center sm:px-6",
              "pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]"
            )}
          >
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="font-inter text-gray-600"
              onClick={handleSignOutFromGate}
            >
              Sign out and use a different account
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DashboardLayout;
