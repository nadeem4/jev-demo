import { REPO_URL } from "./site-footer";

const STEPS: { title: string; body: string; code?: string }[] = [
  {
    title: "Get the code",
    body: "Clone the repository. You need Docker, or Python with uv and Node.js 22.",
    code: `git clone ${REPO_URL}.git\ncd jev-demo`,
  },
  {
    title: "Add a Jev key",
    body: "Put an OpenRouter key in .env at the repo root. Laya needs no key: it downloads once and runs on your machine. Without a Jev key you can still watch Laya and the baselines.",
    code: "OPENROUTER_API_KEY=your_key",
  },
  {
    title: "Start it",
    body: "One command builds and runs the arena server and the site. The first start downloads Laya's model, about 2.3 GB.",
    code: "docker compose up --build",
  },
  {
    title: "Play",
    body: "Open localhost:3000, pick a game and two models, choose Live, and press Play. Now the models are deciding on your machine, in real time.",
  },
];

export function RunItYourself() {
  return (
    <section className="mt-14 border-t border-line pt-10" aria-labelledby="run-it">
      <h2 id="run-it" className="text-3xl font-extrabold tracking-tight">Watch them play live</h2>
      <p className="mt-3 max-w-[70ch] text-lg leading-relaxed text-ink-soft">
        The games above are recordings: this site is a static page, so it cannot run a model. The same arena runs
        on your machine in four steps, and there the models play live, on any game and any seed you like.
      </p>

      <ol className="mt-6 grid gap-5 md:grid-cols-2">
        {STEPS.map(({ title, body, code }, i) => (
          <li key={title} className="grid min-w-0 content-start gap-2 border-t-2 border-line pt-3">
            <h3 className="text-lg font-extrabold">
              <span className="text-ink-soft">{i + 1}.</span> {title}
            </h3>
            <p className="max-w-[46ch] text-ink-soft">{body}</p>
            {code && (
              <pre className="max-w-full overflow-x-auto bg-surface p-3 font-mono text-micro text-ink"><code>{code}</code></pre>
            )}
          </li>
        ))}
      </ol>

      <p className="mt-6 text-lg">
        Full setup, the benchmark commands and the Colab notebook are in the{" "}
        <a href={REPO_URL} className="font-semibold underline decoration-accent decoration-2 underline-offset-4">README on GitHub</a>.
      </p>
    </section>
  );
}
