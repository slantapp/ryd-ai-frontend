type Point = { x: number; y: number };

function pointAt(t: number): Point {
  const clamped = Math.min(1, Math.max(0, t));
  return {
    x: 36 + clamped * 928,
    y: 98 + Math.sin(clamped * Math.PI * 2.15) * 46,
  };
}

function curve(samples: Point[]): string {
  if (!samples.length) return "";
  return samples
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");
}

/**
 * Winding path for the home hero. Done lessons are filled, the current one
 * shows a play marker, and the last node is the certificate.
 */
export function PathMap({
  completed,
  total,
  finished,
}: {
  completed: number;
  total: number;
  finished: boolean;
}) {
  const stops = Math.min(6, Math.max(3, total > 0 ? Math.min(total, 6) : 4));
  const doneStops = finished
    ? stops
    : total > 0
      ? Math.min(stops - 1, Math.round((completed / Math.max(total, 1)) * stops))
      : 0;
  const current = finished ? stops : doneStops;

  const samples = Array.from({ length: 48 }, (_, i) => pointAt(i / 47));
  const doneT = current <= 0 ? 0 : current / stops;
  const doneSamples = samples.filter((_, i) => i / 47 <= doneT + 0.001);
  const nodes = Array.from({ length: stops }, (_, i) => pointAt((i + 0.5) / stops));
  const end = pointAt(1);

  const youAreHere = !finished && current < stops ? nodes[current] : null;

  return (
    <svg
      role="img"
      aria-label={
        finished
          ? "Path complete, certificate earned"
          : `${completed} lessons done, you are on lesson ${completed + 1}${total ? ` of ${total}` : ""}`
      }
      viewBox="0 0 1000 180"
      width="100%"
      className="block max-h-[190px]"
    >
      <path d={curve(samples)} fill="none" stroke="#4A4878" strokeWidth="4" strokeDasharray="2 10" strokeLinecap="round" />
      {doneSamples.length > 1 ? (
        <path d={curve(doneSamples)} fill="none" stroke="#E7A9D6" strokeWidth="4" strokeLinecap="round" />
      ) : null}

      {nodes.map((node, i) => {
        if (youAreHere && i === current) return null;
        const done = i < current;
        return done ? (
          <g key={i}>
            <circle cx={node.x} cy={node.y} r="16" fill="#E7A9D6" />
            <path
              d={`M ${node.x - 6} ${node.y} l 4 4 l 8 -9`}
              fill="none"
              stroke="#1C1B3A"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        ) : (
          <g key={i}>
            <circle cx={node.x} cy={node.y} r="13" fill="#1C1B3A" stroke="#5B5986" strokeWidth="2" />
            <circle cx={node.x} cy={node.y} r="3" fill="#5B5986" />
          </g>
        );
      })}

      <circle
        cx={end.x}
        cy={end.y}
        r="20"
        fill={finished ? "#E7A9D6" : "#2A2950"}
        stroke="#E7A9D6"
        strokeWidth="2"
        strokeDasharray={finished ? undefined : "4 4"}
      />
      <path
        d={`M ${end.x} ${end.y - 9} l 2.6 5.6 6 .7 -4.5 4.1 1.2 6 -5.3 -3 -5.3 3 1.2 -6 -4.5 -4.1 6 -.7 z`}
        fill={finished ? "#1C1B3A" : "#E7A9D6"}
      />
      <text x={end.x} y={end.y + 40} textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="13" fill="#CFCBE0">
        Certificate
      </text>

      {youAreHere ? (
        <g>
          <text
            x={youAreHere.x}
            y={youAreHere.y - 42}
            textAnchor="middle"
            fontFamily="Inter, sans-serif"
            fontSize="13"
            fontWeight="700"
            fill="#E7A9D6"
          >
            You are here
          </text>
          <circle cx={youAreHere.x} cy={youAreHere.y} r="30" fill="#E7A9D6" opacity="0.35" />
          <circle cx={youAreHere.x} cy={youAreHere.y} r="26" fill="#FFFFFF" />
          <path d={`M ${youAreHere.x - 6} ${youAreHere.y - 10} v 20 l 17 -10 z`} fill="#1C1B3A" />
        </g>
      ) : null}
    </svg>
  );
}
