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
}: {
  beat: BridgeBeat;
  isCourseEnd: boolean;
  onNextLesson: () => void;
  onFinish?: () => void;
  canContinue: boolean;
  /** Full-width CTA on small screens (kids / sneak-peek stage). */
  fullWidthCta?: boolean;
}) {
  return (
    <Panel label={isCourseEnd ? "Finished" : "Next up"}>
      <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">
        {isCourseEnd ? "Great job!" : "Ready for the next lesson?"}
      </h2>
      <p className="mt-2 text-base leading-relaxed text-gray-700 sm:text-lg">
        {beat.avatar?.text ??
          (isCourseEnd
            ? "You finished this course. Keep practising!"
            : "Let's keep going.")}
      </p>
      {canContinue && (
        <div className={fullWidthCta ? "mt-5 sm:mt-5" : "mt-5"}>
          <ContinueButton
            label={isCourseEnd ? "Finish" : "Next lesson"}
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
