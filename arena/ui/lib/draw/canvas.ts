export const cssVar = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

/** Sizes the canvas for the device pixel ratio and returns a context in CSS pixels. */
export function prepare(canvas: HTMLCanvasElement) {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
    canvas.width = w * dpr;
    canvas.height = h * dpr;
  }
  const g = canvas.getContext("2d")!;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { g, w, h };
}
