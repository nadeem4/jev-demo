import type { FrameView } from "../playback";
import { cssVar, prepare } from "./canvas";

interface SnakeFrame { size: number; snake: [number, number][]; food: [number, number]; heading: string; dead: boolean }

/** Grid board. Snake moves are discrete, so it draws the latest frame without sliding. */
export function drawSnake(canvas: HTMLCanvasElement, view: FrameView | null) {
  const { g, w, h } = prepare(canvas);
  g.fillStyle = cssVar("--asphalt");
  g.fillRect(0, 0, w, h);
  const f = (view?.next ?? null) as unknown as SnakeFrame | null;
  const size = f?.size ?? 10;
  const cell = Math.min(w, h) / size;
  const ox = (w - cell * size) / 2, oy = (h - cell * size) / 2;

  g.strokeStyle = "rgba(245, 247, 245, 0.08)";
  g.lineWidth = 1;
  for (let i = 0; i <= size; i++) {
    g.beginPath(); g.moveTo(ox + i * cell, oy); g.lineTo(ox + i * cell, oy + size * cell); g.stroke();
    g.beginPath(); g.moveTo(ox, oy + i * cell); g.lineTo(ox + size * cell, oy + i * cell); g.stroke();
  }
  if (!f) return;

  const box = (x: number, y: number, fill: string, inset: number) => {
    g.fillStyle = fill;
    g.beginPath();
    g.roundRect(ox + x * cell + inset, oy + y * cell + inset, cell - 2 * inset, cell - 2 * inset, cell * 0.2);
    g.fill();
  };
  box(f.food[0], f.food[1], cssVar("--clear"), cell * 0.22);
  f.snake.slice(1).forEach(([x, y]) => box(x, y, cssVar("--traffic"), cell * 0.08));
  box(f.snake[0][0], f.snake[0][1], f.dead ? cssVar("--danger") : cssVar("--marking"), cell * 0.04);
}
