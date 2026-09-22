"""Runs one episode of any game and yields events: start, one step per decision,
end. A recording is these events saved to a file; live play streams them."""
import time

from .games import make_game


def run_episode(game_name, agent, seed, max_steps=None, deadline_ms=None):
    """With deadline_ms, a decision that arrives too late is not used: the game
    takes its default move, as it would in a real-time system. The model still
    answers, and the answer is recorded so late decisions can be studied."""
    game = make_game(game_name)
    game.reset(seed)
    yield {"type": "start", "game": game.name, "agent": agent.name, "seed": seed,
           "options": list(game.options), "frame": game.frame()}

    steps, done = 0, False
    while not done and (max_steps is None or steps < max_steps):
        state = game.describe()
        started = time.perf_counter()
        try:
            answers, error = agent.decide(state, game.questions), None
            action = answers["action"]["choice"]
            if action not in game.options:
                raise ValueError(f"answered {action!r}, which is not one of the options")
        except Exception as e:  # a failed decision must not end the episode
            answers, error, action = None, str(e), game.fallback
        latency_ms = (time.perf_counter() - started) * 1000
        latency_ms = getattr(agent, "last_latency_ms", None) or latency_ms  # agents may exclude retry waits
        retries = getattr(agent, "last_retries", 0)

        late = deadline_ms is not None and latency_ms > deadline_ms
        if late:
            action = game.fallback

        done = game.step(action)
        steps += 1
        event = {"type": "step", "t": steps, "state": state, "answers": answers, "action": action,
                 "latency_ms": round(latency_ms, 1), "frame": game.frame()}
        if late:
            event["late"] = True
        if error:
            event["error"] = error
        if retries:
            event["retries"] = retries
        yield event

    yield {"type": "end", **game.summary()}
    game.close()
