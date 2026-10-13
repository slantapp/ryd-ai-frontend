import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { PathUnit } from "../types";
import { NODE_ICONS } from "./icons";

type GuidebookDialogProps = {
  unit: PathUnit | null;
  onClose: () => void;
};

export function GuidebookDialog({ unit, onClose }: GuidebookDialogProps) {
  return (
    <Dialog open={unit !== null} onOpenChange={(o) => !o && onClose()}>
      {unit && (
        <DialogContent className="max-w-md gap-0 overflow-hidden rounded-3xl border border-[#EADCE8] bg-white p-0 shadow-lg">
          <div
            className="border-b border-t-4 border-b-[#F0EEF4] px-6 pb-5 pt-6"
            style={{ borderTopColor: unit.palette.base }}
          >
            <p
              className="font-inter text-[11px] font-bold uppercase tracking-[0.14em]"
              style={{ color: unit.palette.base }}
            >
              Guidebook
            </p>
            <DialogTitle className="mt-1 font-solway text-xl font-bold text-[#132050]">{unit.title}</DialogTitle>
            <DialogDescription className="mt-1 font-inter text-sm text-[#5C5468]">{unit.description}</DialogDescription>
          </div>
          <div className="space-y-5 p-6">
            <div>
              <h4 className="mb-2 font-solway text-sm font-bold text-[#132050]">In this unit</h4>
              <ul className="space-y-1.5">
                {unit.nodes.map((n) => {
                  const Icon = NODE_ICONS[n.type];
                  return (
                    <li key={n.id} className="flex items-center gap-2.5 font-inter text-sm text-[#5C5468]">
                      <Icon className="size-4 shrink-0" style={{ color: unit.palette.base }} />
                      <span className="flex-1 truncate">{n.title}</span>
                      <span className="text-xs font-semibold text-[#736A80]">~{n.minutes} min</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}
