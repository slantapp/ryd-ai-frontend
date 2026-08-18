import { ContinueButton } from "../ContinueButton";
import { Panel } from "./ContentBeats";
import type { BridgeBeat } from "../../types";

export function BridgeBeatView({
  beat,
  isCourseEnd,
  onNextLesson,
  onFinish,
  canContinue,
  fullWidthCta = false,
  /** Sneak-peek cliffhanger: next content is locked behind subscription. */
  subscribeGate = false,
}: {
  beat: BridgeBeat;
  isCourseEnd: boolean;
  onNextLesson: () => void;
  onFinish?: () => void;
  canContinue: boolean;
  /** Full-width CTA on small screens (kids / sneak-peek stage). */
  fullWidthCta?: boolean;
  subscribeGate?: boolean;
}) {
  const gated = subscribeGate && !isCourseEnd;
  const title = isCourseEnd
    ? "You finished the course!"
    : gated
      ? "Want to see what happens next?"
      : "Ready for the next lesson?";
  const body =
    beat.avatar?.text ??
    (isCourseEnd
      ? "Every lesson complete — that's a huge achievement. Take a moment to celebrate!"
      : gated
        ? "Subscribe to unlock the next lesson and keep building."
        : "Let's keep going.");
  const ctaLabel = isCourseEnd
    ? "Celebrate"
    : gated
      ? "Subscribe to continue"
      : "Next lesson";

  return (
    <Panel label={isCourseEnd ? "Finished" : gated ? "Subscribe" : "Next up"}>
      <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">{title}</h2>
      <p className="mt-2 text-base leading-relaxed text-gray-700 sm:text-lg">
        {body}
      </p>
      {canContinue && (
        <div className={fullWidthCta ? "mt-5 sm:mt-5" : "mt-5"}>
          <ContinueButton
            label={ctaLabel}
            className={
              fullWidthCta
                ? "h-12 w-full text-base sm:h-auto sm:w-auto sm:text-sm"
                : undefined
            }
            onClick={() => {
              if (isCourseEnd) onFinish?.();
              else onNextLesson();
            }}
          />
        </div>
      )}
    </Panel>
  );
}
