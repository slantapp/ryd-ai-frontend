import { navItems } from "@/utils/constants";
import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SignOutModal from "@/components/shared/SignOutModal";

const SideNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <aside className="fixed top-24 bottom-4 bg-white shadow-md rounded-xl w-[280px] p-4 gap-4 flex flex-col">
      <div className="w-full max-w-sm">
        <Input
          placeholder="Search..."
          className="rounded-lg bg-[#F8F8FA] border-none focus-visible:ring-1 focus-visible:ring-primary outline-none h-[50px] px-4 w-full"
        />
      </div>

      {/* Navigation */}
      <nav className="flex flex-col justify-between gap-4 overflow-y-auto scrollbar-hide h-full ">
        <ul className="text-sm space-y-2">
          {navItems.map((item, i) => (
            <li key={i}>
              <button
                onClick={() => navigate(item.path)}
                className={`group flex items-center p-3 w-full rounded-lg transition-colors
    ${
      location.pathname.includes(item.path)
        ? "bg-primary hover:bg-primary/80 text-white font-solway"
        : "text-black/80 font-sans-serifbookflf hover:bg-primary hover:text-white"
    }
  `}
              >
                <img
                  src={item.icon}
                  alt={item.name}
                  className={`w-5 h-5 transition
      ${
        location.pathname.includes(item.path)
          ? "filter invert brightness-0"
          : "group-hover:filter group-hover:invert group-hover:brightness-0"
      }
    `}
                />
                <span className="ml-2 font-medium whitespace-nowrap">
                  {item.name}
                </span>
              </button>
            </li>
          ))}

          {/* Subscription Ads */}
          <div className="relative flex flex-col items-center justify-center text-center rounded-[20px] bg-[#F3ECFE]  p-4 py-6 mt-14">
            <div className="absolute -top-16">
              <img src="/images/illustration-3.png" alt="illstration" />
            </div>
            <div className="mt-20 space-y-1">
              <h3 className="font-bold font-solway text-base">
                Premium Subscription
              </h3>
              <p className="text-xs text-gray-500">
                Buy premium and get access to new courses.
              </p>
              <Button className="rounded-[10px] mt-2 bg-primary hover:bg-primary/80 font-solway px-5 py-6">
                {" "}
                Upgrade to Pro
              </Button>
            </div>
          </div>
        </ul>
        {/* Lower Section */}
        <ul className="text-sm space-y-2">
          {/* Manage Account */}
          <li>
            <button
              onClick={() => navigate("/manage-account")}
              className={`group flex items-center p-3 w-full rounded-lg transition-colors
                  ${
                    location.pathname.includes("/manage-account")
                      ? "bg-primary hover:bg-primary/80 text-white font-solway"
                      : "text-black/80 font-sans-serifbookflf hover:bg-primary hover:text-white"
                  }
                `}
            >
              <img
                src="/icons/navItems/manage-account.svg"
                alt="Manage Account"
                className={`w-5 h-5 transition  
        ${
          location.pathname.includes("/manage-account")
            ? "filter invert brightness-0"
            : "group-hover:filter group-hover:invert group-hover:brightness-0"
        }`}
              />

              <span className="ml-2 font-medium whitespace-nowrap">
                Manage Account
              </span>
            </button>
          </li>
          {/* Logout */}
          <li>
            <button
              onClick={() => setIsModalOpen(true)}
              className="group flex items-center p-3 w-full rounded-lg transition-colors text-black/80 font-sans-serifbookflf hover:bg-primary hover:text-white "
            >
              <img
                src="/icons/navItems/logout.svg"
                alt="Logout"
                className={`w-5 h-5 transition group-hover:filter group-hover:invert group-hover:brightness-0`}
              />
              <span className="ml-2 font-medium whitespace-nowrap">Logout</span>
            </button>
          </li>
        </ul>
      </nav>

      {/* Logout Modal */}
      <SignOutModal isOpen={isModalOpen} setIsOpen={setIsModalOpen} />
    </aside>
  );
};

export default SideNav;
