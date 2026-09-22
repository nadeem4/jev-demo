"use client";

import { useEffect, useId, useRef } from "react";

/** Renders a Mermaid diagram in black and white, on white, in both page themes. */
export function Mermaid({ chart, label }: { chart: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");

  useEffect(() => {
    let cancelled = false;
    import("mermaid").then(async ({ default: mermaid }) => {
      mermaid.initialize({
        startOnLoad: false,
        theme: "base",
        themeVariables: {
          background: "#ffffff", primaryColor: "#ffffff", secondaryColor: "#ffffff", tertiaryColor: "#ffffff",
          primaryTextColor: "#000000", primaryBorderColor: "#000000", lineColor: "#000000",
          fontFamily: "var(--font-overpass), system-ui, sans-serif", fontSize: "15px",
        },
      });
      const { svg } = await mermaid.render(`m${id}`, chart);
      if (!cancelled && ref.current) ref.current.innerHTML = svg;
    });
    return () => { cancelled = true; };
  }, [chart, id]);

  return (
    <figure className="my-6 overflow-x-auto rounded-md border-2 border-black bg-white p-4" role="img" aria-label={label}>
      <div ref={ref} className="flex min-h-24 justify-center" />
    </figure>
  );
}
