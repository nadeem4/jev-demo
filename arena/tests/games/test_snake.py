import pytest

from arena.games.snake import SnakeGame, GreedySnake

QUESTIONS = SnakeGame.questions


def game(seed=0, **kw):
    g = SnakeGame(**kw)
    g.reset(seed)
    return g


def put(g, snake, heading, food):
    """Arrange a board by hand: snake is head-first [(x, y), ...]."""
    g.snake, g.heading, g.food = [tuple(c) for c in snake], heading, tuple(food)


def test_starts_three_long_in_the_middle_heading_up():
    g = game()
    assert g.snake == [(5, 5), (5, 6), (5, 7)]
    assert g.heading == "N"


def test_same_seed_places_food_the_same_way():
    assert game(3).food == game(3).food
    assert game(3).food not in game(3).snake


def test_turns_are_relative_to_the_heading():
    g = game()
    put(g, [(5, 5), (5, 6), (5, 7)], "N", (0, 0))
    g.step("TURN_RIGHT")
    assert g.snake[0] == (6, 5) and g.heading == "E"
    g.step("TURN_LEFT")
    assert g.snake[0] == (6, 4) and g.heading == "N"


def test_moving_keeps_the_length():
    g = game()
    put(g, [(5, 5), (5, 6), (5, 7)], "N", (0, 0))
    g.step("STRAIGHT")
    assert g.snake == [(5, 4), (5, 5), (5, 6)]


def test_eating_grows_the_snake_and_places_new_food():
    g = game()
    put(g, [(5, 5), (5, 6), (5, 7)], "N", (5, 4))
    g.step("STRAIGHT")
    assert len(g.snake) == 4
    assert g.summary()["food_eaten"] == 1
    assert g.food not in g.snake


def test_hitting_a_wall_ends_the_game():
    g = game()
    put(g, [(5, 0), (5, 1), (5, 2)], "N", (9, 9))
    assert g.step("STRAIGHT") is True
    assert g.summary()["died"] is True


def test_hitting_itself_ends_the_game():
    g = game()
    put(g, [(5, 5), (5, 6), (6, 6), (6, 5), (6, 4)], "N", (0, 0))
    assert g.step("TURN_RIGHT") is True  # into (6, 5), its own body
    assert g.summary()["died"] is True


def test_moving_into_the_cell_the_tail_leaves_is_safe():
    g = game()
    put(g, [(5, 5), (5, 6), (6, 6), (6, 5)], "N", (0, 0))
    assert g.step("TURN_RIGHT") is False  # (6, 5) is the tail, which moves away
    assert g.summary()["died"] is False


def test_ends_after_too_long_without_food():
    g = game(starve_after=3)
    put(g, [(5, 5), (5, 6), (5, 7)], "N", (9, 9))
    assert [g.step(a) for a in ["TURN_RIGHT", "TURN_LEFT", "TURN_RIGHT"]] == [False, False, True]
    assert g.summary()["died"] is False


def test_describes_food_relative_to_the_heading():
    g = game()
    put(g, [(5, 5), (5, 6), (5, 7)], "N", (7, 2))
    assert g.describe()["food"] == "3 cells ahead and 2 cells to your right"
    put(g, [(5, 5), (5, 6), (5, 7)], "N", (5, 1))
    assert g.describe()["food"] == "4 cells straight ahead"


def test_describes_what_each_move_runs_into():
    g = game()
    put(g, [(0, 5), (0, 6), (0, 7)], "N", (9, 9))
    state = g.describe()
    assert state["if_you_turn_left"] == "BLOCKED: wall right next to you"
    assert state["if_you_go_straight"] == "clear for 5 cells, then the wall"
    assert state["if_you_turn_right"] == "clear for 9 cells, then the wall"


def test_describes_its_own_body_as_an_obstacle():
    g = game()
    put(g, [(5, 5), (5, 6), (6, 6), (6, 5), (6, 4)], "N", (0, 0))
    assert g.describe()["if_you_turn_right"] == "BLOCKED: your own body right next to you"


def test_greedy_snake_heads_for_food_without_dying():
    g = game()
    put(g, [(5, 5), (5, 6), (5, 7)], "N", (8, 5))
    assert GreedySnake(0).decide(g.describe(), QUESTIONS)["action"]["choice"] == "TURN_RIGHT"
    put(g, [(9, 5), (9, 6), (9, 7)], "N", (9, 9))  # food behind, right is a wall
    assert GreedySnake(0).decide(g.describe(), QUESTIONS)["action"]["choice"] != "TURN_RIGHT"


def test_frame_has_what_the_ui_draws():
    f = game().frame()
    assert f["size"] == 10
    assert f["snake"][0] == [5, 5]
    assert set(f) >= {"food", "heading", "dead"}


def test_reference_is_the_greedy_move():
    g = game()
    put(g, [(5, 5), (5, 6), (5, 7)], "N", (8, 5))
    assert SnakeGame.reference(g.describe()) == "TURN_RIGHT"
