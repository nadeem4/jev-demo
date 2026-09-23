"use client";

import { Play } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { STATIC_SITE, commonSeeds, urls, type RunsIndex } from "@/lib/api";
import { drawHighway } from "@/lib/draw/highway";
import { drawSnake } from "@/lib/draw/snake";
import { GAMES, GAME_IDS } from "@/lib/games";
import { Playback, type FrameView } from "@/lib/playback";
import type { ArenaEvent, GameId } from "@/lib/types";
import { BlackjackBoard } from "./blackjack-board";
import { viewsForGame, type PanelView, type TaggedViews } from "@/lib/views";
import { ModelPanel } from "./model-panel";
import { RunItYourself } from "./run-it-yourself";

type Source = "live" | "recording";
const SIDES = [0, 1] as const;

// Canvas games draw every animation frame; Blackjack is plain markup that updates per decision.
const DRAW: Partial<Record<GameId, (c: HTMLCanvasElement, v: FrameView | null, ended: boolean) => void>> = {
  highway: drawHighway,
  snake: (c, v) => drawSnake(c, v),
};
const BOARD_CLASS: Partial<Record<GameId, string>> = {
  highway: "h-[min(620px,70dvh)] w-[140px] md:w-[160px]",
  snake: "aspect-square w-[min(42vw,260px)]",
};

// A side counts as started once Play gave it a status; before that it shows Ready.
function viewOf(p: Playback): PanelView {
  return { startFrame: p.start?.frame ?? null, step: p.current, end: p.end, failed: p.failed, status: p.status, waiting: p.waiting, started: p.status !== "" };
}

export function Arena() {
  const [game, setGame] = useState<GameId>("highway");
  const [agents, setAgents] = useState<[string, string]>(["jev", "laya"]);
  const [seed, setSeed] = useState(4);
  const [source, setSource] = useState<Source>(STATIC_SITE ? "recording" : "live");
  const [runsIndex, setRunsIndex] = useState<RunsIndex>({});
  const [speed, setSpeed] = useState(1);
  const [running, setRunning] = useState(false);
  const [tagged, setTagged] = useState<TaggedViews>(() => ({ game: "highway", views: SIDES.map(() => viewOf(new Playback())) }));

  const info = GAMES[game];
  const views = viewsForGame(tagged, game);
  const playbacks = useRef<Playback[]>(SIDES.map(() => new Playback()));
  const canvases = useRef<(HTMLCanvasElement | null)[]>([null, null]);
  const streams = useRef<EventSource[]>([]);
  const speedRef = useRef(speed);
  const gameRef = useRef(game);
  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => { gameRef.current = game; }, [game]);

  // One animation loop for both sides. Playback holds until both sides have their
  // first frame (or failed), so a slow-loading model doesn't start late.
  useEffect(() => {
    let raf = 0;
    let lastKey = "";
    const loop = (now: number) => {
      const pbs = playbacks.current;
      const go = pbs.every((p) => p.ready || p.failed);
      const draw = DRAW[gameRef.current];
      pbs.forEach((p, i) => {
        const view = p.tick(now, 1000 / speedRef.current, go);
        const canvas = canvases.current[i];
        if (canvas && draw) draw(canvas, view, Boolean(p.end));
      });
      const key = pbs.map((p) => `${p.current?.t}|${p.end?.steps}|${p.failed}|${p.status}|${p.waiting}|${p.ready}`).join("/");
      if (key !== lastKey) {
        lastKey = key;
        setTagged({ game: gameRef.current, views: pbs.map((p) => viewOf(p)) });
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => () => streams.current.forEach((s) => s.close()), []);

  // What has been recorded, so the published site only offers replays that exist.
  useEffect(() => {
    fetch(urls.runsIndex).then((r) => (r.ok ? r.json() : {})).then(setRunsIndex).catch(() => {});
  }, []);
  const recorded = commonSeeds(runsIndex, game, agents[0], agents[1]);
  const seedToPlay = STATIC_SITE && !recorded.includes(seed) ? recorded[0] : seed;

  function reset() {
    streams.current.forEach((s) => s.close());
    streams.current = [];
    playbacks.current = SIDES.map(() => new Playback());
    setRunning(false);
  }

  function pickGame(id: GameId) {
    reset();
    setGame(id);
    setAgents(["jev", "laya"]);
  }

  function play(e: React.FormEvent) {
    e.preventDefault();
    reset();
    setRunning(true);
    SIDES.forEach((i) => {
      const pb = playbacks.current[i];
      pb.status = "Starting…";
      const agent = agents[i];
      if (source === "live") {
        const es = new EventSource(urls.live!(game, agent, seedToPlay));
        es.onmessage = (m) => {
          const ev = JSON.parse(m.data) as ArenaEvent;
          pb.push(ev);
          if (ev.type === "end" || ev.type === "error") es.close();
        };
        es.onerror = () => {
          if (!pb.end) pb.push({ type: "error", message: "Lost the connection to the arena server. Start it with docker compose up, or uv run python -m arena.server." });
          es.close();
        };
        streams.current.push(es);
      } else {
        fetch(urls.run(game, agent, seedToPlay))
          .then(async (r) => {
            if (!r.ok) throw new Error();
            (await r.json() as ArenaEvent[]).forEach((ev) => pb.push(ev));
          })
          .catch(() => pb.push({
            type: "error",
            message: STATIC_SITE
              ? `No recording of ${info.agents.find((a) => a.id === agent)?.name} on ${info.name} for this seed.`
              : `No recording of ${info.agents.find((a) => a.id === agent)?.name} on ${info.name}, seed ${seedToPlay}. Record one with: uv run python -m arena.record --game ${game} --agent ${agent} --seed-start ${seedToPlay} --episodes 1`,
          }));
      }
    });
  }

  const setAgent = (i: 0 | 1, id: string) => setAgents((a) => (i === 0 ? [id, a[1]] : [a[0], id]));
  // The recording being replayed is a plain JSON file: link it so anyone can read the raw decisions.
  const rawUrl = (i: 0 | 1) => (views[i].step && source === "recording" ? urls.run(game, agents[i], seedToPlay) : null);
  const agentInfo = (id: string) => info.agents.find((a) => a.id === id) ?? info.agents[0];

  return (
    <main className="mx-auto max-w-[1400px] px-4 pb-16 pt-8 md:px-8">
      <header className="max-w-[62ch]">
        <h1 className="text-4xl font-extrabold leading-none tracking-tight md:text-5xl">Watch them play</h1>
        <p className="mt-3 text-lg leading-relaxed text-ink-soft">
          Two decision models play the same game with zero training. Watch what each one reads and what it picks.
        </p>
      </header>

      <nav aria-label="Games" className="mt-8 flex flex-wrap gap-2">
        {GAME_IDS.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => pickGame(id)}
            aria-pressed={game === id}
            className={`h-11 rounded-md border-2 px-5 text-base font-extrabold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-marking ${
              game === id ? "border-accent bg-accent text-accent-ink" : "border-line bg-surface text-ink hover:border-ink-soft"
            }`}
          >
            {GAMES[id].name}
          </button>
        ))}
      </nav>
      <p className="mt-3 text-base text-ink-soft">{info.blurb}</p>

      <form onSubmit={play} className="mt-5 flex flex-wrap items-end gap-x-6 gap-y-4 border-y border-line py-5">
        <Field label="Left model"><AgentSelect agents={info.agents} value={agents[0]} onChange={(id) => setAgent(0, id)} /></Field>
        <Field label="Right model"><AgentSelect agents={info.agents} value={agents[1]} onChange={(id) => setAgent(1, id)} /></Field>
        <Field label={game === "blackjack" ? "Deck" : game === "snake" ? "Food layout" : "Traffic"}>
          {STATIC_SITE ? (
            <select
              value={seedToPlay ?? ""} disabled={!recorded.length}
              onChange={(e) => setSeed(Number(e.target.value))}
              className="h-11 rounded-md border-2 border-line bg-surface px-3 text-base text-ink disabled:text-ink-soft"
            >
              {recorded.length ? recorded.map((s) => <option key={s} value={s}>{s}</option>) : <option>None recorded</option>}
            </select>
          ) : (
            <input
              type="number" min={0} step={1} value={seed}
              onChange={(e) => setSeed(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
              className="h-11 w-24 rounded-md border-2 border-line bg-surface px-3 text-base text-ink"
            />
          )}
        </Field>
        {STATIC_SITE ? (
          <p className="max-w-[34ch] self-center text-sm text-ink-soft">
            Recorded games: this site cannot run a model.{" "}
            <a href="#run-it" className="font-semibold text-ink underline decoration-accent decoration-2 underline-offset-4">Run the arena yourself</a>{" "}
            to watch them play live.
          </p>
        ) : (
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
        )}
        <Field label="Playback">
          <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="h-11 rounded-md border-2 border-line bg-surface px-3 text-base text-ink">
            <option value={1}>Real time</option>
            <option value={2}>2x</option>
            <option value={4}>4x</option>
          </select>
        </Field>
        <button
          type="submit"
          disabled={STATIC_SITE && !recorded.length}
          className="flex h-11 disabled:opacity-50 items-center gap-2 rounded-md bg-accent px-6 text-base font-extrabold text-accent-ink transition-transform active:scale-[0.98] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-marking"
        >
          <Play size={18} weight="fill" aria-hidden />
          {running ? "Play again" : "Play"}
        </button>
      </form>

      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:gap-12">
        <div className="order-2 lg:order-1">
          <ModelPanel game={game} agent={agentInfo(agents[0])} view={views[0]} align="left" rawUrl={rawUrl(0)} />
        </div>

        <div className="order-1 flex justify-center gap-4 lg:order-2">
          {SIDES.map((i) => (
            <figure key={i} className="grid content-start justify-items-center gap-2">
              <figcaption className="text-base font-extrabold">{agentInfo(agents[i]).name}</figcaption>
              {DRAW[game] ? (
                <canvas
                  key={game}
                  ref={(el) => { canvases.current[i] = el; }}
                  className={`${BOARD_CLASS[game]} rounded-md`}
                  role="img"
                  aria-label={`${info.name} played by ${agentInfo(agents[i]).name}. Yellow is the model's ${game === "snake" ? "snake head" : "car"}.`}
                />
              ) : (
                <BlackjackBoard step={views[i].step} start={views[i].startFrame} />
              )}
              <dl className="grid w-full grid-cols-2 gap-2 text-center">
                {info.stats(views[i].step, views[i].end).map((s) => (
                  <div key={s.label}>
                    <dt className="text-xs text-ink-soft">{s.label}</dt>
                    <dd className={`text-lg font-extrabold ${s.danger ? "text-danger" : ""}`}>{s.value}</dd>
                  </div>
                ))}
              </dl>
            </figure>
          ))}
        </div>

        <div className="order-3">
          <ModelPanel game={game} agent={agentInfo(agents[1])} view={views[1]} align="right" rawUrl={rawUrl(1)} />
        </div>
      </div>

      {STATIC_SITE && <RunItYourself />}
    </main>
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

function AgentSelect({ agents, value, onChange }: { agents: { id: string; name: string }[]; value: string; onChange: (id: string) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="h-11 rounded-md border-2 border-line bg-surface px-3 text-base text-ink">
      {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
    </select>
  );
}
