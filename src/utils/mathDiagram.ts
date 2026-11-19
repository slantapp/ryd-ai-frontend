/** Curriculum diagram payloads for maths display / question cards. */

export type MathDiagramSvg = {
  kind: "svg";
  svg: string;
  alt: string;
};

export type MathDiagramNumberLine = {
  kind: "number_line";
  min: number;
  max: number;
  step?: number;
  labels?: number;
  marks?: Array<{ at: number; label?: string; color?: string }>;
  jumps?: Array<{ from: number; to: number; label?: string }>;
  alt?: string;
};

export type MathDiagram = MathDiagramSvg | MathDiagramNumberLine | {
  kind: string;
  alt?: string;
  svg?: string;
  [key: string]: unknown;
};

export function isMathDiagram(value: unknown): value is MathDiagram {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as MathDiagram).kind === "string"
  );
}

/** Safe data-URL for an authored SVG string (no script execution via <img>). */
export function svgToDataUrl(svg: string): string {
  const trimmed = svg.trim();
  const withNs = /xmlns=/.test(trimmed)
    ? trimmed
    : trimmed.replace(
        /^<svg\b/i,
        '<svg xmlns="http://www.w3.org/2000/svg"',
      );
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(withNs)}`;
}

/** Build a simple number-line SVG from structured data. */
export function buildNumberLineSvg(d: MathDiagramNumberLine): string {
  const min = Number(d.min);
  const max = Number(d.max);
  const step = d.step && d.step > 0 ? d.step : 1;
  const width = 420;
  const height = 110;
  const padX = 28;
  const axisY = 58;
  const usable = width - padX * 2;
  const span = Math.max(max - min, step);
  const xAt = (n: number) => padX + ((n - min) / span) * usable;

  const ticks: string[] = [];
  for (let n = min; n <= max + 1e-9; n += step) {
    const x = xAt(n);
    const showLabel =
      d.labels == null || d.labels <= 1
        ? true
        : Math.abs((n - min) / d.labels - Math.round((n - min) / d.labels)) <
          1e-9 ||
          n === min ||
          n === max;
    ticks.push(
      `<line x1="${x}" y1="${axisY - 8}" x2="${x}" y2="${axisY + 8}" stroke="#334155" stroke-width="2"/>`,
    );
    if (showLabel) {
      ticks.push(
        `<text x="${x}" y="${axisY + 28}" text-anchor="middle" font-size="14" font-family="system-ui,sans-serif" fill="#0f172a">${n}</text>`,
      );
    }
  }

  const marks = (d.marks ?? [])
    .map((m) => {
      const x = xAt(Number(m.at));
      const color = m.color || "#2563eb";
      const label = m.label ? escapeXml(String(m.label)) : "";
      return (
        `<circle cx="${x}" cy="${axisY}" r="8" fill="${color}"/>` +
        (label
          ? `<text x="${x}" y="${axisY - 16}" text-anchor="middle" font-size="18">${label}</text>`
          : "")
      );
    })
    .join("");

  const jumps = (d.jumps ?? [])
    .map((j) => {
      const x1 = xAt(Number(j.from));
      const x2 = xAt(Number(j.to));
      const mid = (x1 + x2) / 2;
      const lift = 28;
      const label = j.label ? escapeXml(String(j.label)) : "";
      return (
        `<path d="M ${x1} ${axisY - 10} Q ${mid} ${axisY - 10 - lift} ${x2} ${axisY - 10}" fill="none" stroke="#ea580c" stroke-width="2.5"/>` +
        `<polygon points="${x2 - 6},${axisY - 16} ${x2},${axisY - 8} ${x2 - 6},${axisY - 4}" fill="#ea580c"/>` +
        (label
          ? `<text x="${mid}" y="${axisY - 10 - lift - 4}" text-anchor="middle" font-size="12" fill="#c2410c">${label}</text>`
          : "")
      );
    })
    .join("");

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img">` +
    `<line x1="${padX}" y1="${axisY}" x2="${width - padX}" y2="${axisY}" stroke="#0f172a" stroke-width="3" stroke-linecap="round"/>` +
    ticks.join("") +
    jumps +
    marks +
    `</svg>`
  );
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function diagramAlt(diagram: MathDiagram): string {
  if (typeof diagram.alt === "string" && diagram.alt.trim()) {
    return diagram.alt.trim();
  }
  if (diagram.kind === "number_line") {
    const d = diagram as MathDiagramNumberLine;
    return `A number line from ${d.min} to ${d.max}`;
  }
  return "Maths diagram";
}

export function diagramToDataUrl(diagram: MathDiagram): string | null {
  if (diagram.kind === "svg" && typeof diagram.svg === "string") {
    return svgToDataUrl(diagram.svg);
  }
  if (diagram.kind === "number_line") {
    return svgToDataUrl(buildNumberLineSvg(diagram as MathDiagramNumberLine));
  }
  if (typeof diagram.svg === "string" && diagram.svg.trim()) {
    return svgToDataUrl(diagram.svg);
  }
  return null;
}
