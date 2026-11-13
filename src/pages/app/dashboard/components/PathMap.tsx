type Point = { x: number; y: number };

function pointAt(t: number): Point {
  const clamped = Math.min(1, Math.max(0, t));
  return {
    x: 48 + clamped * 900,
    y: 112 + Math.sin(clamped * Math.PI * 2.05) * 30,
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
      viewBox="0 0 1000 196"
      width="100%"
      className="block max-h-[210px]"
    >
      <defs>
        <radialGradient id="pathHereGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
          <stop offset="42%" stopColor="#F6B6E4" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#F23CAD" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="pathCertGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFE08A" stopOpacity="0.95" />
          <stop offset="45%" stopColor="#F5B423" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#F5B423" stopOpacity="0" />
        </radialGradient>
      </defs>
      <path d={curve(samples)} fill="none" stroke="rgba(255,186,230,0.45)" strokeWidth="3" strokeDasharray="1.6 8" strokeLinecap="round" />
      {doneSamples.length > 1 ? (
        <path d={curve(doneSamples)} fill="none" stroke="#F7B6E2" strokeWidth="3.5" strokeDasharray="1.6 8" strokeLinecap="round" />
      ) : null}

      {nodes.map((node, i) => {
        if (youAreHere && i === current) return null;
        const done = i < current;
        return done ? (
          <g key={i}>
            <circle cx={node.x} cy={node.y} r="15" fill="#F4A6D8" />
            <path
              d={`M ${node.x - 5.5} ${node.y} l 3.5 3.5 l 7.5 -8`}
              fill="none"
              stroke="#3A1248"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        ) : (
          <g key={i}>
            <circle cx={node.x} cy={node.y} r="15" fill="#2A1844" stroke="rgba(255,255,255,0.28)" strokeWidth="1.5" />
            <text
              x={node.x}
              y={node.y + 4.5}
              textAnchor="middle"
              fontFamily="Inter, sans-serif"
              fontSize="13"
              fontWeight="700"
              fill="#FFFFFF"
            >
              {i + 1}
            </text>
          </g>
        );
      })}

      <circle cx={end.x} cy={end.y} r="34" fill="url(#pathCertGlow)" />
      <circle cx={end.x} cy={end.y} r="16" fill={finished ? "#FFE7A3" : "#F6C453"} />
      <path
        d={`M ${end.x} ${end.y - 7.5} l 2.1 4.6 5 .6 -3.7 3.4 1 4.9 -4.4 -2.5 -4.4 2.5 1 -4.9 -3.7 -3.4 5 -.6 z`}
        fill="#FFF8E6"
      />
      <text x={end.x} y={end.y + 36} textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="13" fill="rgba(255,255,255,0.82)">
        Certificate
      </text>

      {youAreHere ? (
        <g>
          <rect x={youAreHere.x - 52} y={youAreHere.y - 62} width="104" height="26" rx="13" fill="#F23CAD" />
          <text
            x={youAreHere.x}
            y={youAreHere.y - 44.5}
            textAnchor="middle"
            fontFamily="Inter, sans-serif"
            fontSize="12"
            fontWeight="700"
            fill="#FFFFFF"
          >
            You are here
          </text>
          <circle cx={youAreHere.x} cy={youAreHere.y} r="42" fill="url(#pathHereGlow)" />
          <circle cx={youAreHere.x} cy={youAreHere.y} r="24" fill="#FFFFFF" />
          <path d={`M ${youAreHere.x - 5} ${youAreHere.y - 9} v 18 l 15 -9 z`} fill="#F23CAD" />
        </g>
      ) : null}
    </svg>
  );
}
