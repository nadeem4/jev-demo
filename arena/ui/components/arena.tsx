"use client";

import { Play } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { STATIC_SITE, commonSeeds, urls, type RunsIndex } from "@/lib/api";
import { drawHighway } from "@/lib/draw/highway";
import { drawSnake } from "@/lib/draw/snake";
import { GAMES, GAME_IDS } from "@/lib/games";
import { Playback, type FrameView } from "@/lib/playback";
import type { ArenaEvent, GameId } from "@/lib/types";
import { viewsForGame, type PanelView, type TaggedViews } from "@/lib/views";
import { BlackjackBoard } from "./blackjack-board";
import { Inspector } from "./inspector";
import { ModelPanel } from "./model-panel";
import { RunItYourself } from "./run-it-yourself";

type Source = "live" | "recording";
const SIDES = [0, 1] as const;

// Canvas games redraw every frame; Blackjack is markup that updates per decision.
const DRAW: Partial<Record<GameId, (c: HTMLCanvasElement, v: FrameView | null, ended: boolean) => void>> = {
  highway: drawHighway,
  snake: (c, v) => drawSnake(c, v),
};
const BOARD_CLASS: Partial<Record<GameId, string>> = {
  highway: "h-[min(560px,64dvh)] w-[132px] md:w-[150px]",
  snake: "aspect-square w-[min(40vw,240px)]",
};
const SCENARIO_WORD: Record<GameId, string> = { highway: "traffic", snake: "food layout", blackjack: "deck" };

function viewOf(p: Playback): PanelView {
  return { start: p.start, startFrame: p.start?.frame ?? null, step: p.current, end: p.end,
           failed: p.failed, status: p.status, waiting: p.waiting, started: p.status !== "" };
}

export function Arena() {
  const [game, setGame] = useState<GameId>("highway");
  const [agents, setAgents] = useState<[string, string]>(["jev", "laya"]);
  const [seed, setSeed] = useState(4);
  const [source, setSource] = useState<Source>(STATIC_SITE ? "recording" : "live");
  const [speed, setSpeed] = useState(1);
  const [raw, setRaw] = useState(false);
  const [runsIndex, setRunsIndex] = useState<RunsIndex>({});
  const [playing, setPlaying] = useState<{ game: GameId; agents: [string, string]; seed: number } | null>(null);
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

  // One animation loop for both sides. Playback waits until both are ready, so a
  // slow-loading model never starts late.
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
  useEffect(() => { fetch(urls.runsIndex).then((r) => (r.ok ? r.json() : {})).then(setRunsIndex).catch(() => {}); }, []);

  const recorded = commonSeeds(runsIndex, game, agents[0], agents[1]);
  const seedToPlay = STATIC_SITE && !recorded.includes(seed) ? recorded[0] : seed;
  const agentInfo = (id: string) => info.agents.find((a) => a.id === id) ?? info.agents[0];
  const names: [string, string] = [agentInfo(agents[0]).name, agentInfo(agents[1]).name];
  const stale = playing !== null &&
    (playing.game !== game || playing.seed !== seedToPlay || playing.agents[0] !== agents[0] || playing.agents[1] !== agents[1]);

  function reset() {
    streams.current.forEach((s) => s.close());
    streams.current = [];
    playbacks.current = SIDES.map(() => new Playback());
    setPlaying(null);
  }

  function pickGame(id: GameId) {
    reset();
    setGame(id);
    setAgents(["jev", "laya"]);
  }

  function play(e: React.FormEvent) {
    e.preventDefault();
    reset();
    setPlaying({ game, agents, seed: seedToPlay });
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
          if (!pb.end) pb.push({ type: "error", message: "Lost the connection to the arena server. Start it with docker compose up." });
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
              ? `No recording of ${agentInfo(agent).name} on ${info.name} for this scenario.`
              : `No recording of ${agentInfo(agent).name} on ${info.name}, scenario ${seedToPlay}. Record one with: uv run python -m arena.record --game ${game} --agent ${agent} --seed-start ${seedToPlay} --episodes 1`,
          }));
      }
    });
  }

  const setAgent = (i: 0 | 1, id: string) => setAgents((a) => (i === 0 ? [id, a[1]] : [a[0], id]));

  return (
    <main className="mx-auto max-w-[1400px] px-4 pb-16 md:px-8">
      <header className="grid gap-3 pt-10 pb-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <div>
          <h1 className="text-h1 font-extrabold leading-[0.95] tracking-tight">Watch them decide</h1>
          <p className="mt-3 max-w-[54ch] text-lead leading-relaxed text-ink-soft">
            Two decision models, the same game, the same situations, no training. Every move they make, and the reason behind it, is on the page.
          </p>
        </div>
        <nav aria-label="Games" className="flex flex-wrap gap-1.5 md:justify-end">
          {GAME_IDS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => pickGame(id)}
              aria-pressed={game === id}
              className={`h-10 px-4 text-body font-extrabold transition-colors ${
                game === id ? "bg-ink text-page" : "bg-surface text-ink-soft hover:text-ink"
              }`}
            >
              {GAMES[id].name}
            </button>
          ))}
        </nav>
      </header>

      <form onSubmit={play} className="sticky top-0 z-10 -mx-4 border-y border-line bg-page/95 px-4 py-3 backdrop-blur md:-mx-8 md:px-8">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <Picker label="Left" value={agents[0]} onChange={(id) => setAgent(0, id)} agents={info.agents} />
          <span aria-hidden className="text-micro font-extrabold text-ink-soft">vs</span>
          <Picker label="Right" value={agents[1]} onChange={(id) => setAgent(1, id)} agents={info.agents} />

          <Picker
            label="Scenario"
            value={String(seedToPlay ?? "")}
            onChange={(v) => setSeed(Number(v))}
            agents={(STATIC_SITE ? recorded : Array.from({ length: 20 }, (_, i) => i)).map((s) => ({ id: String(s), name: `#${s}` }))}
            disabled={STATIC_SITE && !recorded.length}
          />
          <Picker
            label="Speed"
            value={String(speed)}
            onChange={(v) => setSpeed(Number(v))}
            agents={[{ id: "1", name: "Real time" }, { id: "2", name: "2×" }, { id: "4", name: "4×" }]}
          />
          {!STATIC_SITE && (
            <Picker
              label="Source"
              value={source}
              onChange={(v) => setSource(v as Source)}
              agents={[{ id: "live", name: "Live" }, { id: "recording", name: "Recording" }]}
            />
          )}

          <label className="flex cursor-pointer items-center gap-2 text-micro font-semibold text-ink-soft hover:text-ink">
            <input type="checkbox" checked={raw} onChange={(e) => setRaw(e.target.checked)} className="size-4 accent-[var(--accent)]" />
            Raw view
          </label>

          <div className="ml-auto flex items-center gap-3">
            {stale && <span className="text-micro font-semibold text-ink">Press play to load it</span>}
            <button
              type="submit"
              disabled={STATIC_SITE && !recorded.length}
              className="flex h-10 items-center gap-2 bg-accent px-6 text-body font-extrabold text-accent-ink transition-transform active:translate-y-px disabled:opacity-50"
            >
              <Play size={16} weight="fill" aria-hidden />
              {playing ? "Play again" : "Play"}
            </button>
          </div>
        </div>
      </form>

      <p className="py-4 text-micro text-ink-soft">
        {info.blurb} Scenario #{seedToPlay ?? 0} gives both models the same {SCENARIO_WORD[game]}.
        {STATIC_SITE && <> These are recordings: <a href="#run-it" className="font-semibold text-ink underline decoration-accent decoration-2 underline-offset-4">run the arena yourself</a> to watch live.</>}
      </p>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:gap-10">
        <div className="order-2 lg:order-1">
          <ModelPanel game={game} agent={agentInfo(agents[0])} view={views[0]} align="left" />
        </div>

        <div className="order-1 flex justify-center gap-5 lg:order-2">
          {SIDES.map((i) => (
            <figure key={i} className="grid content-start justify-items-center gap-2">
              <figcaption className="text-micro font-semibold text-ink-soft">{names[i]}</figcaption>
              {DRAW[game] ? (
                <canvas
                  key={game}
                  ref={(el) => { canvases.current[i] = el; }}
                  className={BOARD_CLASS[game]}
                  role="img"
                  aria-label={`${info.name} played by ${names[i]}. The yellow piece is this model's.`}
                />
              ) : (
                <BlackjackBoard step={views[i].step} start={views[i].startFrame} />
              )}
              <dl className="mt-1 grid w-full grid-cols-2 gap-2 border-t border-line pt-2 text-center">
                {info.stats(views[i].step, views[i].end).map((s) => (
                  <div key={s.label}>
                    <dt className="text-micro text-ink-soft">{s.label}</dt>
                    <dd className={`numeric text-body font-extrabold ${s.danger ? "text-danger" : ""}`}>{s.value}</dd>
                  </div>
                ))}
              </dl>
            </figure>
          ))}
        </div>

        <div className="order-3">
          <ModelPanel game={game} agent={agentInfo(agents[1])} view={views[1]} align="right" />
        </div>
      </div>

      {raw && <Inspector names={names} views={views} />}
      {STATIC_SITE && <RunItYourself />}
    </main>
  );
}

function Picker({ label, value, onChange, agents, disabled }: {
  label: string; value: string; onChange: (id: string) => void;
  agents: { id: string; name: string }[]; disabled?: boolean;
}) {
  return (
    <label className="grid gap-1">
      <span className="text-micro text-ink-soft">{label}</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 border-b-2 border-line-strong bg-transparent pr-6 text-body font-semibold text-ink disabled:text-ink-soft"
      >
        {agents.length ? agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>) : <option>None recorded</option>}
      </select>
    </label>
  );
}
