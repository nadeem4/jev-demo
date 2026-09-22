"""Arena API for the UI in ui/: live episodes as server-sent events, and recordings.

    docker compose up --build            # from the repo root: API and UI together
    uv run python -m arena.server        # or just the API, on http://localhost:8000
"""
import argparse
import json
import re
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from .agents import MODELS, make_agent
from .games import GAME_NAMES
from .runner import run_episode

NAME = re.compile(r"^[\w-]+$")
VIEWER_GONE = ConnectionError  # includes BrokenPipe, ConnectionReset and Windows ConnectionAborted
UI_HINT = "This is the arena API. The UI is on http://localhost:3000 (docker compose up, or npm run dev in ui/).\n"


def sse(event):
    return f"data: {json.dumps(event)}\n\n"


def list_runs(runs_dir):
    runs_dir = Path(runs_dir)
    if not runs_dir.is_dir():
        return {}
    return {
        game.name: {
            agent.name: sorted(int(f.stem.removeprefix("seed-")) for f in agent.glob("seed-*.json"))
            for agent in sorted(game.iterdir()) if agent.is_dir()
        }
        for game in sorted(runs_dir.iterdir()) if game.is_dir()
    }


PROBES_DIR = "probes"  # sits next to the per-game result folders


def list_results(results_dir):
    """Benchmark results per game, newest first (file names are timestamps)."""
    results_dir = Path(results_dir)
    if not results_dir.is_dir():
        return {}
    return {
        game.name: [json.loads(f.read_text()) for f in sorted(game.glob("*.json"), reverse=True)]
        for game in sorted(results_dir.iterdir()) if game.is_dir() and game.name != PROBES_DIR
    }


def latest_probe(results_dir):
    """The newest sensitivity probe run, or None."""
    files = sorted((Path(results_dir) / PROBES_DIR).glob("*.json"), reverse=True)
    return json.loads(files[0].read_text()) if files else None


def live_events(game, agent_name, seed, max_steps, get_agent):
    yield {"type": "status", "message": f"Starting {agent_name}"}
    try:
        agent = get_agent(agent_name, game, seed)
        yield from run_episode(game, agent, seed=seed, max_steps=max_steps)
    except Exception as e:  # show the problem in the UI instead of a dead stream
        yield {"type": "error", "message": f"{agent_name}: {e}"}


_agents, _lock = {}, threading.Lock()


def cached_agent(name, game, seed):
    """Jev and Laya are loaded once per server (Laya takes a while); baselines are
    game-specific and cheap, so they're built per episode."""
    if name not in MODELS:
        return make_agent(name, game, seed)
    with _lock:
        if name not in _agents:
            _agents[name] = make_agent(name, laya_checkpoint="multilingual")
        return _agents[name]


def _preload(name):
    try:
        cached_agent(name, GAME_NAMES[0], 0)
        print(f"{name} loaded")
    except Exception as e:  # the UI will show the error when this agent is picked
        print(f"Could not preload {name}: {e}")


def make_server(port=8000, runs_dir="runs", get_agent=cached_agent, host="127.0.0.1", results_dir="results"):
    runs_dir = Path(runs_dir)

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *args):
            pass

        def _send(self, code, body, kind):
            data = body.encode() if isinstance(body, str) else body
            self.send_response(code)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Content-Type", kind)
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)

        def do_GET(self):
            url = urlparse(self.path)
            parts = [p for p in url.path.split("/") if p]
            if not parts:
                return self._send(200, UI_HINT, "text/plain")
            if parts == ["api", "probes"]:
                return self._send(200, json.dumps(latest_probe(results_dir)), "application/json")
            if parts == ["api", "results"]:
                return self._send(200, json.dumps(list_results(results_dir)), "application/json")
            if parts == ["api", "runs"]:
                return self._send(200, json.dumps(list_runs(runs_dir)), "application/json")
            if len(parts) == 5 and parts[:2] == ["api", "runs"]:
                game, agent, seed = parts[2:]
                file = runs_dir / game / agent / f"seed-{seed}.json"
                if NAME.match(game) and NAME.match(agent) and seed.isdigit() and file.is_file():
                    return self._send(200, file.read_bytes(), "application/json")
                return self._send(404, "Recording not found", "text/plain")
            if parts == ["api", "live"]:
                return self._live(parse_qs(url.query))
            self._send(404, "Not found", "text/plain")

        def _live(self, q):
            game = q.get("game", ["highway"])[0]
            agent = q.get("agent", [""])[0]
            seed = q.get("seed", ["0"])[0]
            max_steps = q.get("max_steps", [None])[0]
            if game not in GAME_NAMES or not NAME.match(agent) or not seed.isdigit():
                return self._send(400, "Bad game, agent or seed", "text/plain")
            self.send_response(200)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Content-Type", "text/event-stream")
            self.send_header("Cache-Control", "no-cache")
            self.end_headers()
            try:
                for event in live_events(game, agent, int(seed), int(max_steps) if max_steps else None, get_agent):
                    self.wfile.write(sse(event).encode())
                    self.wfile.flush()
            except VIEWER_GONE:
                pass  # viewer closed the page

    return ThreadingHTTPServer((host, port), Handler)


def main():
    p = argparse.ArgumentParser(description="Serve the arena API for the UI.")
    p.add_argument("--host", default="127.0.0.1", help="0.0.0.0 inside a container")
    p.add_argument("--port", type=int, default=8000)
    p.add_argument("--runs", default="runs")
    p.add_argument("--results", default="results")
    args = p.parse_args()
    server = make_server(args.port, args.runs, host=args.host, results_dir=args.results)
    # Laya takes up to a minute to load; start now so it's ready by the first Play.
    threading.Thread(target=_preload, args=("laya",), daemon=True).start()
    print(f"Arena API on http://localhost:{args.port} (Ctrl+C to stop). Loading Laya in the background...")
    print("The UI is on http://localhost:3000 (docker compose up, or npm run dev in ui/)")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
