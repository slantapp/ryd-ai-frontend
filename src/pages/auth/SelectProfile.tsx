import { useState } from "react";
import { PlusCircleIcon } from "lucide-react";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { FaPen } from "react-icons/fa6";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/stores/authStore";
import InstructorSelectionModal from "@/components/auth/InstructorSelectionModal";
import { PRIVATE_PATHS } from "@/utils/routePaths";

const SelectProfile = () => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleProceed = () => {
    setIsModalOpen(true);
  };

  const handleContinueToDashboard = () => {
    useAuthStore.setState({ isLoggedIn: true });
    navigate(PRIVATE_PATHS.DASHBOARD);
  };
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-x-hidden px-4 py-8 sm:px-6 sm:py-10 md:py-12">
      <div className="relative mx-auto w-full max-w-[605px]">
        <div
          className="pointer-events-none absolute -top-3 left-1/2 z-0 hidden h-[min(420px,72vw)] w-[min(605px,calc(100vw-2rem))] max-w-full -translate-x-1/2 rounded-[24px] bg-[#cce0fd] rotate-[4.25deg] sm:block sm:-top-4 sm:rounded-[30px] md:-top-6 md:h-[500px] md:max-w-[605px]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -top-3 left-1/2 z-0 hidden h-[min(420px,72vw)] w-[min(604px,calc(100vw-2rem))] max-w-full -translate-x-1/2 rounded-[24px] bg-[#f3ecfe] rotate-[-5.87deg] sm:block sm:-top-4 sm:rounded-[30px] md:-top-6 md:h-[500px] md:max-w-[605px]"
          aria-hidden
        />
        <Card className="relative z-10 min-h-0 w-full -translate-y-2 rounded-[20px] border-0 bg-[#ffffff] shadow-none sm:-translate-y-4 md:min-h-[480px]">
          <CardContent className="flex h-full min-h-[min(420px,70vh)] flex-col items-center justify-center gap-8 p-4 sm:min-h-[460px] sm:gap-10 sm:p-6 md:min-h-[480px] md:gap-12">
            <header className="relative self-stretch">
              <h1 className="text-center font-solway text-2xl font-bold leading-tight tracking-[-0.03em] text-[#0A090B] sm:text-[28px] sm:leading-[34px] md:text-[32px] md:leading-[38.4px] md:tracking-[-0.96px]">
                Add a profile
              </h1>
            </header>
            <div className="mx-auto grid w-full max-w-md grid-cols-1 gap-4 min-[480px]:max-w-none min-[480px]:grid-cols-2 min-[480px]:gap-2">
              <div className="relative flex items-center justify-center gap-3">
                <div className="relative flex h-auto w-full max-w-[280px] flex-col items-center justify-center gap-2.5 rounded-[10px] bg-[#F8F8FA] p-4 px-5 transition-colors hover:bg-gray-50 min-[480px]:max-w-none sm:p-6 sm:px-8 md:px-14">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <div className="cursor-pointer absolute top-2 right-2 bg-[#dfdfdf] rounded-full p-2 flex">
                        <FaPen size={14} className="text-primary" />
                      </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-28">
                      <DropdownMenuLabel>Action</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => navigate("/create-profile")}
                        // onClick={() => console.log("Edit clicked")}
                        className="cursor-pointer"
                      >
                        <img src="/icons/user-edit.svg" alt="edit icon" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => console.log("Delete clicked")}
                        className="cursor-pointer"
                      >
                        <img src="/icons/delete.svg" alt="delete icon" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <div className="cursor-pointer rounded-full border-2 border-dashed border-[#aa468e] p-1">
                    <img
                      src="https://api.dicebear.com/9.x/avataaars/png?seed=emmanuella&backgroundColor=b6e3f4,c0aede,d1d4f9"
                      alt="profile avatar"
                      className="size-16 rounded-full sm:size-20"
                    />
                  </div>
                  <p className="text-center font-sans-serifbookflf text-sm font-medium sm:text-base">
                    Profile 1
                  </p>
                  <Button
                    onClick={handleProceed}
                    className="rounded-sm bg-[#DDB5D2] text-primary hover:bg-[#DDA5D2]"
                  >
                    Proceed
                  </Button>
                </div>
              </div>
              <div className="relative flex items-center justify-center gap-3">
                <div
                  onClick={() => navigate("/create-profile")}
                  className="flex h-auto w-full max-w-[280px] cursor-pointer flex-col items-center justify-center gap-3 rounded-[10px] border-[0.5px] border-solid border-[#cfd4dc] bg-white p-4 px-6 shadow-shadow-elevation-1-e-1-rest-state transition-colors hover:bg-gray-50 min-[480px]:max-w-none sm:gap-4 sm:px-8"
                >
                  <PlusCircleIcon
                    className="size-12 shrink-0 text-[#aa468e] sm:size-[60px]"
                    strokeWidth={1.25}
                  />
                  <span className="text-center font-sans-serifbookflf text-lg font-medium leading-snug tracking-[-0.04em] text-[#0A090B] sm:text-xl md:text-[24px] md:leading-[38.4px] md:tracking-[-0.96px]">
                    Add Profile
                  </span>
                </div>
              </div>
            </div>

            <Card className="py-1 w-full rounded-[10px] border border-solid border-[#cfd4dc] bg-white px-2 shadow-shadow-elevation-1-e-1-rest-state">
              <CardContent className="flex h-full gap-3 p-2.5 flex-row items-center sm:gap-2 sm:px-3.5 sm:py-2.5">
                <div className="relative flex min-w-0 flex-1 items-start gap-2 sm:items-center">
                  <Avatar className="mt-0.5 size-9 shrink-0 sm:mt-0">
                    <AvatarImage src="/images/avatar.png" alt="User avatar" />
                  </Avatar>
                  <div className="flex flex-col gap-1 min-w-0 flex-1 font-solway text-xs leading-snug sm:text-sm">
                    <span className="text-[#9ca3a9]">Welcome back, </span>
                    <span className="wrap-break-word font-semibold text-[#081a28]">
                      adebalanced04@gmail.com
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  className="h-auto shrink-0 self-end p-0 text-[#aa468e] text-sm"
                >
                  Log Out
                </Button>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </div>
      <InstructorSelectionModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onContinue={handleContinueToDashboard}
      />
    </div>
  );
};

export default SelectProfile;
