import { navItems } from "@/utils/constants";
import { userHasAllowedType } from "@/auth";
import { useAuthStore } from "@/stores/authStore";
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SignOutModal from "@/components/shared/SignOutModal";
import { cn } from "@/lib/utils";
import { Search, Sparkles, X } from "lucide-react";
import { useSubscriptionStatus } from "@/hooks/useSubscription";
import { PRIVATE_PATHS } from "@/utils/routePaths";
import { devSkipSubscriptionGate } from "@/utils/devSubscriptionBypass";
import {
  getPrimarySubscription,
  isFullyActiveSubscription,
  needsSubscribeAgain,
} from "@/utils/subscriptionStatus";

interface SideNavProps {
  mobileNavOpen: boolean;
  onMobileNavClose: () => void;
  /** Soft-lock during sneak peek: visible but blurred and not interactive. */
  locked?: boolean;
}

const SideNav = ({
  mobileNavOpen,
  onMobileNavClose,
  locked = false,
}: SideNavProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const subscriptionStatus = useSubscriptionStatus();

  const visibleNavItems = useMemo(
    () =>
      navItems.filter((item) =>
        !item.allowedUserTypes?.length
          ? true
          : userHasAllowedType(user, item.allowedUserTypes),
      ),
    [user],
  );

  const statusData = subscriptionStatus.data?.data;
  const subscribed = statusData?.subscribed === true;
  const primarySubscription = getPrimarySubscription(statusData);
  const primaryPlanKey = primarySubscription?.planKey ?? null;

  const promo = useMemo(() => {
    if (devSkipSubscriptionGate) return { show: false };

    if (!subscriptionStatus.isSuccess) return { show: false };

    if (!subscribed) {
      return {
        show: true,
        title: "Premium Subscription",
        description:
          "Subscribe to unlock full access to new courses and AI features.",
        cta: "Subscribe now",
      };
    }

    if (needsSubscribeAgain(primarySubscription)) {
      return { show: false };
    }

    if (
      primaryPlanKey === "monthly" &&
      isFullyActiveSubscription(primarySubscription)
    ) {
      return {
        show: true,
        title: "Upgrade your plan",
        description:
          "You're on Monthly. Upgrade to Annual to save more and keep learning.",
        cta: "Upgrade to Annual",
      };
    }

    return { show: false };
  }, [
    primarySubscription,
    primaryPlanKey,
    subscribed,
    subscriptionStatus.isSuccess,
  ]);

  useEffect(() => {
    onMobileNavClose();
  }, [location.pathname, onMobileNavClose]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onMobileNavClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileNavOpen, onMobileNavClose]);

  const go = (path: string) => {
    if (locked) return;
    navigate(path);
    onMobileNavClose();
  };

  const isActive = (path: string) => location.pathname.includes(path);

  return (
    <>
      {mobileNavOpen && !locked && (
        <div
          role="presentation"
          aria-hidden
          className="fixed inset-0 z-65 bg-[#132050]/35 backdrop-blur-[2px] transition-opacity lg:hidden"
          onClick={onMobileNavClose}
        />
      )}

      <aside
        aria-hidden={locked || undefined}
        inert={locked ? true : undefined}
        className={cn(
          "fixed z-70 flex w-[min(240px,calc(100vw-1rem))] max-w-[240px] flex-col gap-4 border-r border-[#E5E3E9] bg-white p-3.5 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[4px_0_24px_rgba(19,32,80,0.04)] transition-[transform,filter,opacity] duration-300 ease-out will-change-transform lg:z-50",
          "left-0 top-0 bottom-0 min-h-0 h-dvh",
          "rounded-r-lg lg:rounded-none",
          "lg:left-[max(0px,calc((100vw-1440px)/2))] lg:w-60 lg:max-w-none lg:translate-x-0 lg:px-3 lg:py-4 lg:pointer-events-auto lg:shadow-none",
          mobileNavOpen && !locked
            ? "translate-x-0 pointer-events-auto"
            : "-translate-x-[calc(100%+8px)] pointer-events-none lg:translate-x-0 lg:pointer-events-auto",
          locked &&
            "pointer-events-none select-none opacity-55 blur-[2.5px] grayscale-[0.35] lg:pointer-events-none",
        )}
      >
        <div className="flex shrink-0 items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => go(PRIVATE_PATHS.DASHBOARD)}
            className="min-w-0 text-left"
            aria-label="Go to dashboard"
          >
            <img
              src="/images/logo.svg"
              alt="RYD Learning"
              className="h-7 w-auto max-w-[9rem] object-contain object-left sm:h-8"
            />
          </button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 shrink-0 rounded-md hover:bg-[#F3ECFE] lg:hidden"
            onClick={onMobileNavClose}
            aria-label="Close menu"
          >
            <X className="size-5" strokeWidth={2} />
          </Button>
        </div>

        <div className="relative w-full max-w-sm shrink-0">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#132050]/35"
            aria-hidden
          />
          <Input
            placeholder="Search…"
            className="h-9 w-full rounded-md border border-transparent bg-[#F8F8FA] pl-8 pr-3 font-inter text-sm outline-none transition-colors placeholder:text-[#132050]/35 focus-visible:border-primary/25 focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-primary/30"
          />
        </div>

        <nav className="flex h-full min-h-0 flex-col justify-between gap-4 overflow-y-auto scrollbar-hide">
          <div className="space-y-2">
            <p className="app-type-eyebrow px-2 text-[#132050]/40">
              Navigate
            </p>
            <ul className="app-type-nav space-y-1">
              {visibleNavItems.map((item) => {
                const active = isActive(item.path);
                return (
                  <li key={item.path}>
                    <button
                      type="button"
                      onClick={() => go(item.path)}
                      className={cn(
                        "group relative flex w-full items-center rounded-md px-2.5 py-2 transition-colors duration-200",
                        active
                          ? "bg-primary font-solway text-white shadow-[0_1px_4px_rgba(170,70,142,0.18)]"
                          : "app-type-nav text-[#132050]/75 hover:bg-[#F3ECFE]/70 hover:text-[#132050]",
                      )}
                    >
                      {active ? (
                        <span
                          className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-sm bg-white/80"
                          aria-hidden
                        />
                      ) : null}
                      <img
                        src={item.icon}
                        alt=""
                        className={cn(
                          "h-4 w-4 transition",
                          active
                            ? "brightness-0 invert"
                            : "opacity-70 group-hover:opacity-100",
                        )}
                      />
                      <span className="ml-2 font-medium whitespace-nowrap">
                        {item.name}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            {promo.show && (
              <div className="relative mt-8 overflow-hidden rounded-lg border border-[#EDEAF3] bg-[#F8F8FA] p-4 text-center sm:mt-10">
                <div className="relative mx-auto mb-3 flex size-9 items-center justify-center rounded-md bg-white text-primary shadow-sm">
                  <Sparkles className="size-4" />
                </div>
                <div className="relative space-y-1.5">
                  <h3 className="app-type-card-title">
                    {"title" in promo ? promo.title : "Premium Subscription"}
                  </h3>
                  <p className="app-type-meta leading-relaxed">
                    {"description" in promo
                      ? promo.description
                      : "Buy premium and get access to new courses."}
                  </p>
                  <Button
                    className="mt-3 h-9 w-full rounded-md bg-primary font-solway text-sm hover:bg-primary/90"
                    onClick={() =>
                      go(`${PRIVATE_PATHS.SETTINGS}?tab=subscription`)
                    }
                  >
                    {"cta" in promo ? promo.cta : "Upgrade to Pro"}
                  </Button>
                </div>
              </div>
            )}
          </div>

          <ul className="space-y-1 border-t border-[#F0EEF4] pt-3 text-sm">
            <li>
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(true);
                  onMobileNavClose();
                }}
                className="group flex w-full items-center rounded-md px-2.5 py-2 app-type-nav text-[#132050]/70 transition-colors hover:bg-red-50 hover:text-red-600"
              >
                <img
                  src="/icons/navItems/logout.svg"
                  alt=""
                  className="h-4 w-4 opacity-70 transition group-hover:opacity-100"
                />
                <span className="ml-2 font-medium whitespace-nowrap">
                  Logout
                </span>
              </button>
            </li>
          </ul>
        </nav>

        <SignOutModal isOpen={isModalOpen} setIsOpen={setIsModalOpen} />
      </aside>
    </>
  );
};

export default SideNav;
