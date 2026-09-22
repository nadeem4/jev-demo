import type { AnyFrame, ArenaEvent, EndEvent, StartEvent, StepEvent } from "./types";

export interface FrameView { prev: AnyFrame; next: AnyFrame; t: number }

/**
 * Plays one side's event stream at a steady pace (one decision per step
 * duration). Events can arrive faster (recordings) or slower (a model still
 * thinking) than playback. Each game decides how to animate between frames.
 */
export class Playback {
  start: StartEvent | null = null;
  current: StepEvent | null = null;
  end: EndEvent | null = null;
  failed: string | null = null;
  status = "";
  waiting = false;

  private queue: ArenaEvent[] = [];
  private prev: AnyFrame | null = null;
  private next: AnyFrame | null = null;
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

  /** Advances playback; returns the frames to draw, or null before the start. */
  tick(now: number, stepMs: number, go: boolean): FrameView | null {
    if (!this.prev || !this.next) return null;
    if (!go) {
      this.stepStart = now;
      return { prev: this.prev, next: this.next, t: 0 };
    }
    const due = this.current === null || now - this.stepStart >= stepMs;
    if (due && this.queue.length) {
      const ev = this.queue.shift()!;
      if (ev.type === "step") {
        this.prev = this.next;
        this.next = ev.frame;
        this.current = ev;
      } else if (ev.type === "end") {
        this.end = ev as EndEvent;
        this.prev = this.next;
      }
      this.stepStart = now;
      this.waiting = false;
    } else if (due && !this.end) {
      this.waiting = true;
    }
    return { prev: this.prev, next: this.next, t: Math.min(1, (now - this.stepStart) / stepMs) };
  }
}
