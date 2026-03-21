import { type ReactNode, useCallback, useState } from "react";
import SideNav from "./SideNav";
import TopNav from "./TopNav";
import { cn } from "@/lib/utils";

interface DashboardProps {
  children?: ReactNode;
}

const DashboardLayout = ({ children }: DashboardProps) => {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const closeMobileNav = useCallback(() => setMobileNavOpen(false), []);

  return (
    <div className="flex h-screen flex-col items-stretch gap-4 overflow-hidden bg-white bg-[url('/images/auth-bg.png')] bg-cover bg-center bg-no-repeat">
      <TopNav onOpenMobileNav={() => setMobileNavOpen(true)} />
      <div className="relative mt-24 flex h-full min-h-0 w-full gap-4 overflow-hidden rounded-t-2xl px-3 pb-3 transition-all duration-300 ease-in-out sm:px-4 sm:pb-4">
        <SideNav
          mobileNavOpen={mobileNavOpen}
          onMobileNavClose={closeMobileNav}
        />
        <div
          className={cn(
            "min-h-0 w-full min-w-0 flex-1 overflow-y-auto rounded-[20px] bg-white p-3 shadow-lg scrollbar-hide sm:p-4 lg:ml-[19rem]",
            mobileNavOpen && "max-lg:overflow-hidden",
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
