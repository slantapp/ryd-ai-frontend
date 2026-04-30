import { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import SubscriptionContentServer from "@/components/settings/SubscriptionContentServer";
import InstructorContent from "@/components/settings/InstructorContent";
import { cn } from "@/lib/utils";
import { ChevronLeft } from "lucide-react";

type GateView = "instructors" | "subscribe";

const shellDialogContentClass = cn(
  "flex min-h-0 min-w-0 flex-col gap-0 overflow-hidden border-0 p-0 shadow-xl",
  "top-[max(0.5rem,env(safe-area-inset-top,0px))] max-h-[calc(100dvh-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px)-0.75rem)] w-[calc(100vw-1rem)] max-w-4xl translate-y-0 rounded-xl",
  "min-[480px]:w-[calc(100vw-1.25rem)] min-[480px]:max-w-4xl",
  "sm:top-1/2 sm:max-h-[min(calc(100dvh-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px)-1.5rem),920px)] sm:w-[min(calc(100vw-1.5rem),56rem)] sm:max-w-[min(calc(100vw-1.5rem),56rem)] sm:-translate-y-1/2 sm:rounded-2xl",
  "md:w-[min(calc(100vw-2rem),56rem)] md:max-w-[min(calc(100vw-2rem),56rem)]",
  "lg:max-h-[min(calc(100dvh-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px)-2rem),940px)]"
);

const scrollPaddingClass = cn(
  "min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain py-3 sm:py-4 md:py-5",
  "pl-[max(0.75rem,env(safe-area-inset-left,0px))] pr-[max(0.75rem,env(safe-area-inset-right,0px))]",
  "sm:pl-5 sm:pr-5 md:pl-6 md:pr-6"
);

type SubscriptionGateFlowProps = {
  open: boolean;
  onSubscriptionComplete: () => void;
  onSignOut: () => void;
};

const SubscriptionGateFlow = ({
  open,
  onSubscriptionComplete,
  onSignOut,
}: SubscriptionGateFlowProps) => {
  const [view, setView] = useState<GateView>("instructors");
  const [hasPreviewedInstructor, setHasPreviewedInstructor] = useState(true);
  const [speechEnabled, setSpeechEnabled] = useState(true);

  const handleInstructorEngaged = useCallback(() => {
    setHasPreviewedInstructor(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setView("instructors");
      setHasPreviewedInstructor(true);
      setSpeechEnabled(true);
    }
  }, [open]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) return;
      }}
    >
      <DialogContent
        showCloseButton={false}
        className={shellDialogContentClass}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {view === "instructors" ? (
          <>
            <DialogHeader className="shrink-0 space-y-1 border-b border-gray-100 px-4 pb-3 pt-4 text-left sm:px-6 sm:pb-4 sm:pt-5">
              <DialogTitle className="font-solway text-lg sm:text-xl">
                Meet your AI instructors
              </DialogTitle>
              <DialogDescription className="font-inter text-sm text-gray-600">
                Hover or tap an instructor to hear a quick intro to the
                platform. When you are ready, continue to choose a plan.
              </DialogDescription>
            </DialogHeader>

            <div className={scrollPaddingClass}>
              <InstructorContent
                hideHeader
                gateIntroMode
                speechEnabled={speechEnabled}
                onInstructorEngaged={handleInstructorEngaged}
              />
            </div>

            <div
              className={cn(
                "flex shrink-0 flex-col gap-2 border-t border-gray-100 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4",
                "pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]"
              )}
            >
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="font-inter text-gray-600 sm:order-1"
                onClick={onSignOut}
              >
                Sign out
              </Button>
              <div className="order-first flex w-full flex-col gap-1.5 sm:order-2 sm:w-auto sm:items-end">
                <Button
                  type="button"
                  className="w-full rounded-xl bg-[#DDB5D2] font-solway text-primary hover:bg-[#DDA5D2] sm:w-auto"
                  disabled={!hasPreviewedInstructor}
                  onClick={() => {
                    setSpeechEnabled(false);
                    // Give InstructorContent a tick to synchronously stop speech before unmount.
                    setTimeout(() => setView("subscribe"), 0);
                  }}
                >
                  Proceed to subscribe
                </Button>
                {!hasPreviewedInstructor && (
                  <p className="text-center font-inter text-xs text-gray-500 sm:text-right">
                    Preview an instructor first (hover or tap).
                  </p>
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            <DialogHeader className="sr-only">
              <DialogTitle>Choose a subscription plan</DialogTitle>
              <DialogDescription>
                Select a plan and complete checkout to access the dashboard.
              </DialogDescription>
            </DialogHeader>

            <div className="flex shrink-0 items-center gap-2 border-b border-gray-100 px-4 py-3 sm:px-6 sm:py-4">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="shrink-0 gap-1 px-2 font-inter text-gray-700"
                onClick={() => {
                  setSpeechEnabled(true);
                  setView("instructors");
                }}
              >
                <ChevronLeft className="size-4" aria-hidden />
                Back to instructors
              </Button>
            </div>

            <div className={scrollPaddingClass}>
              <SubscriptionContentServer
                gateMode
                onSubscriptionComplete={onSubscriptionComplete}
              />
            </div>

            <div
              className={cn(
                "shrink-0 border-t border-gray-100 bg-white px-4 py-3 text-center sm:px-6",
                "pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]"
              )}
            >
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="font-inter text-gray-600"
                onClick={onSignOut}
              >
                Sign out and use a different account
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SubscriptionGateFlow;
