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
} from "lucide-react";
import { useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import SignOutModal from "@/components/shared/SignOutModal";

const TopNav = () => {
  const userDetails = useAuthStore((state) => state.user);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const storedUser = localStorage.getItem("AxtronAdmin");
  const parsedUser = storedUser ? JSON.parse(storedUser) : null;
  const profileImage = parsedUser?.logo || "https://i.pravatar.cc/150?img=3c";

  return (
    <div
      className={`fixed flex left-4 right-4 top-4 
           rounded-[20px] shadow-xs px-4 py-2 z-40 transition-all duration-300 ease-in-out bg-white
        `}
    >
      <div className="flex gap-4 w-full justify-between items-center">
        {/* Logo */}
        <img src="/images/logo.svg" alt="logo" className="w-40" />

        {/* Right Actions */}
        <div className="flex space-x-2 items-center w-fit">
          <div className="space-x-2 flex items-center rounded-full p-2 bg-[#F3ECFE]">
            <Bell size={18} />
          </div>

          {/* Profile + Dropdown */}
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <div className="flex cursor-pointer items-center space-x-2 bg-[#F3ECFE] rounded-full px-6 py-2">
                <img
                  src={profileImage}
                  alt="profile image"
                  className="rounded-full w-8 h-8 object-cover"
                />

                <div className="text-xs">
                  <h4 className="text-nowrap text-[#132050] font-semibold">
                    {userDetails?.firstName || "Hello, Jonas 👋"}{" "}
                    {userDetails?.lastName}
                  </h4>
                  <p className="flex items-center gap-4 text-[#1320507A]">
                    Switch Account
                    <ChevronDown
                      color="#6a7282"
                      size={20}
                      strokeWidth={3}
                      className={`cursor-pointer transition-transform duration-300 ${
                        open ? "rotate-180" : "rotate-0"
                      }`}
                    />
                  </p>
                </div>
              </div>
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
                <span className="ml-auto text-xs bg-purple-100 text-purple-600 px-2 py-1 rounded-full">
                  Pro
                </span>
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
                  onClick={() => setIsModalOpen(true)}
                  className="flex items-center w-full px-4 py-3 text-sm text-red-600 hover:bg-red-600 hover:text-white rounded-b-xl transition-colors"
                >
                  <LogOut size={18} className="mr-2" />
                  Log out
                </button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Logout Modal */}
      <SignOutModal isOpen={isModalOpen} setIsOpen={setIsModalOpen} />
    </div>
  );
};

export default TopNav;
