// The Python arena server (uv run python -m arena.server). The browser talks to it
// directly: a dev proxy re-chunks long server-sent-event streams and breaks them.
export const ARENA_API = process.env.NEXT_PUBLIC_ARENA_API ?? "http://localhost:8000";
