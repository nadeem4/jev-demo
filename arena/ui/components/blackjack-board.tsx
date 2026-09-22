import type { AnyFrame, StepEvent } from "@/lib/types";

interface Hand { player: number[]; dealer: number[]; result: "win" | "loss" | "draw"; reward: number }
interface BlackjackFrame { player: number[]; dealer_up: number; last_hand: Hand | null; hands: number; of: number }

const rank = (v: number) => (v === 1 ? "A" : String(v));
// Gymnasium's blackjack counts all face cards as 10, so a 10 may be a 10, J, Q or K.

function Card({ value, hidden }: { value?: number; hidden?: boolean }) {
  return (
    <span
      className={`grid h-14 w-10 place-items-center rounded-md border-2 text-lg font-extrabold ${
        hidden ? "border-line bg-line/50 text-transparent" : "border-line bg-surface text-ink"
      }`}
      aria-label={hidden ? "face-down card" : `card ${rank(value!)}`}
    >
      {hidden ? "?" : rank(value!)}
    </span>
  );
}

const RESULT: Record<Hand["result"], { text: string; cls: string }> = {
  win: { text: "Won", cls: "text-clear" },
  loss: { text: "Lost", cls: "text-danger" },
  draw: { text: "Drew", cls: "text-ink-soft" },
};

export function BlackjackBoard({ step, start }: { step: StepEvent | null; start: AnyFrame | null }) {
  const f = (step?.frame ?? start) as unknown as BlackjackFrame | null;
  if (!f) return <div className="grid h-80 w-[200px] place-items-center rounded-md bg-surface text-sm text-ink-soft">No hand yet</div>;
  const last = f.last_hand;
  return (
    <div className="grid w-[200px] gap-4 rounded-md border-2 border-line bg-surface p-3">
      <div>
        <p className="text-xs text-ink-soft">Dealer</p>
        <div className="mt-1 flex gap-1.5"><Card value={f.dealer_up} /><Card hidden /></div>
      </div>
      <div>
        <p className="text-xs text-ink-soft">Hand {Math.min(f.hands + 1, f.of)} of {f.of}</p>
        <div className="mt-1 flex flex-wrap gap-1.5">{f.player.map((v, i) => <Card key={i} value={v} />)}</div>
      </div>
      <div className="min-h-16 border-t border-line pt-2 text-sm">
        {last ? (
          <>
            <p className={`font-extrabold ${RESULT[last.result].cls}`}>Last hand: {RESULT[last.result].text}</p>
            <p className="text-ink-soft">You {last.player.map(rank).join(" ")}, dealer {last.dealer.map(rank).join(" ")}</p>
          </>
        ) : <p className="text-ink-soft">First hand</p>}
      </div>
    </div>
  );
}
