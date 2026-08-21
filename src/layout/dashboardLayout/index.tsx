import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import SideNav from "./SideNav";
import TopNav from "./TopNav";
import { cn } from "@/lib/utils";
import SubscriptionGateFlow from "@/components/subscription/SubscriptionGateFlow";
import ProfileCompletionGate from "@/components/subscription/ProfileCompletionGate";
import PasswordResetGate from "@/components/auth/PasswordResetGate";
import SubscriptionCheckoutReturnDialog, {
  type CheckoutReturnVariant,
} from "@/components/subscription/SubscriptionCheckoutReturnDialog";
import { useAuthStore } from "@/stores/authStore";
import { useCoursesStore } from "@/stores/coursesStore";
import { useLocationDefaultsStore } from "@/stores/locationDefaultsStore";
import { PUBLIC_PATHS, PRIVATE_PATHS } from "@/utils/routePaths";
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
import { ContactMessageWidget } from "@/components/contact/ContactMessageWidget";

interface DashboardProps {
  children?: ReactNode;
}

function isParentProfileIncomplete(
  user: { firstName?: string; lastName?: string } | null,
): boolean {
  return !user?.firstName?.trim() || !user?.lastName?.trim();
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
  const user = useAuthStore((s) => s.user);
  const mustResetPasswordFlag = useAuthStore((s) => s.mustResetPassword);
  const queryClient = useQueryClient();
  const ensureLocationResolved = useLocationDefaultsStore((s) => s.ensureResolved);

  const subscriptionStatus = useSubscriptionStatus();

  const subscribed = subscriptionStatus.data?.data?.subscribed === true;
  const profileIncomplete = isParentProfileIncomplete(user);
  const mustResetPassword =
    mustResetPasswordFlag === true || user?.mustResetPassword === true;
  const isDemoSneakPeek =
    location.pathname === PRIVATE_PATHS.DEMO_SNEAK_PEEK ||
    location.pathname.startsWith(`${PRIVATE_PATHS.DEMO_SNEAK_PEEK}/`);

  /** Forced password change takes priority over subscription / profile gates. */
  const showPasswordResetGate = !isDemoSneakPeek && mustResetPassword;

  useEffect(() => {
    if (showPasswordResetGate) return;
    if (devSkipSubscriptionGate) {
      void useCoursesStore.getState().fetchVisibleCurriculums();
      void useCoursesStore.getState().fetchAllCourseProgress();
      return;
    }
    if (!subscriptionStatus.isFetched || !subscriptionStatus.isSuccess) return;
    if (subscribed !== true) return;
    if (profileIncomplete) return;
    void useCoursesStore.getState().fetchVisibleCurriculums();
    void useCoursesStore.getState().fetchAllCourseProgress();
  }, [
    profileIncomplete,
    showPasswordResetGate,
    subscribed,
    subscriptionStatus.isFetched,
    subscriptionStatus.isSuccess,
  ]);

  const showSubscriptionGate =
    !devSkipSubscriptionGate &&
    !isDemoSneakPeek &&
    !showPasswordResetGate &&
    subscriptionStatus.isFetched &&
    subscriptionStatus.isSuccess &&
    subscribed === false;

  /** Prefetch geo defaults while the subscription gate is open (for checkout payload). */
  useEffect(() => {
    if (!showSubscriptionGate) return;
    void ensureLocationResolved();
  }, [ensureLocationResolved, showSubscriptionGate]);

  const showProfileCompletionGate =
    !devSkipSubscriptionGate &&
    !isDemoSneakPeek &&
    !showPasswordResetGate &&
    subscriptionStatus.isFetched &&
    subscriptionStatus.isSuccess &&
    subscribed === true &&
    profileIncomplete &&
    checkoutReturn === null;

  const blockForStatusLoadingOrError =
    !devSkipSubscriptionGate &&
    !isDemoSneakPeek &&
    !showPasswordResetGate &&
    (subscriptionStatus.isLoading || subscriptionStatus.isError);

  const blockDashboardAccess =
    !isDemoSneakPeek &&
    (showPasswordResetGate ||
      showSubscriptionGate ||
      showProfileCompletionGate ||
      blockForStatusLoadingOrError);

  /** Only one Radix Dialog should be open; gate + loading dialog steal clicks from stacked modals. */
  const checkoutReturnBlocking = checkoutReturn !== null;
  const passwordResetModalOpen =
    showPasswordResetGate && !checkoutReturnBlocking;
  const subscriptionGateModalOpen =
    showSubscriptionGate && !checkoutReturnBlocking;
  const subscriptionStatusBlockModalOpen =
    blockForStatusLoadingOrError && !checkoutReturnBlocking;
  const profileCompletionModalOpen =
    showProfileCompletionGate && !checkoutReturnBlocking;

  const handleSubscriptionComplete = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: subscriptionKeys.status() });
  }, [queryClient]);

  const handleProfileComplete = useCallback(() => {
    void useCoursesStore.getState().fetchVisibleCurriculums();
    void useCoursesStore.getState().fetchAllCourseProgress();
  }, []);

  const handleSignOutFromGate = useCallback(() => {
    useLocationDefaultsStore.getState().reset();
    logout();
    navigate(PUBLIC_PATHS.LOGIN, { replace: true });
  }, [logout, navigate]);

  const subscriptionReturn = useMemo(() => {
    const sp = new URLSearchParams(location.search);
    const flag = sp.get("subscription");
    const sneakPeek = sp.get("sneakPeek");
    return { flag, sneakPeek };
  }, [location.search]);

  const clearCheckoutQueryParams = useCallback(() => {
    const sp = new URLSearchParams(location.search);
    sp.delete("subscription");
    sp.delete("session_id");
    sp.delete("sneakPeek");
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

  /** After sneak peek, reopen the gate on the plan picker. */
  useEffect(() => {
    if (subscriptionReturn.sneakPeek !== "done") return;
    if (subscribed) {
      clearCheckoutQueryParams();
      return;
    }
    setSubscribeViewBump((n) => n + 1);
    clearCheckoutQueryParams();
  }, [clearCheckoutQueryParams, subscribed, subscriptionReturn.sneakPeek]);

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

  useEffect(() => {
    if (isDemoSneakPeek) closeMobileNav();
  }, [isDemoSneakPeek, closeMobileNav]);

  return (
    <div className="flex h-screen flex-col items-stretch gap-4 overflow-hidden bg-white bg-[url('/images/auth-bg.png')] bg-cover bg-center bg-no-repeat">
      <TopNav
        onOpenMobileNav={
          isDemoSneakPeek ? undefined : () => setMobileNavOpen(true)
        }
        hideMobileMenu={isDemoSneakPeek}
      />
      <div
        className={cn(
          "relative mx-auto flex h-full min-h-0 w-full max-w-[1440px] gap-4 overflow-hidden rounded-t-2xl transition-all duration-300 ease-in-out md:mt-24 mt-20",
          isDemoSneakPeek
            ? "px-2 pb-2 sm:px-3 sm:pb-3"
            : "px-3 pb-6 sm:px-4 sm:pb-4",
        )}
      >
        <SideNav
          mobileNavOpen={mobileNavOpen && !isDemoSneakPeek}
          onMobileNavClose={closeMobileNav}
          locked={isDemoSneakPeek}
        />
        <div
          className={cn(
            "min-h-0 w-full min-w-0 flex-1 rounded-[20px] bg-white shadow-lg",
            isDemoSneakPeek
              ? "flex flex-col overflow-hidden p-2 sm:p-3 lg:ml-76"
              : "overflow-y-auto scrollbar-hide p-3 sm:p-4 lg:ml-76",
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

      <PasswordResetGate
        open={passwordResetModalOpen}
        onSignOut={handleSignOutFromGate}
      />

      <SubscriptionGateFlow
        open={subscriptionGateModalOpen}
        onSubscriptionComplete={handleSubscriptionComplete}
        onSignOut={handleSignOutFromGate}
        subscribeViewBump={subscribeViewBump}
      />

      <ProfileCompletionGate
        open={profileCompletionModalOpen}
        onComplete={handleProfileComplete}
        onSignOut={handleSignOutFromGate}
      />

      <SubscriptionCheckoutReturnDialog
        variant={checkoutReturn}
        onDismiss={handleCheckoutReturnDismiss}
        onSubscribeAgain={handleSubscribeAgainFromCheckout}
      />

      <ContactMessageWidget />
    </div>
  );
};

export default DashboardLayout;
