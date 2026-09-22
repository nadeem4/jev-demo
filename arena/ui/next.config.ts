import type { NextConfig } from "next";

// The arena UI is fully client-side, so it builds to static files in out/:
// served by nginx in Docker, and hostable on any static host (e.g. Vercel) later.
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true, // /results/ -> results/index.html, which any static server can serve
};

export default nextConfig;
