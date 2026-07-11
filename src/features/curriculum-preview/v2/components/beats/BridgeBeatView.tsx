import { ContinueButton } from "../ContinueButton";
import { Panel } from "./ContentBeats";
import type { BridgeBeat } from "../../types";

export function BridgeBeatView({
  beat,
  isCourseEnd,
  onNextLesson,
  onFinish,
  canContinue,
}: {
  beat: BridgeBeat;
  isCourseEnd: boolean;
  onNextLesson: () => void;
  onFinish?: () => void;
  canContinue: boolean;
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
        <div className="mt-5">
          <ContinueButton
            label={isCourseEnd ? "Finish" : "Next lesson"}
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
