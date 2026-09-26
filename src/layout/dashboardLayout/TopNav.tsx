import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Bell,
  LogOut,
  Settings,
  LifeBuoy,
  ChevronDown,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import SignOutModal from "@/components/shared/SignOutModal";
import { PRIVATE_PATHS } from "@/utils/routePaths";
import { cn } from "@/lib/utils";

interface TopNavProps {
  onOpenMobileNav?: () => void;
  /** Hide the mobile hamburger (e.g. sneak peek). */
  hideMobileMenu?: boolean;
}

const TopNav = ({ onOpenMobileNav, hideMobileMenu = false }: TopNavProps) => {
  const navigate = useNavigate();
  const userDetails = useAuthStore((state) => state.user);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const storedUser = localStorage.getItem("AxtronAdmin");
  const parsedUser = storedUser ? JSON.parse(storedUser) : null;
  const profileImage = parsedUser?.logo || "https://i.pravatar.cc/150?img=3c";

  const displayName = [userDetails?.firstName, userDetails?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  const goAndClose = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <header className="sticky top-0 z-40 w-full shrink-0">
      <div className="flex h-12 w-full min-w-0 items-center justify-between gap-2 border-b border-[#E5E3E9] bg-white px-3 shadow-[0_1px_0_rgba(19,32,80,0.03)] sm:h-14 sm:gap-3 sm:px-4 md:px-5">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {!hideMobileMenu ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 shrink-0 rounded-md text-[#132050] hover:bg-[#F3ECFE] lg:hidden"
              onClick={() => onOpenMobileNav?.()}
              aria-label="Open menu"
            >
              <Menu className="size-4" strokeWidth={2} />
            </Button>
          ) : null}
          <div className="min-w-0">
            <p className="app-type-card-title truncate text-sm">
              {displayName
                ? `Hi, ${userDetails?.firstName?.trim()}`
                : "Welcome"}
            </p>
            <p className="app-type-meta hidden truncate sm:block">
              Keep learning at your own pace
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            className="relative flex size-8 items-center justify-center rounded-md text-[#132050] transition-colors hover:bg-[#F3ECFE] sm:size-9"
            aria-label="Notifications"
          >
            <Bell className="size-4" strokeWidth={2} />
            <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-primary ring-2 ring-white" />
          </button>

          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  "flex max-w-full cursor-pointer items-center gap-1.5 rounded-md border border-[#EDEAF3] bg-[#F8F8FA] px-1 py-1 outline-none transition-colors",
                  "hover:border-primary/20 hover:bg-[#F3ECFE] sm:gap-2 sm:px-1.5 sm:py-1",
                  open && "border-primary/25 bg-[#F3ECFE]",
                )}
              >
                <img
                  src={profileImage}
                  alt=""
                  className="size-7 shrink-0 rounded-md object-cover sm:size-8"
                />

                <div className="hidden min-w-0 text-left md:block">
                  <p className="app-type-card-title max-w-[8rem] truncate text-sm leading-tight lg:max-w-[11rem] xl:max-w-[14rem]">
                    {displayName || "Your account"}
                  </p>
                  <p className="app-type-meta mt-0.5 max-w-[8rem] truncate lg:max-w-[11rem] xl:max-w-[14rem]">
                    {userDetails?.email || "Manage profile"}
                  </p>
                </div>

                <ChevronDown
                  size={16}
                  strokeWidth={2.5}
                  className={cn(
                    "hidden shrink-0 text-[#132050]/40 transition-transform duration-200 md:block",
                    open && "rotate-180",
                  )}
                />
              </button>
            </PopoverTrigger>

            <PopoverContent
              align="end"
              sideOffset={8}
              className="w-[min(100vw-1.5rem,16rem)] overflow-hidden rounded-lg border border-[#E8E8EC] p-0 shadow-[0_8px_28px_rgba(19,32,80,0.1)]"
            >
              <div className="flex items-center gap-3 border-b border-[#F0EEF4] bg-[#F8F8FA] p-3 sm:p-4">
                <img
                  src={profileImage}
                  alt=""
                  className="size-9 shrink-0 rounded-md object-cover sm:size-10"
                />
                <div className="min-w-0 flex-1">
                  <p className="app-type-card-title truncate text-sm">
                    {displayName || "Learner"}
                  </p>
                  <p className="app-type-meta truncate">
                    {userDetails?.email || "Signed in"}
                  </p>
                </div>
              </div>

              <ul className="space-y-0.5 p-1.5 sm:p-2">
                <li>
                  <button
                    type="button"
                    onClick={() => goAndClose(PRIVATE_PATHS.SETTINGS)}
                    className="app-type-nav flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-[#132050] transition-colors hover:bg-[#F8F8FA]"
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-[#F3ECFE] text-primary">
                      <Settings size={16} />
                    </span>
                    Account settings
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => goAndClose(PRIVATE_PATHS.SUPPORT)}
                    className="app-type-nav flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-[#132050] transition-colors hover:bg-[#F8F8FA]"
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-[#F3ECFE] text-primary">
                      <LifeBuoy size={16} />
                    </span>
                    Help &amp; support
                  </button>
                </li>
              </ul>

              <div className="border-t border-[#F0EEF4] p-1.5 sm:p-2">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setIsModalOpen(true);
                  }}
                  className="app-type-nav flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-red-600 transition-colors hover:bg-red-50"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-red-50 text-red-600">
                    <LogOut size={16} />
                  </span>
                  Log out
                </button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <SignOutModal
        isOpen={isModalOpen}
        setIsOpen={setIsModalOpen}
        onRequestClose={() => setOpen(false)}
      />
    </header>
  );
};

export default TopNav;
