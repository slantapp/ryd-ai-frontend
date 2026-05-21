import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle } from "lucide-react";

export type CheckoutReturnVariant = "success" | "cancelled";

type SubscriptionCheckoutReturnDialogProps = {
  variant: CheckoutReturnVariant | null;
  onDismiss: () => void;
  /** Cancelled flow: jump to plan selection in SubscriptionGateFlow */
  onSubscribeAgain: () => void;
};

export default function SubscriptionCheckoutReturnDialog({
  variant,
  onDismiss,
  onSubscribeAgain,
}: SubscriptionCheckoutReturnDialogProps) {
  const open = variant !== null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onDismiss();
      }}
    >
      <DialogContent
        showCloseButton
        overlayClassName="z-9998"
        className="z-9999 max-w-md rounded-2xl sm:max-w-md"
      >
        {variant === "success" && (
          <>
            <DialogHeader className="space-y-3 sm:text-left">
              <div className="flex justify-center sm:justify-start">
                <span className="flex size-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <CheckCircle2 className="size-9" aria-hidden />
                </span>
              </div>
              <DialogTitle className="font-solway text-xl text-gray-900">
                Payment received
              </DialogTitle>
              <DialogDescription className="font-inter text-base text-gray-600">
                We&apos;re activating your subscription. This can take a few
                seconds—stay on this page. You&apos;ll get full access as soon
                as it&apos;s ready, and this message will close on its own.
              </DialogDescription>
            </DialogHeader>
          </>
        )}

        {variant === "cancelled" && (
          <>
            <DialogHeader className="space-y-3 sm:text-left">
              <div className="flex justify-center sm:justify-start">
                <span className="flex size-14 items-center justify-center rounded-full bg-amber-50 text-amber-700">
                  <XCircle className="size-9" aria-hidden />
                </span>
              </div>
              <DialogTitle className="font-solway text-xl text-gray-900">
                Checkout cancelled
              </DialogTitle>
              <DialogDescription className="font-inter text-base text-gray-600">
                No worries—you weren&apos;t charged. When you&apos;re ready, you
                can pick a plan and try checkout again.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="w-full rounded-xl font-inter sm:w-auto"
                onClick={onDismiss}
              >
                Not now
              </Button>
              <Button
                type="button"
                className="w-full rounded-xl bg-primary font-solway sm:w-auto"
                onClick={() => {
                  onSubscribeAgain();
                  onDismiss();
                }}
              >
                Choose a plan
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
