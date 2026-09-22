"""Adapter between highway-env and the arena: reads the road directly (in
metres) instead of the normalised observation vector."""
import gymnasium as gym
import highway_env  # noqa: F401  (registers the envs)

ENV_ID = "highway-v0"
FRAME_RANGE_M = 150  # cars further than this from ego are left out of frames


def make_env():
    return gym.make(ENV_ID)


def _lane(vehicle):
    return vehicle.lane_index[2]


def snapshot(env):
    u = env.unwrapped
    ego = u.vehicle
    return {
        "lane": _lane(ego),
        "lanes": u.config["lanes_count"],
        "speed": round(float(ego.speed), 1),
        "others": [
            {"lane": _lane(v), "dx": float(v.position[0] - ego.position[0]), "dv": float(v.speed - ego.speed)}
            for v in u.road.vehicles if v is not ego
        ],
    }


def _car(v):
    return {"x": round(float(v.position[0]), 2), "y": round(float(v.position[1]), 2),
            "heading": round(float(v.heading), 3), "speed": round(float(v.speed), 1)}


def frame(env):
    u = env.unwrapped
    ego = u.vehicle
    return {
        "ego": {**_car(ego), "crashed": bool(ego.crashed)},
        "others": [_car(v) for v in u.road.vehicles
                   if v is not ego and abs(v.position[0] - ego.position[0]) <= FRAME_RANGE_M],
    }
