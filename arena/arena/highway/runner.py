"""Runs one highway episode and yields events: start, one step per decision,
end. A recording is these events saved to a file; live play streams them."""
import time

from .describe import ACTIONS, QUESTIONS, describe
from .env import make_env, snapshot, frame

FALLBACK_ACTION = "IDLE"


def run_episode(agent, seed, max_steps=None):
    env = make_env()
    env.reset(seed=seed)
    start_x = env.unwrapped.vehicle.position[0]
    yield {"type": "start", "game": "highway", "agent": agent.name, "seed": seed, "frame": frame(env)}

    steps, total_reward, speeds, crashed = 0, 0.0, [], False
    done = False
    while not done and (max_steps is None or steps < max_steps):
        state = describe(snapshot(env))
        started = time.perf_counter()
        try:
            answers, error = agent.decide(state, QUESTIONS), None
            action = answers["action"]["choice"]
        except Exception as e:  # a failed decision must not end the episode
            answers, error, action = None, str(e), FALLBACK_ACTION
        latency_ms = (time.perf_counter() - started) * 1000
        latency_ms = getattr(agent, "last_latency_ms", None) or latency_ms  # agents may exclude retry waits
        retries = getattr(agent, "last_retries", 0)

        _, reward, terminated, truncated, info = env.step(ACTIONS.index(action))
        steps += 1
        total_reward += reward
        speeds.append(info["speed"])
        crashed = info["crashed"]
        done = terminated or truncated

        event = {"type": "step", "t": steps, "state": state, "answers": answers, "action": action,
                 "latency_ms": round(latency_ms, 1), "reward": round(float(reward), 4), "frame": frame(env)}
        if error:
            event["error"] = error
        if retries:
            event["retries"] = retries
        yield event

    yield {"type": "end", "steps": steps, "crashed": bool(crashed),
           "distance_m": round(float(env.unwrapped.vehicle.position[0] - start_x), 1),
           "total_reward": round(float(total_reward), 3),
           "avg_speed": round(sum(speeds) / len(speeds), 2) if speeds else 0.0}
    env.close()
