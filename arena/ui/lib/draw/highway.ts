import type { FrameView } from "../playback";
import type { Frame } from "../types";
import { cssVar, prepare } from "./canvas";
import { CAR_L, CAR_W, LANE_W, LANES, viewport } from "./geometry";

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Smooth motion between decisions. Frames list nearby cars in a stable order; a car
 * that jumped far between frames is a different car, so it snaps instead of sliding. */
export function lerpFrame(prev: Frame, next: Frame, t: number): Frame {
  const ego = { ...next.ego, x: lerp(prev.ego.x, next.ego.x, t), y: lerp(prev.ego.y, next.ego.y, t), heading: lerp(prev.ego.heading, next.ego.heading, t) };
  const others = next.others.map((o, i) => {
    const p = prev.others[i];
    return p && Math.abs(p.x - o.x) < 60 ? { ...o, x: lerp(p.x, o.x, t), y: lerp(p.y, o.y, t) } : o;
  });
  return { ego, others };
}

/** Top-down horizontal road: the model's car drives towards the right edge. */
export function drawHighway(canvas: HTMLCanvasElement, view: FrameView | null, ended: boolean) {
  const { g, w, h } = prepare(canvas);
  g.fillStyle = cssVar("--asphalt");
  g.fillRect(0, 0, w, h);
  const frame = view ? lerpFrame(view.prev as unknown as Frame, view.next as unknown as Frame, view.t) : null;

  const egoX = frame?.ego.x ?? 0;
  const v = viewport({ width: w, height: h, egoX });
  g.strokeStyle = "rgba(245, 247, 245, 0.85)";
  g.lineWidth = 2;
  for (const y of [v.roadTop, v.roadBottom]) {
    g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke();
  }
  g.setLineDash([3 * v.scale, 6 * v.scale]);
  g.lineDashOffset = (egoX % 9) * v.scale;  // dashes scroll with the world so speed is visible
  for (let i = 1; i < LANES; i++) {
    const y = v.y((i - 0.5) * LANE_W);
    g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke();
  }
  g.setLineDash([]);
  if (!frame) return;

  const car = (x: number, y: number, heading: number, fill: string) => {
    g.save();
    g.translate(v.x(x), v.y(y));
    g.rotate(heading);
    g.fillStyle = fill;
    g.beginPath();
    g.roundRect((-CAR_L / 2) * v.scale, (-CAR_W / 2) * v.scale, CAR_L * v.scale, CAR_W * v.scale, 0.5 * v.scale);
    g.fill();
    g.restore();
  };
  for (const o of frame.others) car(o.x, o.y, o.heading, cssVar("--traffic"));
  car(frame.ego.x, frame.ego.y, frame.ego.heading, ended && frame.ego.crashed ? cssVar("--danger") : cssVar("--marking"));
}
