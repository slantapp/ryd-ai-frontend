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
    <div className="relative flex flex-col justify-center items-center p-6 h-screen">
      <div className="relative ">
        <div className="w-[605px] h-[500px] -top-6 left-8 bg-[#cce0fd] rotate-[4.25deg] absolute  rounded-[30px]" />
        <div className="w-[604px] h-[500px] -top-6 left-8 bg-[#f3ecfe] rotate-[-5.87deg] absolute  rounded-[30px]" />
        <Card className=" h-[480px] bg-[#ffffff] rounded-[20px] border-0 shadow-none translate-y-[-1rem]">
          <CardContent className="flex flex-col h-full items-center justify-center gap-12 p-6">
            <header className="relative self-stretch">
              <h1 className="font-solway font-bold text-[#0A090B] text-[32px] text-center tracking-[-0.96px] leading-[38.4px]">
                Add a profile
              </h1>
            </header>
            <div className="grid grid-cols-2 mx-auto gap-2 ">
              <div className="flex items-center justify-center gap-3 relative  ">
                <div className="relative flex flex-col gap-2.5 items-center p-6 px-14 justify-center h-auto bg-[#F8F8FA] rounded-[10px] hover:bg-gray-50 transition-colors">
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
                      className="rounded-full w-20"
                    />
                  </div>
                  <p className="font-sans-serifbookflf font-medium">
                    Profile 1
                  </p>
                  <Button
                    onClick={handleProceed}
                    className="rounded-sm bg-[#DDB5D2] hover:bg-[#DDA5D2] text-primary"
                  >
                    Proceed
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-center gap-3 relative  ">
                <div
                  onClick={() => navigate("/create-profile")}
                  className="cursor-pointer flex flex-col gap-4 items-center p-4 px-8 justify-center h-auto bg-white rounded-[10px] border-[0.5px] border-solid border-[#cfd4dc] shadow-shadow-elevation-1-e-1-rest-state hover:bg-gray-50 transition-colors"
                >
                  <PlusCircleIcon size={60} className=" text-[#aa468e]" />
                  <span className="font-sans-serifbookflf font-medium text-[#0A090B] text-[24px] text-center tracking-[-0.96px] leading-[38.4px]">
                    Add Profile
                  </span>
                </div>
              </div>
            </div>

            <Card className="h-[50px] px-2 w-full bg-white rounded-[10px] border border-solid border-[#cfd4dc] shadow-shadow-elevation-1-e-1-rest-state">
              <CardContent className="flex h-full items-center gap-2 px-3.5 py-2.5 p-0">
                <div className="flex w-[492px] items-center gap-2 relative">
                  <Avatar className="w-9 h-9">
                    <AvatarImage src="/images/avatar.png" alt="User avatar" />
                  </Avatar>
                  <div className="relative flex-1 font-solway ">
                    <span className="text-[#9ca3a9] ">Welcome back, </span>
                    <span className=" text-[#081a28] font-semibold ">
                      adebalanced04@gmail.com
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  className="h-auto p-0 font-text-12-normal-normal font-[number:var(--text-12-normal-normal-font-weight)] text-[#aa468e] text-[length:var(--text-12-normal-normal-font-size)] tracking-[var(--text-12-normal-normal-letter-spacing)] leading-[var(--text-12-normal-normal-line-height)] [font-style:var(--text-12-normal-normal-font-style)] hover:bg-transparent hover:text-[#aa468e]/80 transition-colors"
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
