import type { ReactNode } from "react";
import MathText from "@/components/courses/math/MathText";
import { RichBody } from "../RichBody";
import { applySubtitleShow } from "../../subtitleShow";
import type { Beat, DisplayBeat, MediaBeat, RecapBeat, SpeakBeat } from "../../types";
import { phaseMeta } from "../../phaseStyles";

/** Simple content panel — clear for kids, no decorative card chrome. */
function Panel({
  children,
  label,
}: {
  children: ReactNode;
  label?: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-primary/15 bg-white p-3 shadow-sm sm:p-4">
      {label && (
        <p className="mb-1.5 text-[0.7rem] font-semibold uppercase tracking-wide text-primary">
          {label}
        </p>
      )}
      {children}
    </div>
  );
}

export function SpeakBeatView({ beat }: { beat: SpeakBeat }) {
  const meta = phaseMeta(beat.phase);
  return (
    <Panel label={meta?.label ?? "Listen"}>
      <p className="text-sm leading-relaxed text-gray-800 sm:text-base">
        <MathText>
          {applySubtitleShow(beat.avatar.text, beat.avatar.show)}
        </MathText>
      </p>
    </Panel>
  );
}

export function DisplayBeatView({ beat }: { beat: DisplayBeat }) {
  const meta = phaseMeta(beat.phase);
  return (
    <Panel label={meta?.label ?? "Learn"}>
      {beat.title && (
        <h2 className="mb-2 text-base font-bold text-gray-900 sm:text-lg">
          <MathText>{beat.title}</MathText>
        </h2>
      )}
      <RichBody text={beat.body} />
    </Panel>
  );
}

export function MediaBeatView({ beat }: { beat: MediaBeat }) {
  return (
    <Panel label="Look">
      {beat.media.image ? (
        <img
          src={beat.media.image}
          alt={beat.media.alt ?? "Lesson picture"}
          className="max-h-72 w-full rounded-lg border border-gray-200 object-contain bg-gray-50"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      ) : null}
      {beat.media.alt && (
        <p className="mt-3 text-sm text-gray-600">{beat.media.alt}</p>
      )}
      {beat.media.video && (
        <video
          src={beat.media.video}
          controls
          className="mt-3 w-full rounded-lg border border-gray-200"
        />
      )}
    </Panel>
  );
}

export function RecapBeatView({ beat }: { beat: RecapBeat }) {
  return (
    <Panel label="You learned">
      <ul className="space-y-2">
        {beat.points.map((point, i) => (
          <li key={i} className="flex gap-2.5 text-sm text-gray-800">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
              {i + 1}
            </span>
            <span className="pt-0.5">
              <MathText>{point}</MathText>
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export function PauseBeatView({
  beat,
  secondsLeft,
}: {
  beat: Beat;
  secondsLeft: number;
}) {
  return (
    <Panel label="Pause">
      <p className="text-sm text-gray-800 sm:text-base">
        {applySubtitleShow(
          beat.avatar?.text ?? "Look at the screen, then continue when you're ready.",
          beat.avatar?.show,
        )}
      </p>
      {secondsLeft > 0 && (
        <p className="mt-3 text-sm font-medium text-primary">
          Continue in {secondsLeft}s…
        </p>
      )}
    </Panel>
  );
}

export function DemoIntro({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="rounded-xl border border-primary/15 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">
        {title}
      </p>
      {description && (
        <p className="mt-1 text-sm text-gray-600">
          <MathText>{description}</MathText>
        </p>
      )}
    </div>
  );
}

export { Panel };
