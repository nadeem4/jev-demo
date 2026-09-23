import { GithubLogo } from "@phosphor-icons/react/dist/ssr";

export const REPO_URL = "https://github.com/nadeem4/jev-demo";

export function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-line">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-8 gap-y-3 px-4 py-8 text-base md:px-8">
        <a
          href={REPO_URL}
          className="flex items-center gap-2 font-semibold underline decoration-accent decoration-2 underline-offset-4 focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-marking"
        >
          <GithubLogo size={20} weight="fill" aria-hidden />
          Code, data and setup on GitHub
        </a>
        <p className="text-ink-soft">
          Every game here was played by the models and recorded. Run the arena yourself to watch them play live.
        </p>
      </div>
    </footer>
  );
}
