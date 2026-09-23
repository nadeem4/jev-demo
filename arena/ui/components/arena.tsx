"use client";

import { CaretLeft, CaretRight, Pause, Play } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { STATIC_SITE, commonSeeds, urls, type RunsIndex } from "@/lib/api";
import { compareBars, decisionRows, questionsOf } from "@/lib/decisions";
import { drawHighway } from "@/lib/draw/highway";
import { drawSnake } from "@/lib/draw/snake";
import { GAMES, GAME_IDS } from "@/lib/games";
import { Playback, type FrameView } from "@/lib/playback";
import type { ArenaEvent, GameId } from "@/lib/types";
import { viewsForGame, type PanelView, type TaggedViews } from "@/lib/views";
import { BlackjackBoard } from "./blackjack-board";
import { DecisionList } from "./decision-list";
import { Exchange } from "./exchange";
import { ModelBand } from "./model-band";
import { RunItYourself } from "./run-it-yourself";

type Source = "live" | "recording";
const SIDES = [0, 1] as const;

// Canvas games redraw every frame; Blackjack is markup that updates per decision.
const DRAW: Partial<Record<GameId, (c: HTMLCanvasElement, v: FrameView | null, ended: boolean) => void>> = {
  highway: drawHighway,
  snake: (c, v) => drawSnake(c, v),
};
const BOARD_CLASS: Partial<Record<GameId, string>> = {
  highway: "h-[120px] w-full",
  snake: "aspect-square w-[min(62vw,240px)]",
};
const SCENARIO_WORD: Record<GameId, string> = { highway: "traffic", snake: "food layout", blackjack: "deck" };

function viewOf(p: Playback): PanelView {
  return { start: p.start, startFrame: p.start?.frame ?? null, step: p.current, history: p.history, end: p.end,
           failed: p.failed, status: p.status, waiting: p.waiting, started: p.status !== "" };
}

export function Arena() {
  const [game, setGame] = useState<GameId>("highway");
  const [agents, setAgents] = useState<[string, string]>(["jev", "laya"]);
  const [seed, setSeed] = useState(4);
  const [source, setSource] = useState<Source>(STATIC_SITE ? "recording" : "live");
  const [speed, setSpeed] = useState(1);
  const [paused, setPaused] = useState(false);
  const [pinned, setPinned] = useState<number | null>(null);
  const [runsIndex, setRunsIndex] = useState<RunsIndex>({});
  const [playing, setPlaying] = useState<{ game: GameId; agents: [string, string]; seed: number } | null>(null);
  const [tagged, setTagged] = useState<TaggedViews>(() => ({ game: "highway", views: SIDES.map(() => viewOf(new Playback())) }));

  const info = GAMES[game];
  const live = viewsForGame(tagged, game);
  const playbacks = useRef<Playback[]>(SIDES.map(() => new Playback()));
  const canvases = useRef<(HTMLCanvasElement | null)[]>([null, null]);
  const streams = useRef<EventSource[]>([]);
  const speedRef = useRef(speed);
  const gameRef = useRef(game);
  const pausedRef = useRef(paused);
  const pinnedRef = useRef(pinned);
  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => { gameRef.current = game; }, [game]);
  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { pinnedRef.current = pinned; }, [pinned]);

  // One animation loop for both sides. Playback waits until both are ready, so a
  // slow-loading model never starts late. A paused clock freezes it where it is;
  // a pinned decision draws that decision's frames instead of the live ones.
  useEffect(() => {
    let raf = 0;
    let lastKey = "";
    let clock = 0;
    let last = 0;
    const loop = (now: number) => {
      if (last) clock += pausedRef.current ? 0 : now - last;
      last = now;
      const pbs = playbacks.current;
      const go = pbs.every((p) => p.ready || p.failed);
      const draw = DRAW[gameRef.current];
      const pin = pinnedRef.current;
      pbs.forEach((p, i) => {
        const view = p.tick(clock, 1000 / speedRef.current, go);
        const canvas = canvases.current[i];
        if (canvas && draw) draw(canvas, (pin === null ? null : p.frameAt(pin)) ?? view, Boolean(p.end));
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
  const infos = agents.map(agentInfo);
  const names = infos.map((a) => a.name);
  const stale = playing !== null &&
    (playing.game !== game || playing.seed !== seedToPlay || playing.agents[0] !== agents[0] || playing.agents[1] !== agents[1]);

  // What the page shows: the live decision, or the one pinned in Earlier decisions.
  // A model that stopped earlier has no decision there, and says so rather than
  // repeating its last one.
  const views = pinned === null ? live : live.map((v) => {
    const step = v.history.find((s) => s.t === pinned) ?? null;
    const last = v.history[v.history.length - 1];
    return step ? { ...v, step } : { ...v, step, started: true, status: last ? `It made no decision ${pinned}; its episode ended at ${last.t}.` : "" };
  });
  const rows = decisionRows(game, live.map((v) => v.history));
  const bars = compareBars(views.map((v) => info.measure.value(v)));

  function reset() {
    streams.current.forEach((s) => s.close());
    streams.current = [];
    playbacks.current = SIDES.map(() => new Playback());
    setPlaying(null);
    setPinned(null);
    setPaused(false);
  }

  function pickGame(id: GameId) {
    reset();
    setGame(id);
    setAgents(["jev", "laya"]);
  }

  /** Back and Forward pin playback one decision either way. */
  function stepBy(delta: number) {
    if (!rows.length) return;
    const ts = rows.map((r) => r.t).reverse();
    const at = ts.indexOf(pinned ?? ts[ts.length - 1]);
    const next = ts[Math.min(ts.length - 1, Math.max(0, (at < 0 ? ts.length - 1 : at) + delta))];
    setPaused(true);
    setPinned(next);
  }

  function follow() {
    setPinned(null);
    setPaused(false);
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
          <Picker label="First" value={agents[0]} onChange={(id) => setAgent(0, id)} agents={info.agents} />
          <span aria-hidden className="text-micro font-extrabold text-ink-soft">vs</span>
          <Picker label="Second" value={agents[1]} onChange={(id) => setAgent(1, id)} agents={info.agents} />

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

          <div className="grid gap-1">
            <span className="text-micro text-ink-soft">Playback</span>
            <div className="flex items-center gap-1">
              <Control label="Back one decision" onClick={() => stepBy(-1)} disabled={!rows.length}><CaretLeft size={16} weight="bold" aria-hidden /></Control>
              <Control
                label={paused ? "Resume and follow the game" : "Pause"}
                onClick={() => (paused ? follow() : setPaused(true))}
                pressed={paused}
              >
                {paused ? <Play size={16} weight="fill" aria-hidden /> : <Pause size={16} weight="fill" aria-hidden />}
              </Control>
              <Control label="Forward one decision" onClick={() => stepBy(1)} disabled={!rows.length}><CaretRight size={16} weight="bold" aria-hidden /></Control>
            </div>
          </div>

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

      <p className="flex flex-wrap items-baseline gap-x-3 py-4 text-micro text-ink-soft">
        <span>
          {info.blurb} Scenario #{seedToPlay ?? 0} gives both models the same {SCENARIO_WORD[game]}.
          {STATIC_SITE && <> These are recordings: <a href="#run-it" className="font-semibold text-ink underline decoration-accent decoration-2 underline-offset-4">run the arena yourself</a> to watch live.</>}
        </span>
        {pinned !== null && (
          <span className="flex items-baseline gap-2 font-semibold text-ink">
            Pinned to decision <span className="numeric">{pinned}</span>
            <button type="button" onClick={follow} className="font-semibold text-ink underline decoration-accent decoration-2 underline-offset-4">
              Follow the game again
            </button>
          </span>
        )}
      </p>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(420px,460px)_minmax(0,1fr)] lg:items-start lg:gap-10">
        <div className="grid content-start gap-6">
          {SIDES.map((i) => (
            <ModelBand
              key={infos[i].id + i}
              game={game}
              agent={infos[i]}
              view={views[i]}
              board={DRAW[game] ? (
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
            />
          ))}

          <section aria-labelledby="compare-title" className="border-t-2 border-line-strong pt-4">
            <h2 id="compare-title" className="text-micro text-ink-soft">{info.measure.label}, both on one scale</h2>
            <dl className="mt-3 grid gap-3">
              {bars.map((bar, i) => (
                <div key={names[i] + i} className="grid gap-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="truncate text-micro font-semibold text-ink">{names[i]}</dt>
                    <dd className="numeric text-body font-extrabold">{bar.value === null ? "–" : info.measure.format(bar.value)}</dd>
                  </div>
                  <div className="h-[8px] bg-sunk" aria-hidden>
                    <div className="h-full bg-accent" style={{ width: `${Math.round(bar.fraction * 100)}%` }} />
                  </div>
                </div>
              ))}
            </dl>
          </section>
        </div>

        <div className="grid min-w-0 content-start gap-6">
          {SIDES.map((i) => (
            <Exchange
              key={names[i] + i}
              name={names[i]}
              step={views[i].step}
              questions={questionsOf(views[i].start)}
              waitingFor={views[i].failed ?? (views[i].started ? views[i].status || "Starting…" : "Press Play to see the wire.")}
            />
          ))}
          <DecisionList game={game} names={names} rows={rows} selected={pinned} onSelect={(t) => { setPaused(true); setPinned(t); }} />
        </div>
      </div>

      {STATIC_SITE && <RunItYourself />}
    </main>
  );
}

function Control({ label, onClick, disabled, pressed, children }: {
  label: string; onClick: () => void; disabled?: boolean; pressed?: boolean; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      {...(pressed === undefined ? {} : { "aria-pressed": pressed })}
      className="grid size-9 place-items-center bg-surface text-ink-soft transition-colors hover:text-ink disabled:opacity-40"
    >
      {children}
    </button>
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
