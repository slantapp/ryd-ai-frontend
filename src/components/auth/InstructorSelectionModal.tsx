import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import InstructorContent from "@/components/settings/InstructorContent";
import { useInstructorStore } from "@/stores/instructorStore";

interface InstructorSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContinue: () => void;
}

const InstructorSelectionModal = ({
  open,
  onOpenChange,
  onContinue,
}: InstructorSelectionModalProps) => {
  const { selectedInstructor } = useInstructorStore();

  const handleContinue = () => {
    onContinue();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-full max-h-[90vh] overflow-y-auto scrollbar-hide">
        <DialogHeader>
          <DialogTitle className="font-solway text-2xl">
            Select Your Instructor
          </DialogTitle>
          <DialogDescription className="font-sans-serifbookflf">
            Choose your preferred instructor for your courses. Hover over each
            option to see a preview.
          </DialogDescription>
        </DialogHeader>

        <InstructorContent hideHeader={true} />

        <DialogFooter>
          <Button
            onClick={handleContinue}
            disabled={!selectedInstructor}
            className="bg-[#DDB5D2] hover:bg-[#DDA5D2] text-primary"
          >
            Continue to Dashboard
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default InstructorSelectionModal;
