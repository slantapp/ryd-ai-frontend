import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import SideNav from "./SideNav";
import TopNav from "./TopNav";
import { cn } from "@/lib/utils";
import SubscriptionGateFlow from "@/components/subscription/SubscriptionGateFlow";
import SubscriptionCheckoutReturnDialog, {
  type CheckoutReturnVariant,
} from "@/components/subscription/SubscriptionCheckoutReturnDialog";
import { useAuthStore } from "@/stores/authStore";
import { useCoursesStore } from "@/stores/coursesStore";
import { PUBLIC_PATHS } from "@/utils/routePaths";
import { useQueryClient } from "@tanstack/react-query";
import { subscriptionKeys, useSubscriptionStatus } from "@/hooks/useSubscription";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { devSkipSubscriptionGate } from "@/utils/devSubscriptionBypass";
import { stopAvatarSpeech } from "@/utils/stopAvatarSpeech";

interface DashboardProps {
  children?: ReactNode;
}

const DashboardLayout = ({ children }: DashboardProps) => {
  const [checkoutReturn, setCheckoutReturn] = useState<CheckoutReturnVariant | null>(
    null,
  );
  const [subscribeViewBump, setSubscribeViewBump] = useState(0);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const closeMobileNav = useCallback(() => setMobileNavOpen(false), []);
  const navigate = useNavigate();
  const location = useLocation();
  const logout = useAuthStore((s) => s.logout);
  const queryClient = useQueryClient();

  const subscriptionStatus = useSubscriptionStatus();

  const subscribed = subscriptionStatus.data?.data?.subscribed === true;

  useEffect(() => {
    if (devSkipSubscriptionGate) {
      void useCoursesStore.getState().fetchAllCourseProgress();
      return;
    }
    if (!subscriptionStatus.isFetched || !subscriptionStatus.isSuccess) return;
    if (subscribed !== true) return;
    void useCoursesStore.getState().fetchAllCourseProgress();
  }, [subscribed, subscriptionStatus.isFetched, subscriptionStatus.isSuccess]);

  const showSubscriptionGate =
    !devSkipSubscriptionGate &&
    subscriptionStatus.isFetched &&
    subscriptionStatus.isSuccess &&
    subscribed === false;

  const blockForStatusLoadingOrError =
    !devSkipSubscriptionGate &&
    (subscriptionStatus.isLoading || subscriptionStatus.isError);

  const blockDashboardAccess = showSubscriptionGate || blockForStatusLoadingOrError;

  /** Only one Radix Dialog should be open; gate + loading dialog steal clicks from stacked modals. */
  const checkoutReturnBlocking = checkoutReturn !== null;
  const subscriptionGateModalOpen =
    showSubscriptionGate && !checkoutReturnBlocking;
  const subscriptionStatusBlockModalOpen =
    blockForStatusLoadingOrError && !checkoutReturnBlocking;

  const handleSubscriptionComplete = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: subscriptionKeys.status() });
  }, [queryClient]);

  const handleSignOutFromGate = useCallback(() => {
    logout();
    navigate(PUBLIC_PATHS.LOGIN, { replace: true });
  }, [logout, navigate]);

  const subscriptionReturn = useMemo(() => {
    const sp = new URLSearchParams(location.search);
    const flag = sp.get("subscription");
    return { flag };
  }, [location.search]);

  const clearCheckoutQueryParams = useCallback(() => {
    const sp = new URLSearchParams(location.search);
    sp.delete("subscription");
    sp.delete("session_id");
    const next = sp.toString();
    navigate(
      { pathname: location.pathname, search: next ? `?${next}` : "" },
      { replace: true },
    );
  }, [navigate, location.pathname, location.search]);

  useEffect(() => {
    return () => {
      stopAvatarSpeech();
    };
  }, [location.pathname]);

  useEffect(() => {
    const flag = subscriptionReturn.flag;
    if (flag === "success") {
      setCheckoutReturn("success");
      void queryClient.invalidateQueries({ queryKey: subscriptionKeys.status() });
    } else if (flag === "cancelled") {
      setCheckoutReturn("cancelled");
    }
  }, [queryClient, subscriptionReturn.flag]);

  useEffect(() => {
    if (checkoutReturn !== "success" || subscribed) return;
    const id = window.setInterval(() => {
      void subscriptionStatus.refetch();
    }, 3000);
    return () => window.clearInterval(id);
  }, [checkoutReturn, subscribed, subscriptionStatus.refetch]);

  const handleCheckoutReturnDismiss = useCallback(() => {
    setCheckoutReturn(null);
    clearCheckoutQueryParams();
  }, [clearCheckoutQueryParams]);

  useEffect(() => {
    if (checkoutReturn !== "success" || !subscribed) return;
    if (!subscriptionStatus.isFetched || !subscriptionStatus.isSuccess) return;
    handleCheckoutReturnDismiss();
  }, [
    checkoutReturn,
    handleCheckoutReturnDismiss,
    subscribed,
    subscriptionStatus.isFetched,
    subscriptionStatus.isSuccess,
  ]);

  const handleSubscribeAgainFromCheckout = useCallback(() => {
    setSubscribeViewBump((n) => n + 1);
  }, []);

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
            "min-h-0 w-full min-w-0 flex-1 overflow-y-auto rounded-[20px] bg-white p-3 shadow-lg scrollbar-hide sm:p-4 lg:ml-76",
            mobileNavOpen && "max-lg:overflow-hidden",
          )}
          inert={blockDashboardAccess ? true : undefined}
        >
          {children}
        </div>
      </div>

      <Dialog open={subscriptionStatusBlockModalOpen}>
        <DialogContent
          showCloseButton={false}
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          className="max-w-md rounded-2xl"
        >
          <DialogHeader>
            <DialogTitle className="font-solway">
              {subscriptionStatus.isLoading
                ? "Checking subscription…"
                : "Unable to verify subscription"}
            </DialogTitle>
            <DialogDescription className="font-inter">
              {subscriptionStatus.isLoading
                ? "Please wait while we confirm your access."
                : "We couldn't confirm your subscription status. Please retry."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-center py-2">
            {subscriptionStatus.isLoading && (
              <Loader2 className="size-10 animate-spin text-primary" />
            )}
          </div>

          {subscriptionStatus.isError && (
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={handleSignOutFromGate}
              >
                Sign out
              </Button>
              <Button
                type="button"
                onClick={() => void subscriptionStatus.refetch()}
              >
                Retry
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <SubscriptionGateFlow
        open={subscriptionGateModalOpen}
        onSubscriptionComplete={handleSubscriptionComplete}
        onSignOut={handleSignOutFromGate}
        subscribeViewBump={subscribeViewBump}
      />

      <SubscriptionCheckoutReturnDialog
        variant={checkoutReturn}
        onDismiss={handleCheckoutReturnDismiss}
        onSubscribeAgain={handleSubscribeAgainFromCheckout}
      />
    </div>
  );
};

export default DashboardLayout;
