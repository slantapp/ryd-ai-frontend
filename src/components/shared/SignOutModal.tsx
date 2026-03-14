import type { Dispatch, SetStateAction } from "react";
import { Button } from "../ui/button";
import { Dialog, DialogContent } from "../ui/dialog";
import { useAuthStore } from "@/stores/authStore";

const SignOutModal = ({
  isOpen,
  setIsOpen,
}: {
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}) => {
  const handleLogout = useAuthStore((state) => state.logout);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="">
        <div className="text-center p-6  space-y-3">
          <h3 className="font-bold text-lg">
            Are you sure you want to Logout?
          </h3>
          <div onClick={handleLogout}>
            <Button className="bg-destructive py-6 hover:bg-destructive/70 text-white w-full">
              Yes, Logout
            </Button>
          </div>
          <div onClick={() => setIsOpen(false)}>
            <Button className="hover:bg-opacity-[80%] py-6 ease-in-out duration-300 text-[#3A3A3C] text-sm border-2 border-[#E3EDFF] w-full bg-[#F2F2F5]">
              No, Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SignOutModal;
