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
        <DialogContent className="max-w-md gap-0 overflow-hidden rounded-3xl border border-[#EADCE8] bg-white p-0 shadow-[0_20px_50px_-20px_rgba(170,70,142,0.4)]">
          <div
            className="border-b border-t-4 border-b-[#F3E4EF] bg-linear-to-br from-[#F8EAF3] via-[#FAF5FF] to-[#F3ECFE] px-6 pb-5 pt-6"
            style={{ borderTopColor: unit.palette.base }}
          >
            <p
              className="inline-block rounded-full bg-white px-2.5 py-0.5 font-inter text-[11px] font-bold uppercase tracking-[0.14em] shadow-[0_2px_6px_-3px_rgba(170,70,142,0.4)]"
              style={{ color: unit.palette.shade }}
            >
              Guidebook
            </p>
            <DialogTitle className="mt-1 font-solway text-xl font-bold text-[#132050]">{unit.title}</DialogTitle>
            <DialogDescription className="mt-1 font-inter text-sm text-[#5C5468]">{unit.description}</DialogDescription>
          </div>
          <div className="space-y-5 p-6">
            <div>
              <h4 className="mb-2 font-solway text-sm font-bold text-[#132050]">In this unit</h4>
              <ul className="space-y-2">
                {unit.nodes.map((n) => {
                  const Icon = NODE_ICONS[n.type];
                  return (
                    <li key={n.id} className="flex items-center gap-2.5 font-inter text-sm text-[#5C5468]">
                      <span
                        className="flex size-7 shrink-0 items-center justify-center rounded-xl"
                        style={{ background: unit.palette.soft }}
                      >
                        <Icon className="size-4" style={{ color: unit.palette.base }} />
                      </span>
                      <span className="flex-1 truncate">{n.title}</span>
                      <span className="rounded-full bg-[#F3ECFE] px-2 py-0.5 text-xs font-semibold text-[#6A55D8]">~{n.minutes} min</span>
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
