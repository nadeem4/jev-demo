import json

from arena.probe import CONTRASTS, distance, probe_sensitivity


def test_distance_is_zero_when_the_answers_are_identical():
    assert distance({"A": 0.5, "B": 0.5}, {"A": 0.5, "B": 0.5}) == 0.0


def test_distance_is_one_when_the_answers_are_opposite():
    assert distance({"A": 1.0, "B": 0.0}, {"A": 0.0, "B": 1.0}) == 1.0


def test_distance_measures_how_much_the_answer_moved():
    assert distance({"A": 0.8, "B": 0.2}, {"A": 0.5, "B": 0.5}) == 0.3


def test_every_game_has_contrast_pairs_using_its_own_state_fields():
    from arena.games import GAME_NAMES, make_game
    for game in GAME_NAMES:
        pairs = CONTRASTS[game]
        assert pairs, f"{game} has no contrast pairs"
        started = make_game(game)
        started.reset(0)
        fields = set(started.describe())
        for pair in pairs:
            assert set(pair["a"]) <= fields and set(pair["b"]) <= fields


def test_a_model_that_ignores_the_situation_scores_zero():
    blind = lambda state, questions: {"action": {"probabilities": {"STICK": 0.6, "HIT": 0.4}}}
    result = probe_sensitivity("blackjack", blind)
    assert result["sensitivity"] == 0.0
    assert len(result["pairs"]) == len(CONTRASTS["blackjack"])


def test_a_model_that_answers_the_situation_scores_high():
    import re
    from arena.games.blackjack import basic_strategy

    def reader(state, questions):  # plays basic strategy, so every pair moves it
        hand = state["your_hand"]
        total = int(re.match(r"(\d+)", hand)[1])
        up = state["dealer_shows"].split()[-1]
        best = basic_strategy(total, 1 if up == "ace" else int(up), hand.split("(")[1].startswith("soft"))
        hit = 0.9 if best == "HIT" else 0.1
        return {"action": {"probabilities": {"HIT": hit, "STICK": 1 - hit}}}

    assert probe_sensitivity("blackjack", reader)["sensitivity"] > 0.5


def test_saves_one_file_per_run(tmp_path):
    from arena.probe import run_probes
    blind = lambda state, questions: {"action": {"probabilities": {"STICK": 1.0, "HIT": 0.0}}}
    path = run_probes(["blackjack"], {"fake": blind}, out_dir=tmp_path)
    saved = json.loads(path.read_text())
    assert saved["agents"]["fake"]["blackjack"]["sensitivity"] == 0.0
