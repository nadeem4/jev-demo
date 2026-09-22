"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Arena" },
  { href: "/results/", label: "Results" },
  { href: "/scorecard/", label: "Scorecard" },
  { href: "/learn/", label: "Learn" },
];

export function SiteNav() {
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href.replace(/\/$/, "")));
  return (
    <header className="border-b border-line">
      <nav aria-label="Site" className="mx-auto flex h-16 max-w-[1400px] items-center gap-6 px-4 md:px-8">
        {/* prefetch off: static export writes segment files where this Next version does not look, so prefetches 404 */}
        <Link href="/" prefetch={false} className="mr-auto text-lg font-extrabold tracking-tight">Decision Arena</Link>
        {LINKS.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            prefetch={false}
            aria-current={active(href) ? "page" : undefined}
            className={`py-1 text-base font-semibold underline-offset-8 focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-marking ${
              active(href) ? "text-ink underline decoration-accent decoration-[3px]" : "text-ink-soft hover:text-ink"
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
