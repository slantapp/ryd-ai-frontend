import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Bell,
  LogOut,
  Settings,
  BookOpen,
  LifeBuoy,
  ChevronDown,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import SignOutModal from "@/components/shared/SignOutModal";

interface TopNavProps {
  onOpenMobileNav?: () => void;
}

const TopNav = ({ onOpenMobileNav }: TopNavProps) => {
  const userDetails = useAuthStore((state) => state.user);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const storedUser = localStorage.getItem("AxtronAdmin");
  const parsedUser = storedUser ? JSON.parse(storedUser) : null;
  const profileImage = parsedUser?.logo || "https://i.pravatar.cc/150?img=3c";

  return (
    <div className="fixed left-3 right-3 top-3 z-[60] flex rounded-[20px] bg-white px-2 py-2 shadow-xs transition-all duration-300 ease-in-out sm:left-4 sm:right-4 sm:top-4 sm:px-4">
      <div className="flex w-full items-center justify-between gap-2 sm:gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 lg:hidden"
            onClick={() => onOpenMobileNav?.()}
            aria-label="Open menu"
          >
            <Menu className="size-5" strokeWidth={2} />
          </Button>
          <img
            src="/images/logo.svg"
            alt="RYD Learning"
            className="h-7 w-auto max-w-[7.5rem] object-contain object-left sm:h-9 sm:max-w-[9rem] md:max-w-[10rem]"
          />
        </div>

        <div className="flex w-fit shrink-0 items-center gap-1.5 sm:space-x-2">
          <div className="flex items-center rounded-full bg-[#F3ECFE] p-1.5 sm:p-2">
            <Bell className="size-[1.05rem] sm:size-[18px]" strokeWidth={2} />
          </div>

          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex cursor-pointer items-center gap-2 rounded-full bg-[#F3ECFE] px-2 py-1.5 outline-none sm:gap-0 sm:space-x-2 sm:px-4 sm:py-2 md:px-6"
              >
                <img
                  src={profileImage}
                  alt=""
                  className="size-7 shrink-0 rounded-full object-cover sm:size-8"
                />

                <div className="hidden min-w-0 text-left text-xs sm:block">
                  <h4 className="truncate font-semibold text-[#132050]">
                    {userDetails?.firstName || "Hello, Jonas 👋"}{" "}
                    {userDetails?.lastName}
                  </h4>
                  <p className="flex items-center gap-2 text-[#1320507A] md:gap-4">
                    <span className="hidden md:inline">Switch Account</span>
                    <ChevronDown
                      color="#6a7282"
                      size={20}
                      strokeWidth={3}
                      className={`shrink-0 cursor-pointer transition-transform duration-300 ${open ? "rotate-180" : "rotate-0"
                        }`}
                    />
                  </p>
                </div>
              </button>
            </PopoverTrigger>

            <PopoverContent
              align="end"
              className="p-0 w-64 rounded-xl shadow-lg border"
            >
              {/* Profile Header */}
              <div className="flex items-center gap-3 p-4">
                <img
                  src={profileImage}
                  alt="profile"
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div className="flex flex-col">
                  <span className="font-semibold text-sm font-solway text-[#132050]">
                    {userDetails?.firstName || "Damien Smith"}{" "}
                    {userDetails?.lastName}
                  </span>
                  <span className="text-xs text-gray-500">
                    {userDetails?.email || "myemail@gmail.com"}
                  </span>
                </div>
              </div>

              <div className="border-t">
                {/* Menu Items */}
                <ul className="py-2">
                  <li>
                    <button className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      <Settings size={18} className="mr-2" />
                      Account settings
                    </button>
                  </li>
                  <li>
                    <button className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      <BookOpen size={18} className="mr-2" />
                      Guide
                    </button>
                  </li>
                  <li>
                    <button className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      <LifeBuoy size={18} className="mr-2" />
                      Help & Support
                    </button>
                  </li>
                </ul>
              </div>

              {/* Logout */}
              <div className="border-t">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setIsModalOpen(true);
                  }}
                  className="flex w-full items-center rounded-b-xl px-4 py-3 text-sm text-red-600 transition-colors hover:bg-red-50 hover:text-red-700"
                >
                  <LogOut size={18} className="mr-2" />
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
    </div>
  );
};

export default TopNav;
