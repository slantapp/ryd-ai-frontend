import type { Dispatch, SetStateAction } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuthStore } from "@/stores/authStore";
import { PUBLIC_PATHS } from "@/utils/routePaths";
import { cn } from "@/lib/utils";

type SignOutModalProps = {
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  /** e.g. close TopNav profile popover when opening / after signing out */
  onRequestClose?: () => void;
};

const SignOutModal = ({
  isOpen,
  setIsOpen,
  onRequestClose,
}: SignOutModalProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const logout = useAuthStore((s) => s.logout);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      onRequestClose?.();
    }
  };

  const handleConfirmSignOut = () => {
    logout();
    try {
      useAuthStore.persist.clearStorage();
    } catch {
      /* persist may be unavailable in edge cases */
    }
    queryClient.clear();
    setIsOpen(false);
    onRequestClose?.();
    toast.success("You've been signed out.");
    navigate(PUBLIC_PATHS.LOGIN, { replace: true });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn(
          "gap-0 overflow-hidden rounded-[20px] border-0 p-0 shadow-lg sm:max-w-[400px]",
        )}
        showCloseButton
      >
        <div className="bg-linear-to-b from-[#F3ECFE]/80 to-white px-6 pb-2 pt-8 text-center">
          <div
            className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-primary/10"
            aria-hidden
          >
            <LogOut className="size-7 text-primary" strokeWidth={2} />
          </div>
          <DialogHeader className="mt-5 space-y-2 text-center sm:text-center">
            <DialogTitle className="font-solway text-xl font-bold text-[#0A090B]">
              Sign out?
            </DialogTitle>
            <DialogDescription className="font-inter text-sm leading-relaxed text-[#4F4D55]">
              You&apos;ll need to sign in again to access your dashboard, courses,
              and progress.
            </DialogDescription>
          </DialogHeader>
        </div>

        <DialogFooter className="flex-col-reverse gap-2 border-t border-[#0A090B]/5 bg-[#FAFAFB] px-6 py-4 sm:flex-row sm:justify-stretch sm:gap-3">
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full rounded-xl border-[#E8E8EC] bg-white font-inter font-medium text-[#0A090B] hover:bg-[#F8F8FA] sm:flex-1"
            onClick={() => handleOpenChange(false)}
          >
            Stay signed in
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="h-11 w-full rounded-xl font-solway font-semibold shadow-sm sm:flex-1"
            onClick={handleConfirmSignOut}
          >
            Sign out
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SignOutModal;
