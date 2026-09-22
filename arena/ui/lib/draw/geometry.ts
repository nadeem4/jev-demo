// highway-env: x is metres along the road, y is metres across it (lane i centred at y = 4i).
export const LANES = 4;
export const LANE_W = 4;
export const CAR_L = 5;
export const CAR_W = 2;
const SHOULDER = 1.5;
const EGO_AT = 0.75; // ego car sits 75% down the view, so most of the view is road ahead

export function viewport({ width, height, egoX }: { width: number; height: number; egoX: number }) {
  const scale = width / (LANES * LANE_W + 2 * SHOULDER);
  const sx = (y: number) => (y + LANE_W / 2 + SHOULDER) * scale;
  const sy = (x: number) => height * EGO_AT - (x - egoX) * scale;
  return {
    scale,
    sx,
    sy,
    laneCenter: (lane: number) => sx(lane * LANE_W),
    roadLeft: sx(-LANE_W / 2),
    roadRight: sx((LANES - 0.5) * LANE_W),
  };
}
