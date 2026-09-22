import pytest

from arena.games.blackjack import BlackjackGame, BasicStrategy, basic_strategy

QUESTIONS = BlackjackGame.questions


def game(seed=0, hands=20):
    g = BlackjackGame(hands=hands)
    g.reset(seed)
    return g


def deal(g, player, dealer):
    g.env.unwrapped.player, g.env.unwrapped.dealer = list(player), list(dealer)


@pytest.mark.parametrize("total, dealer, soft, move", [
    (11, 10, False, "HIT"),
    (12, 3, False, "HIT"),
    (12, 4, False, "STICK"),
    (16, 6, False, "STICK"),
    (16, 10, False, "HIT"),
    (17, 1, False, "STICK"),
    (17, 6, True, "HIT"),
    (18, 8, True, "STICK"),
    (18, 9, True, "HIT"),
    (19, 10, True, "STICK"),
])
def test_basic_strategy(total, dealer, soft, move):
    assert basic_strategy(total, dealer, soft) == move


def test_same_seed_deals_the_same_cards():
    a, b = game(4), game(4)
    assert (a.env.unwrapped.player, a.env.unwrapped.dealer) == (b.env.unwrapped.player, b.env.unwrapped.dealer)


def test_describes_a_hard_hand_and_the_dealer_card():
    g = game()
    deal(g, [10, 6], [10, 7])
    state = g.describe()
    assert state["your_hand"] == "16 (hard: no ace counted as 11)"
    assert state["dealer_shows"] == "a 10"
    assert state["hand"] == "1 of 20"


def test_describes_a_soft_hand_and_a_dealer_ace():
    g = game()
    deal(g, [1, 6], [1, 9])
    state = g.describe()
    assert state["your_hand"] == "17 (soft: an ace counts as 11, so one more card cannot bust you)"
    assert state["dealer_shows"] == "an ace"


def test_sticking_finishes_the_hand_and_deals_the_next():
    g = game()
    deal(g, [10, 6], [10, 7])
    assert g.step("STICK") is False
    s = g.summary()
    assert (s["hands"], s["losses"], s["net"]) == (1, 1, -1.0)
    assert g.frame()["last_hand"]["result"] == "loss"
    assert g.frame()["last_hand"]["dealer"] == [10, 7]


def test_hitting_past_21_loses():
    g = game()
    deal(g, [10, 10, 1], [10, 7])
    g.step("HIT")
    assert g.summary()["losses"] == 1


def test_records_whether_each_decision_matched_basic_strategy():
    g = game()
    deal(g, [10, 6], [10, 7])  # 16 vs 10: basic strategy hits
    g.step("STICK")
    assert g.summary()["basic_strategy_match"] == 0.0


def test_session_ends_after_the_last_hand():
    g = game(hands=2)
    done, n = False, 0
    while not done:
        done = g.step("STICK")
        n += 1
    assert n == 2
    assert g.summary()["hands"] == 2


def test_basic_strategy_agent_reads_the_same_text_as_the_models():
    g = game()
    deal(g, [10, 6], [10, 7])
    assert BasicStrategy(0).decide(g.describe(), QUESTIONS)["action"]["choice"] == "HIT"
    deal(g, [1, 7], [8, 7])
    assert BasicStrategy(0).decide(g.describe(), QUESTIONS)["action"]["choice"] == "STICK"


def test_frame_hides_the_dealer_hole_card_during_a_hand():
    g = game()
    deal(g, [10, 6], [10, 7])
    f = g.frame()
    assert f["player"] == [10, 6]
    assert f["dealer_up"] == 10
    assert "dealer" not in f


def test_frame_shows_what_basic_strategy_advised_for_the_last_decision():
    g = game()
    assert g.frame()["advice"] is None
    deal(g, [10, 6], [10, 7])
    g.step("STICK")
    assert g.frame()["advice"] == "HIT"
