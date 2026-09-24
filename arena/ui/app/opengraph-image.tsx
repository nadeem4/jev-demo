import { ImageResponse } from "next/og";

// The share card. Built from the site's own tokens: the asphalt board, the
// marking yellow the model's own car is drawn in, and the sign green accent.
// The export is static, so this renders once at build time rather than per request.
export const dynamic = "force-static";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Decision Arena: two decision models play the same games, with every decision on the page";

const PAGE = "#E7E9E4";
const INK = "#171A1B";
const SOFT = "#5A615F";
const ASPHALT = "#2B2E30";
const MARKING = "#F2C230";
const TRAFFIC = "#C9CDC6";
const ACCENT = "#00674A";

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: PAGE, color: INK }}>
        <div style={{ display: "flex", flexDirection: "column", padding: "64px 72px 0", flexGrow: 1 }}>
          <div style={{ display: "flex", fontSize: 26, fontWeight: 600, color: ACCENT, letterSpacing: "0.02em" }}>
            arena.codewithnk.com
          </div>
          <div style={{ display: "flex", fontSize: 92, fontWeight: 800, letterSpacing: "-0.03em", marginTop: 18, lineHeight: 1 }}>
            Decision Arena
          </div>
          <div style={{ display: "flex", fontSize: 34, color: SOFT, marginTop: 24, maxWidth: 900, lineHeight: 1.35 }}>
            Two decision models play the same games with zero training. Every request and every answer is on the page.
          </div>
          <div style={{ display: "flex", gap: 14, marginTop: 34 }}>
            {["Jev", "Laya", "highway", "Snake", "Blackjack"].map((t) => (
              <div key={t} style={{ display: "flex", border: `2px solid ${INK}`, padding: "6px 18px", fontSize: 26, fontWeight: 600 }}>
                {t}
              </div>
            ))}
          </div>
        </div>

        {/* A slice of the board the models actually play on. */}
        <div style={{ display: "flex", position: "relative", height: 150, background: ASPHALT, width: "100%" }}>
          {[48, 99].map((top) => (
            <div key={top} style={{ display: "flex", position: "absolute", left: 0, top, width: 1200, height: 3 }}>
              {Array.from({ length: 30 }).map((_, i) => (
                <div key={i} style={{ display: "flex", width: 22, height: 3, background: "rgba(245,247,245,0.75)", marginRight: 18 }} />
              ))}
            </div>
          ))}
          <div style={{ display: "flex", position: "absolute", left: 250, top: 12, width: 92, height: 30, background: TRAFFIC }} />
          <div style={{ display: "flex", position: "absolute", left: 620, top: 63, width: 92, height: 30, background: TRAFFIC }} />
          <div style={{ display: "flex", position: "absolute", left: 880, top: 114, width: 92, height: 30, background: TRAFFIC }} />
          <div style={{ display: "flex", position: "absolute", left: 430, top: 114, width: 104, height: 30, background: MARKING }} />
        </div>
      </div>
    ),
    size,
  );
}
