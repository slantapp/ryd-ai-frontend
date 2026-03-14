import { type ReactNode } from "react";
import SideNav from "./SideNav";
import TopNav from "./TopNav";

interface DashboardProps {
  children?: ReactNode;
}

const DashboardLayout = ({ children }: DashboardProps) => {
  return (
    <div className="h-screen bg-no-repeat bg-[url('/images/auth-bg.png')] bg-center bg-cover bg-white flex flex-col gap-4 items-top overflow-hidden">
      <TopNav />
      <div className="relative px-4 mt-24 pb-4 flex gap-4 rounded-t-2xl h-full overflow-scroll scrollbar-hide w-full transition-all duration-300 ease-in-out ">
        <SideNav />
        <div className="ml-[19rem] w-full p-4 scrollbar-hide bg-white rounded-[20px] shadow-lg overflow-y-scroll">
          {children}
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
