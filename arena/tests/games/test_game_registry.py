import pytest

from arena.games import GAME_NAMES, make_game


def test_lists_the_games():
    assert GAME_NAMES == ["highway", "snake", "blackjack"]


def test_every_game_has_the_interface_the_runner_needs():
    for name in GAME_NAMES:
        game = make_game(name)
        game.reset(0)
        assert game.name == name
        assert isinstance(game.describe(), dict)
        assert list(game.questions) == ["action"]
        assert game.fallback in game.options
        assert isinstance(game.frame(), dict)
        assert "steps" in game.summary()
        assert game.baselines  # at least one trivial driver to compare against


def test_rejects_unknown_games():
    with pytest.raises(ValueError, match="unknown game"):
        make_game("chess")
