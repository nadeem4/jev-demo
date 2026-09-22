import { CAR_L, CAR_W, LANE_W, LANES, viewport } from "./geometry";
import type { Frame } from "./types";

const cssVar = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

/** Draws a top-down vertical road: the model's car drives up the screen. */
export function drawRoad(canvas: HTMLCanvasElement, frame: Frame | null, crashed: boolean) {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
    canvas.width = w * dpr;
    canvas.height = h * dpr;
  }
  const g = canvas.getContext("2d")!;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.fillStyle = cssVar("--asphalt");
  g.fillRect(0, 0, w, h);

  const egoX = frame?.ego.x ?? 0;
  const v = viewport({ width: w, height: h, egoX });

  // Edges solid, lane dividers dashed; dashes scroll with the world so speed is visible.
  g.strokeStyle = "rgba(245, 247, 245, 0.85)";
  g.lineWidth = 2;
  for (const x of [v.roadLeft, v.roadRight]) {
    g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke();
  }
  g.setLineDash([3 * v.scale, 6 * v.scale]);
  g.lineDashOffset = -(egoX % 9) * v.scale;
  for (let i = 1; i < LANES; i++) {
    const x = v.sx((i - 0.5) * LANE_W);
    g.beginPath(); g.moveTo(x, h); g.lineTo(x, 0); g.stroke();
  }
  g.setLineDash([]);
  if (!frame) return;

  const car = (x: number, y: number, heading: number, fill: string) => {
    g.save();
    g.translate(v.sx(y), v.sy(x));
    g.rotate(heading);
    g.fillStyle = fill;
    g.beginPath();
    g.roundRect((-CAR_W / 2) * v.scale, (-CAR_L / 2) * v.scale, CAR_W * v.scale, CAR_L * v.scale, 0.5 * v.scale);
    g.fill();
    g.restore();
  };
  for (const o of frame.others) car(o.x, o.y, o.heading, cssVar("--traffic"));
  car(frame.ego.x, frame.ego.y, frame.ego.heading, crashed ? cssVar("--danger") : cssVar("--marking"));
}
