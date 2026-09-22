"""Snake on a 10x10 grid: eat food, don't hit the walls or yourself.

Moves are relative to the snake's heading (turn left, straight, turn right), so
there is no pointless "reverse". Food placement is seeded, so every agent sees
the same food on the same seed. An episode also ends after too long without
food, so a snake that circles forever can't stall a benchmark.
"""
import random
import re

from ..agents.baselines import RandomAgent

SIZE = 10
DIRS = {"N": (0, -1), "E": (1, 0), "S": (0, 1), "W": (-1, 0)}
RIGHT_OF = {"N": "E", "E": "S", "S": "W", "W": "N"}
LEFT_OF = {v: k for k, v in RIGHT_OF.items()}
ACTIONS = ["TURN_LEFT", "STRAIGHT", "TURN_RIGHT"]

QUESTIONS = {
    "action": {
        "type": "choice",
        "instructions": "You are the snake. Reach the food without hitting a wall or your own body. Pick the next move.",
        "criteria": {
            "TURN_LEFT": "Turn left, relative to the direction you are moving.",
            "STRAIGHT": "Keep going straight.",
            "TURN_RIGHT": "Turn right, relative to the direction you are moving.",
        },
    }
}


def _cells(n):
    return f"{n} cell" if n == 1 else f"{n} cells"


def food_phrase(ahead, right):
    """Food position relative to the head: ahead > 0 is in front, right > 0 is to the right."""
    along = f"{_cells(abs(ahead))} {'ahead' if ahead > 0 else 'behind'}" if ahead else ""
    side = f"{_cells(abs(right))} to your {'right' if right > 0 else 'left'}" if right else ""
    if along and side:
        return f"{along} and {side}"
    if along:
        return f"{_cells(ahead)} straight ahead" if ahead > 0 else f"{_cells(-ahead)} behind you"
    return side


class SnakeGame:
    name = "snake"
    questions = QUESTIONS
    options = ACTIONS
    fallback = "STRAIGHT"

    def __init__(self, max_steps=150, starve_after=60):
        self.max_steps, self.starve_after = max_steps, starve_after

    def reset(self, seed):
        self.rng = random.Random(seed)
        self.snake = [(5, 5), (5, 6), (5, 7)]
        self.heading = "N"
        self.steps = self.food_eaten = self.since_food = 0
        self.dead = False
        self.food = self._place_food()

    def _place_food(self):
        free = [(x, y) for x in range(SIZE) for y in range(SIZE) if (x, y) not in self.snake]
        return self.rng.choice(free)

    def _heading_for(self, action):
        return {"TURN_LEFT": LEFT_OF[self.heading], "STRAIGHT": self.heading, "TURN_RIGHT": RIGHT_OF[self.heading]}[action]

    def step(self, action):
        self.heading = self._heading_for(action)
        dx, dy = DIRS[self.heading]
        head = (self.snake[0][0] + dx, self.snake[0][1] + dy)
        eating = head == self.food
        body = self.snake if eating else self.snake[:-1]  # the tail moves away unless the snake grows
        self.steps += 1
        if not (0 <= head[0] < SIZE and 0 <= head[1] < SIZE) or head in body:
            self.dead = True
            return True
        self.snake = [head, *body]
        if eating:
            self.food_eaten += 1
            self.since_food = 0
            if len(self.snake) == SIZE * SIZE:
                return True
            self.food = self._place_food()
        else:
            self.since_food += 1
        return self.steps >= self.max_steps or self.since_food >= self.starve_after

    def _look(self, heading):
        """What a move in this direction runs into."""
        dx, dy = DIRS[heading]
        body = set(self.snake[:-1])
        x, y = self.snake[0]
        free = 0
        while True:
            x, y = x + dx, y + dy
            if not (0 <= x < SIZE and 0 <= y < SIZE):
                what = "the wall"
                break
            if (x, y) in body:
                what = "your own body"
                break
            free += 1
        if free == 0:
            return f"BLOCKED: {'wall' if what == 'the wall' else what} right next to you"
        return f"clear for {_cells(free)}, then {what}"

    def describe(self):
        hx, hy = self.snake[0]
        fdx, fdy = self.food[0] - hx, self.food[1] - hy
        ax, ay = DIRS[self.heading]
        rx, ry = DIRS[RIGHT_OF[self.heading]]
        return {
            "food": food_phrase(fdx * ax + fdy * ay, fdx * rx + fdy * ry),
            "if_you_turn_left": self._look(LEFT_OF[self.heading]),
            "if_you_go_straight": self._look(self.heading),
            "if_you_turn_right": self._look(RIGHT_OF[self.heading]),
            "your_length": f"{len(self.snake)} cells ({self.food_eaten} food eaten)",
        }

    def frame(self):
        return {"size": SIZE, "snake": [list(c) for c in self.snake], "food": list(self.food),
                "heading": self.heading, "dead": self.dead}

    def summary(self):
        return {"steps": self.steps, "died": self.dead, "food_eaten": self.food_eaten, "length": len(self.snake)}

    def close(self):
        pass


class GreedySnake:
    """Baseline: moves closer to the food, never into an immediately blocked cell.
    Reads the same text the models read."""
    name = "greedy"

    def __init__(self, seed):
        pass

    @staticmethod
    def _food(text):
        ahead = right = 0
        if m := re.search(r"(\d+) cells? (?:straight )?(ahead|behind)", text):
            ahead = int(m[1]) * (1 if m[2] == "ahead" else -1)
        if m := re.search(r"(\d+) cells? to your (right|left)", text):
            right = int(m[1]) * (1 if m[2] == "right" else -1)
        return ahead, right

    def decide(self, state, questions):
        a, r = self._food(state["food"])
        after = {"TURN_LEFT": (a, r + 1), "STRAIGHT": (a - 1, r), "TURN_RIGHT": (a, r - 1)}  # food offset after the move
        keys = {"TURN_LEFT": "if_you_turn_left", "STRAIGHT": "if_you_go_straight", "TURN_RIGHT": "if_you_turn_right"}
        safe = [m for m in ACTIONS if not state[keys[m]].startswith("BLOCKED")] or ACTIONS
        pick = min(safe, key=lambda m: abs(after[m][0]) + abs(after[m][1]))
        return {"action": {"type": "choice", "choice": pick, "probabilities": {m: float(m == pick) for m in ACTIONS}}}


SnakeGame.baselines = {"greedy": GreedySnake, "random": RandomAgent}
