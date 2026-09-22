"""Turns a highway snapshot into words. Decision models read meaning, not
geometry, and can't do arithmetic, so distances and speeds become buckets."""

ACTIONS = ["LANE_LEFT", "IDLE", "LANE_RIGHT", "FASTER", "SLOWER"]  # highway-env's discrete meta-actions, in index order

QUESTIONS = {
    "action": {
        "type": "choice",
        "instructions": "You are driving on a highway. Avoid crashing above all, then keep a high speed. Pick the next action.",
        "criteria": {
            "LANE_LEFT": "Change to the lane on your left.",
            "IDLE": "Keep your lane and speed.",
            "LANE_RIGHT": "Change to the lane on your right.",
            "FASTER": "Accelerate.",
            "SLOWER": "Slow down.",
        },
    }
}

VISIBLE_M = 100  # cars further than this are ignored
BESIDE_M = 8     # a car this close in a side lane blocks a lane change
BEHIND_M = 30    # side-lane cars behind only matter this close


def _speed(dv):
    if abs(dv) <= 2:
        return "about your speed"
    return f"{abs(round(dv))} m/s {'faster' if dv > 0 else 'slower'} than you"


def _ahead(car):
    dx = car["dx"]
    label = "car very close ahead" if dx < 10 else "car close ahead" if dx < 25 else "car ahead" if dx < 60 else "car far ahead"
    return f"{label} ({round(dx)} m), {_speed(car['dv'])}"


def _nearest_ahead(cars):
    ahead = [c for c in cars if 0 < c["dx"] <= VISIBLE_M]
    return min(ahead, key=lambda c: c["dx"]) if ahead else None


def _side_lane(cars):
    if any(abs(c["dx"]) <= BESIDE_M for c in cars):
        return "BLOCKED: car right beside you"
    parts = []
    if ahead := _nearest_ahead(cars):
        parts.append(_ahead(ahead))
    behind = [c for c in cars if -BEHIND_M <= c["dx"] < -BESIDE_M and c["dv"] > 2]
    if behind:
        car = max(behind, key=lambda c: c["dx"])
        parts.append(f"car behind ({round(-car['dx'])} m), {_speed(car['dv'])}")
    return "; ".join(parts) or "clear"


def _lane_name(lane, lanes):
    if lane == 0:
        return f"leftmost of {lanes} lanes"
    if lane == lanes - 1:
        return f"rightmost of {lanes} lanes"
    return f"lane {lane + 1} of {lanes} (counting from the left)"


def describe(snapshot):
    lane, lanes = snapshot["lane"], snapshot["lanes"]
    in_lane = lambda l: [c for c in snapshot["others"] if c["lane"] == l]
    ahead = _nearest_ahead(in_lane(lane))
    return {
        "your_lane": _lane_name(lane, lanes),
        "your_speed": f"{round(snapshot['speed'])} m/s (allowed range 20-30)",
        "ahead_in_your_lane": _ahead(ahead) if ahead else "clear",
        "left_lane": _side_lane(in_lane(lane - 1)) if lane > 0 else "no lane (you are in the leftmost lane)",
        "right_lane": _side_lane(in_lane(lane + 1)) if lane < lanes - 1 else "no lane (you are in the rightmost lane)",
    }
