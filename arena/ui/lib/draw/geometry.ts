// highway-env: x is metres along the road, y is metres across it (lane i centred at y = 4i).
export const LANES = 4;
export const LANE_W = 4;
export const CAR_L = 5;
export const CAR_W = 2;
const SHOULDER = 1.5;
const EGO_AT = 0.25; // ego car sits 25% across the view, so most of the view is road ahead

/** The road runs left to right: metres along it map to screen x, metres across it to screen y. */
export function viewport({ width, height, egoX }: { width: number; height: number; egoX: number }) {
  const scale = height / (LANES * LANE_W + 2 * SHOULDER);
  const y = (across: number) => (across + LANE_W / 2 + SHOULDER) * scale;
  const x = (along: number) => width * EGO_AT + (along - egoX) * scale;
  return {
    scale,
    x,
    y,
    laneCenter: (lane: number) => y(lane * LANE_W),
    roadTop: y(-LANE_W / 2),
    roadBottom: y((LANES - 0.5) * LANE_W),
  };
}
