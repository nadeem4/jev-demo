"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const PAGES = [
  { href: "/learn/", label: "How it works" },
  { href: "/learn/jev/", label: "Jev" },
  { href: "/learn/laya/", label: "Laya" },
  { href: "/learn/comparison/", label: "Side by side" },
];

export function LearnNav() {
  const path = usePathname();
  return (
    <nav aria-label="Learn" className="mt-6 flex flex-wrap gap-2">
      {PAGES.map(({ href, label }) => {
        const here = path.replace(/\/$/, "") === href.replace(/\/$/, "");
        return (
          <Link
            key={href}
            href={href}
            prefetch={false}
            aria-current={here ? "page" : undefined}
            className={`h-10 rounded-md border-2 px-4 text-base font-semibold leading-9 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-marking ${
              here ? "border-accent bg-accent text-accent-ink" : "border-line bg-surface text-ink hover:border-ink-soft"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
