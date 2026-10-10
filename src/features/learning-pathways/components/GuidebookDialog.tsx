import { Lightbulb } from "lucide-react";
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
        <DialogContent className="max-w-md overflow-hidden rounded-3xl border-0 p-0">
          <div
            className="px-6 pb-5 pt-6 text-white"
            style={{ background: `linear-gradient(120deg, ${unit.palette.base}, ${unit.palette.accent})` }}
          >
            <p className="font-inter text-[11px] font-bold uppercase tracking-[0.14em] text-white/80">Guidebook</p>
            <DialogTitle className="mt-1 font-solway text-xl font-bold text-white">{unit.title}</DialogTitle>
            <DialogDescription className="mt-1 font-inter text-sm text-white/85">{unit.description}</DialogDescription>
          </div>
          <div className="space-y-5 p-6">
            <div>
              <h4 className="mb-2 font-solway text-sm font-bold text-[#132050]">Key ideas</h4>
              <ul className="space-y-2">
                {unit.guide.map((g) => (
                  <li key={g} className="flex items-start gap-2.5 rounded-xl p-3" style={{ background: unit.palette.soft }}>
                    <Lightbulb className="mt-0.5 size-4 shrink-0" style={{ color: unit.palette.base }} />
                    <span className="font-inter text-sm text-[#132050]">{g}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="mb-2 font-solway text-sm font-bold text-[#132050]">In this unit</h4>
              <ul className="space-y-1.5">
                {unit.nodes.map((n) => {
                  const Icon = NODE_ICONS[n.type];
                  return (
                    <li key={n.id} className="flex items-center gap-2.5 font-inter text-sm text-[#4F4D55]">
                      <Icon className="size-4 shrink-0" style={{ color: unit.palette.base }} />
                      <span className="flex-1 truncate">{n.title}</span>
                      <span className="text-xs font-semibold text-[#9C96A8]">~{n.minutes} min</span>
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
