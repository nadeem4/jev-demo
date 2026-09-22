import type { ArenaEvent, Car, EndEvent, Frame, StartEvent, StepEvent } from "./types";

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Plays one road's event stream at a steady pace (one decision per step
 * duration), interpolating car positions between decisions. Events can
 * arrive faster (recordings) or slower (a model still thinking) than playback.
 */
export class Playback {
  start: StartEvent | null = null;
  current: StepEvent | null = null;
  end: EndEvent | null = null;
  failed: string | null = null;
  status = "";
  waiting = false;

  private queue: ArenaEvent[] = [];
  private prev: Frame | null = null;
  private next: Frame | null = null;
  private stepStart = 0;

  get ready() {
    return this.start !== null;
  }

  push(ev: ArenaEvent) {
    if (ev.type === "start") {
      this.start = ev;
      this.prev = this.next = ev.frame;
    } else if (ev.type === "status") {
      this.status = ev.message;
    } else if (ev.type === "error") {
      this.failed = ev.message;
    } else {
      this.queue.push(ev);
    }
  }

  /** Advances playback and returns the interpolated ego car to draw. */
  tick(now: number, stepMs: number, go: boolean): Frame & { ego: Car & { crashed: boolean } } {
    if (!go || !this.next) {
      this.stepStart = now;
      return this.frameAt(0);
    }
    const due = this.current === null || now - this.stepStart >= stepMs;
    if (due && this.queue.length) {
      const ev = this.queue.shift()!;
      if (ev.type === "step") {
        this.prev = this.next;
        this.next = ev.frame;
        this.current = ev;
      } else if (ev.type === "end") {
        this.end = ev;
        this.prev = this.next;
      }
      this.stepStart = now;
      this.waiting = false;
    } else if (due && !this.end) {
      this.waiting = true;
    }
    return this.frameAt(Math.min(1, (now - this.stepStart) / stepMs));
  }

  private frameAt(t: number): Frame {
    const prev = this.prev!, next = this.next!;
    if (!prev || !next) return { ego: { x: 0, y: 0, heading: 0, speed: 0, crashed: false }, others: [] };
    const ego = { ...next.ego, x: lerp(prev.ego.x, next.ego.x, t), y: lerp(prev.ego.y, next.ego.y, t), heading: lerp(prev.ego.heading, next.ego.heading, t) };
    // Frames list nearby cars in a stable order; match by index while they stay close.
    const others = next.others.map((o, i) => {
      const p = prev.others[i];
      return p && Math.abs(p.x - o.x) < 60 ? { ...o, x: lerp(p.x, o.x, t), y: lerp(p.y, o.y, t) } : o;
    });
    return { ego, others };
  }
}
