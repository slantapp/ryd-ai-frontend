import { cn } from "@/lib/utils";
import {
  diagramAlt,
  diagramToDataUrl,
  isMathDiagram,
  type MathDiagram as MathDiagramData,
} from "@/utils/mathDiagram";

interface MathDiagramProps {
  diagram: MathDiagramData | unknown;
  className?: string;
}

/** Renders a maths curriculum `diagram` as a safe <img> data-URL. */
export default function MathDiagram({ diagram, className }: MathDiagramProps) {
  if (!isMathDiagram(diagram)) return null;
  const src = diagramToDataUrl(diagram);
  if (!src) {
    return (
      <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
        Diagram kind &quot;{diagram.kind}&quot; is not drawn yet
        {diagram.alt ? `: ${diagram.alt}` : "."}
      </p>
    );
  }

  return (
    <figure className={cn("min-w-0", className)}>
      <img
        src={src}
        alt={diagramAlt(diagram)}
        className="mx-auto max-h-72 w-full max-w-full rounded-lg border border-primary/10 bg-white object-contain"
      />
      {diagram.alt ? (
        <figcaption className="mt-1.5 text-center text-xs text-gray-500">
          {diagram.alt}
        </figcaption>
      ) : null}
    </figure>
  );
}
