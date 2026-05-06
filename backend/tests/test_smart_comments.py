from __future__ import annotations

from app.seeds.tasks.wat_discoloured import TASK_WAT_DISCOLOURED
from app.services.tasks.smart_comments import _interpolate, render_suggestions


# ---------- interpolation ----------


def test_interpolate_substitutes_values() -> None:
    out = _interpolate(
        "Ran for {cold_run_minutes} min, residual {chlorine_residual} ppm.",
        {"cold_run_minutes": 8, "chlorine_residual": 0.12},
    )
    assert out == "Ran for 8 min, residual 0.12 ppm."


def test_interpolate_missing_var_renders_question_mark() -> None:
    out = _interpolate("Ran for {cold_run_minutes} min.", {})
    assert out == "Ran for ? min."


def test_interpolate_dotted_path() -> None:
    out = _interpolate("Class is {asset.class_code}.", {"asset": {"class_code": "WAT_HYD"}})
    assert out == "Class is WAT_HYD."


def test_interpolate_floats_trim_whole_numbers() -> None:
    assert _interpolate("{n}", {"n": 12.0}) == "12"
    assert _interpolate("{n}", {"n": 0.05}) == "0.05"


def test_interpolate_booleans_render_as_yes_no() -> None:
    assert _interpolate("{site_visited}", {"site_visited": True}) == "yes"
    assert _interpolate("{site_visited}", {"site_visited": False}) == "no"


# ---------- render_suggestions ----------


def test_empty_inputs_yield_empty() -> None:
    assert render_suggestions(None, {}) == []
    assert render_suggestions([], {"x": 1}) == []


def test_only_matching_conditions_emit() -> None:
    comments = [
        {"id": "a", "condition": "x == 1", "text": "alpha"},
        {"id": "b", "condition": "x == 2", "text": "beta"},
        {"id": "c", "condition": "x > 0", "text": "gamma"},
    ]
    out = render_suggestions(comments, {"x": 1})
    assert [s["id"] for s in out] == ["a", "c"]


def test_missing_condition_treated_as_always_show() -> None:
    out = render_suggestions(
        [{"id": "always", "text": "shown"}],
        {},
    )
    assert out == [{"id": "always", "text": "shown"}]


def test_broken_condition_fails_closed() -> None:
    out = render_suggestions(
        [{"id": "broken", "condition": "(((", "text": "hidden"}],
        {},
    )
    assert out == []


def test_skips_entries_missing_id_or_text() -> None:
    out = render_suggestions(
        [
            {"id": "ok", "text": "kept"},
            {"text": "no id"},
            {"id": "no_text"},
        ],
        {},
    )
    assert [s["id"] for s in out] == ["ok"]


def test_duplicate_ids_dropped() -> None:
    out = render_suggestions(
        [
            {"id": "x", "text": "first"},
            {"id": "x", "text": "second"},
        ],
        {},
    )
    assert out == [{"id": "x", "text": "first"}]


def test_preserves_declared_order() -> None:
    comments = [
        {"id": "third", "text": "3"},
        {"id": "first", "text": "1"},
        {"id": "second", "text": "2"},
    ]
    out = render_suggestions(comments, {})
    assert [s["id"] for s in out] == ["third", "first", "second"]


# ---------- WAT-TASK-DISCOLOURED end-to-end shape ----------


def test_discoloured_seed_cleared_path() -> None:
    out = render_suggestions(
        TASK_WAT_DISCOLOURED["smart_comments"],
        {
            "cold_outcome": "cleared",
            "cold_run_minutes": 8,
            "chlorine_residual": 0.12,
        },
    )
    ids = {s["id"] for s in out}
    assert "discoloured_cleared" in ids
    cleared = next(s for s in out if s["id"] == "discoloured_cleared")
    assert "8 min" in cleared["text"]
    assert "0.12 ppm" in cleared["text"]


def test_discoloured_seed_internal_plumbing_path() -> None:
    out = render_suggestions(
        TASK_WAT_DISCOLOURED["smart_comments"],
        {"likely_cause": "internal_plumbing"},
    )
    ids = {s["id"] for s in out}
    assert "discoloured_internal_plumbing" in ids


def test_discoloured_seed_no_data_yields_empty() -> None:
    # No answers in task_data -> no condition matches -> no chips.
    out = render_suggestions(TASK_WAT_DISCOLOURED["smart_comments"], {})
    assert out == []
