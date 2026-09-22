"use client";

import { Play } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { AGENTS, type AgentId } from "@/lib/agents";
import { ARENA_API } from "@/lib/api";
import { drawRoad } from "@/lib/draw";
import { Playback } from "@/lib/playback";
import type { ArenaEvent } from "@/lib/types";
import { ModelPanel, type PanelView } from "./model-panel";

type Source = "live" | "recording";
const SIDES = [0, 1] as const;

function viewOf(p: Playback, started: boolean): PanelView {
  return { step: p.current, end: p.end, failed: p.failed, status: p.status, waiting: p.waiting, started };
}

export function Arena() {
  const [agents, setAgents] = useState<[AgentId, AgentId]>(["jev", "laya"]);
  const [seed, setSeed] = useState(4);
  const [source, setSource] = useState<Source>("live");
  const [speed, setSpeed] = useState(1);
  const [running, setRunning] = useState(false);
  const [views, setViews] = useState<PanelView[]>(() => SIDES.map(() => viewOf(new Playback(), false)));

  const playbacks = useRef<Playback[]>(SIDES.map(() => new Playback()));
  const canvases = useRef<(HTMLCanvasElement | null)[]>([null, null]);
  const streams = useRef<EventSource[]>([]);
  const speedRef = useRef(speed);
  useEffect(() => { speedRef.current = speed; }, [speed]);

  // One animation loop for both roads. Playback holds until both roads have
  // their first frame (or failed), so a slow-loading model doesn't start late.
  useEffect(() => {
    let raf = 0;
    let lastKey = "";
    const loop = (now: number) => {
      const pbs = playbacks.current;
      const go = pbs.every((p) => p.ready || p.failed);
      pbs.forEach((p, i) => {
        const frame = p.tick(now, 1000 / speedRef.current, go);
        const canvas = canvases.current[i];
        if (canvas) drawRoad(canvas, p.ready ? frame : null, Boolean(p.end?.crashed));
      });
      const key = pbs.map((p) => `${p.current?.t}|${p.end?.steps}|${p.failed}|${p.status}|${p.waiting}|${p.ready}`).join("/");
      if (key !== lastKey) {
        lastKey = key;
        setViews(pbs.map((p) => viewOf(p, true)));
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => () => streams.current.forEach((s) => s.close()), []);

  async function play(e: React.FormEvent) {
    e.preventDefault();
    streams.current.forEach((s) => s.close());
    streams.current = [];
    playbacks.current = SIDES.map(() => new Playback());
    setRunning(true);

    SIDES.forEach((i) => {
      const pb = playbacks.current[i];
      const agent = agents[i];
      if (source === "live") {
        const es = new EventSource(`${ARENA_API}/api/live?agent=${agent}&seed=${seed}`);
        es.onmessage = (m) => {
          const ev = JSON.parse(m.data) as ArenaEvent;
          pb.push(ev);
          if (ev.type === "end" || ev.type === "error") es.close();
        };
        es.onerror = () => {
          if (!pb.end) pb.push({ type: "error", message: "Lost the connection to the arena server. Start it with: uv run python -m arena.server" });
          es.close();
        };
        streams.current.push(es);
      } else {
        fetch(`${ARENA_API}/api/runs/highway/${agent}/${seed}`)
          .then(async (r) => {
            if (!r.ok) throw new Error();
            (await r.json() as ArenaEvent[]).forEach((ev) => pb.push(ev));
          })
          .catch(() => pb.push({
            type: "error",
            message: `No recording of ${AGENTS[agent].name} on traffic ${seed}. Record one with: uv run python -m arena.record --agent ${agent} --seed-start ${seed} --episodes 1`,
          }));
      }
    });
  }

  const setAgent = (i: 0 | 1, id: AgentId) => setAgents((a) => (i === 0 ? [id, a[1]] : [a[0], id]));

  return (
    <main className="mx-auto max-w-[1400px] px-4 pb-16 pt-8 md:px-8">
      <header className="max-w-[60ch]">
        <h1 className="text-4xl font-extrabold leading-none tracking-tight md:text-5xl">Decision Arena</h1>
        <p className="mt-3 text-lg leading-relaxed text-ink-soft">
          Two decision models drive identical traffic. Neither was trained to drive. Watch what each one reads and what it picks.
        </p>
      </header>

      <form onSubmit={play} className="mt-8 flex flex-wrap items-end gap-x-6 gap-y-4 border-y border-line py-5">
        <Field label="Left model">
          <AgentSelect value={agents[0]} onChange={(id) => setAgent(0, id)} />
        </Field>
        <Field label="Right model">
          <AgentSelect value={agents[1]} onChange={(id) => setAgent(1, id)} />
        </Field>
        <Field label="Traffic">
          <input
            type="number" min={0} step={1} value={seed}
            onChange={(e) => setSeed(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
            className="h-11 w-24 rounded-md border-2 border-line bg-surface px-3 text-base text-ink"
          />
        </Field>
        <fieldset className="grid gap-1.5">
          <legend className="mb-1.5 text-sm text-ink-soft">Source</legend>
          <div className="flex h-11 rounded-md border-2 border-line bg-surface p-0.5">
            {(["live", "recording"] as const).map((s) => (
              <label
                key={s}
                className={`flex cursor-pointer items-center rounded px-3.5 text-base has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-marking ${
                  source === s ? "bg-accent font-extrabold text-accent-ink" : "text-ink"
                }`}
              >
                <input type="radio" name="source" value={s} checked={source === s} onChange={() => setSource(s)} className="sr-only" />
                {s === "live" ? "Live" : "Recording"}
              </label>
            ))}
          </div>
        </fieldset>
        <Field label="Playback">
          <select
            value={speed} onChange={(e) => setSpeed(Number(e.target.value))}
            className="h-11 rounded-md border-2 border-line bg-surface px-3 text-base text-ink"
          >
            <option value={1}>Real time</option>
            <option value={2}>2x</option>
            <option value={4}>4x</option>
          </select>
        </Field>
        <button
          type="submit"
          className="flex h-11 items-center gap-2 rounded-md bg-accent px-6 text-base font-extrabold text-accent-ink transition-transform active:scale-[0.98] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-marking"
        >
          <Play size={18} weight="fill" aria-hidden />
          {running ? "Play again" : "Play"}
        </button>
      </form>

      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:gap-12">
        <div className="order-2 lg:order-1">
          <ModelPanel agent={agents[0]} view={views[0]} align="left" />
        </div>

        <div className="order-1 flex justify-center gap-4 lg:order-2">
          {SIDES.map((i) => (
            <figure key={i} className="grid justify-items-center gap-2">
              <figcaption className="text-base font-extrabold">{AGENTS[agents[i]].name}</figcaption>
              <canvas
                ref={(el) => { canvases.current[i] = el; }}
                className="h-[min(620px,70dvh)] w-[140px] rounded-md md:w-[160px]"
                role="img"
                aria-label={`Road driven by ${AGENTS[agents[i]].name}. The yellow car is the model's car.`}
              />
              <RoadStats view={views[i]} />
            </figure>
          ))}
        </div>

        <div className="order-3">
          <ModelPanel agent={agents[1]} view={views[1]} align="right" />
        </div>
      </div>
    </main>
  );
}

function RoadStats({ view }: { view: PanelView }) {
  const frame = view.step?.frame;
  return (
    <dl className="grid w-full grid-cols-2 gap-2 text-center">
      <div>
        <dt className="text-xs text-ink-soft">Speed</dt>
        <dd className="text-lg font-extrabold">{frame ? `${Math.round(frame.ego.speed)} m/s` : "-"}</dd>
      </div>
      <div>
        <dt className="text-xs text-ink-soft">Time</dt>
        <dd className={`text-lg font-extrabold ${view.end?.crashed ? "text-danger" : ""}`}>{view.step ? `${view.step.t} s` : "-"}</dd>
      </div>
    </dl>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-sm text-ink-soft">{label}</span>
      {children}
    </label>
  );
}

function AgentSelect({ value, onChange }: { value: AgentId; onChange: (id: AgentId) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as AgentId)}
      className="h-11 rounded-md border-2 border-line bg-surface px-3 text-base text-ink"
    >
      {(Object.keys(AGENTS) as AgentId[]).map((id) => (
        <option key={id} value={id}>{AGENTS[id].name}</option>
      ))}
    </select>
  );
}
