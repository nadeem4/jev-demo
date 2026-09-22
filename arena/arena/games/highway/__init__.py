"""highway-env (highway-v0): change lanes and speed through dense traffic without crashing."""
from ...agents.baselines import ConstantAgent, RandomAgent
from .describe import ACTIONS, QUESTIONS, describe
from .env import frame, make_env, snapshot


class HighwayGame:
    name = "highway"
    questions = QUESTIONS
    options = ACTIONS
    fallback = "IDLE"  # used when a decision fails: keep lane and speed
    baselines = {"idle": lambda seed: ConstantAgent("IDLE"), "random": RandomAgent}

    def reset(self, seed):
        self.env = make_env()
        self.env.reset(seed=seed)
        self.start_x = self.env.unwrapped.vehicle.position[0]
        self.steps, self.total_reward, self.speeds, self.crashed = 0, 0.0, [], False

    def describe(self):
        return describe(snapshot(self.env))

    def step(self, action):
        _, reward, terminated, truncated, info = self.env.step(ACTIONS.index(action))
        self.steps += 1
        self.total_reward += float(reward)
        self.speeds.append(info["speed"])
        self.crashed = bool(info["crashed"])
        return terminated or truncated

    def frame(self):
        return frame(self.env)

    def summary(self):
        return {
            "steps": self.steps,
            "crashed": self.crashed,
            "distance_m": round(float(self.env.unwrapped.vehicle.position[0] - self.start_x), 1),
            "total_reward": round(self.total_reward, 3),
            "avg_speed": round(sum(self.speeds) / len(self.speeds), 2) if self.speeds else 0.0,
        }

    def close(self):
        self.env.close()
