import { navItems } from "@/utils/constants";
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SignOutModal from "@/components/shared/SignOutModal";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { useSubscriptionStatus } from "@/hooks/useSubscription";
import { PRIVATE_PATHS } from "@/utils/routePaths";

interface SideNavProps {
  mobileNavOpen: boolean;
  onMobileNavClose: () => void;
}

const SideNav = ({ mobileNavOpen, onMobileNavClose }: SideNavProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const subscriptionStatus = useSubscriptionStatus();

  const subscribed = subscriptionStatus.data?.data?.subscribed === true;
  const activePlanKey =
    subscriptionStatus.data?.data?.subscriptions?.find((s) => s.status === "active")
      ?.planKey ?? null;

  const promo = useMemo(() => {
    // Only show once we have a reliable status from the server.
    if (!subscriptionStatus.isSuccess) return { show: false };

    if (!subscribed) {
      return {
        show: true,
        title: "Premium Subscription",
        description: "Subscribe to unlock full access to new courses and AI features.",
        cta: "Subscribe now",
      };
    }

    if (activePlanKey === "monthly") {
      return {
        show: true,
        title: "Upgrade your plan",
        description: "You're on Monthly. Upgrade to Annual to save more and keep learning.",
        cta: "Upgrade to Annual",
      };
    }

    return { show: false };
  }, [activePlanKey, subscribed, subscriptionStatus.isSuccess]);

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
    navigate(path);
    onMobileNavClose();
  };

  return (
    <>
      {mobileNavOpen && (
        <div
          role="presentation"
          aria-hidden
          className="fixed inset-0 z-65 bg-black/40 backdrop-blur-[2px] transition-opacity lg:hidden"
          onClick={onMobileNavClose}
        />
      )}

      <aside
        className={cn(
          "fixed z-70 flex w-[min(280px,calc(100vw-1rem))] max-w-[280px] flex-col gap-4 rounded-r-2xl bg-white p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] shadow-md transition-transform duration-300 ease-out will-change-transform lg:z-50",
          "left-0 top-0 bottom-0 min-h-0",
          "lg:top-24 lg:bottom-4 lg:left-4 lg:min-h-0 lg:translate-x-0 lg:rounded-xl lg:px-4 lg:py-4 lg:pt-4 lg:pb-4 lg:pointer-events-auto",
          mobileNavOpen
            ? "translate-x-0 pointer-events-auto"
            : "-translate-x-[calc(100%+8px)] pointer-events-none lg:translate-x-0 lg:pointer-events-auto",
        )}
      >
        <div className="flex shrink-0 items-center justify-between lg:hidden">
          <span className="font-solway text-base font-semibold text-[#0A090B]">
            Menu
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={onMobileNavClose}
            aria-label="Close menu"
          >
            <X className="size-5" strokeWidth={2} />
          </Button>
        </div>

        <div className="w-full max-w-sm shrink-0">
          <Input
            placeholder="Search..."
            className="h-[50px] w-full rounded-lg border-none bg-[#F8F8FA] px-4 outline-none focus-visible:ring-1 focus-visible:ring-primary"
          />
        </div>

        <nav className="flex h-full min-h-0 flex-col justify-between gap-4 overflow-y-auto scrollbar-hide">
          <ul className="space-y-2 text-sm">
            {navItems.map((item, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => go(item.path)}
                  className={`group flex w-full items-center rounded-lg p-3 transition-colors ${location.pathname.includes(item.path)
                    ? "bg-primary font-solway text-white hover:bg-primary/80"
                    : "font-sans-serifbookflf text-black/80 hover:bg-primary hover:text-white"
                    }`}
                >
                  <img
                    src={item.icon}
                    alt={item.name}
                    className={`h-5 w-5 transition ${location.pathname.includes(item.path)
                      ? "filter invert brightness-0"
                      : "group-hover:filter group-hover:invert group-hover:brightness-0"
                      }`}
                  />
                  <span className="ml-2 font-medium whitespace-nowrap">
                    {item.name}
                  </span>
                </button>
              </li>
            ))}

            {promo.show && (
              <div className="relative mt-10 flex flex-col items-center justify-center rounded-[20px] bg-[#F3ECFE] p-4 py-6 text-center sm:mt-14">
                <div className="absolute -top-12 max-w-[100px] sm:-top-16 sm:max-w-none">
                  <img
                    src="/images/illustration-3.png"
                    alt=""
                    className="h-auto w-full max-h-24 object-contain sm:max-h-none"
                  />
                </div>
                <div className="mt-14 space-y-1 sm:mt-20">
                  <h3 className="font-solway text-base font-bold">
                    {"title" in promo ? promo.title : "Premium Subscription"}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {"description" in promo
                      ? promo.description
                      : "Buy premium and get access to new courses."}
                  </p>
                  <Button
                    className="mt-2 rounded-[10px] bg-primary px-5 py-6 font-solway hover:bg-primary/80"
                    onClick={() => go(`${PRIVATE_PATHS.SETTINGS}?tab=subscription`)}
                  >
                    {"cta" in promo ? promo.cta : "Upgrade to Pro"}
                  </Button>
                </div>
              </div>
            )}
          </ul>

          <ul className="space-y-2 text-sm">
            <li>
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(true);
                  onMobileNavClose();
                }}
                className="group flex w-full items-center rounded-lg p-3 font-sans-serifbookflf text-black/80 transition-colors hover:bg-primary hover:text-white"
              >
                <img
                  src="/icons/navItems/logout.svg"
                  alt="Logout"
                  className="h-5 w-5 transition group-hover:filter group-hover:invert group-hover:brightness-0"
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
