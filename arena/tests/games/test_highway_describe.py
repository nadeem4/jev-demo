from arena.games.highway.describe import describe, ACTIONS, QUESTIONS

# Snapshot: ego lane (0 = leftmost), lane count, speed, and other cars relative to ego
# (dx metres ahead, dv m/s faster than ego). Plain dicts so tests need no simulator.
def snap(lane=1, lanes=3, speed=25.0, others=()):
    return {"lane": lane, "lanes": lanes, "speed": speed,
            "others": [{"lane": l, "dx": dx, "dv": dv} for l, dx, dv in others]}


def test_names_the_lane_position():
    assert describe(snap(lane=0, lanes=4))["your_lane"] == "leftmost of 4 lanes"
    assert describe(snap(lane=3, lanes=4))["your_lane"] == "rightmost of 4 lanes"
    assert describe(snap(lane=1, lanes=4))["your_lane"] == "lane 2 of 4 (counting from the left)"


def test_reports_missing_side_lanes():
    state = describe(snap(lane=0, lanes=3))
    assert state["left_lane"] == "no lane (you are in the leftmost lane)"


def test_buckets_distance_and_speed_into_words():
    state = describe(snap(others=[(1, 12, -4)]))
    assert state["ahead_in_your_lane"] == "car close ahead (12 m), 4 m/s slower than you"


def test_empty_lane_is_clear():
    assert describe(snap(others=[]))["ahead_in_your_lane"] == "clear"


def test_car_beside_you_blocks_the_lane():
    state = describe(snap(lane=1, others=[(0, 3, 0)]))
    assert state["left_lane"] == "BLOCKED: car right beside you"


def test_side_lane_reports_nearest_car():
    state = describe(snap(lane=1, others=[(2, 40, 1), (2, 70, 0)]))
    assert state["right_lane"] == "car ahead (40 m), about your speed"


def test_ignores_far_away_cars():
    assert describe(snap(others=[(1, 150, -5)]))["ahead_in_your_lane"] == "clear"


def test_warns_about_fast_car_closing_from_behind():
    state = describe(snap(lane=1, others=[(0, -15, 6)]))
    assert state["left_lane"] == "car behind (15 m), 6 m/s faster than you"


def test_questions_offer_exactly_the_env_actions():
    assert ACTIONS == ["LANE_LEFT", "IDLE", "LANE_RIGHT", "FASTER", "SLOWER"]
    assert list(QUESTIONS["action"]["criteria"]) == ACTIONS
