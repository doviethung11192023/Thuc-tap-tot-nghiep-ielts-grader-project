import pytest

from schemas.llm_output import AgentCriterionOutput, AllAgentOutputs
from utils.band_rounding import normalize_band, round_overall_band


@pytest.mark.parametrize("avg, expected", [
    (6.0, 6.0), (6.125, 6.0), (6.25, 6.5), (6.375, 6.5),
    (6.625, 6.5), (6.75, 7.0), (6.875, 7.0),
])
def test_round_overall_band_follows_ielts_rule(avg, expected):
    assert round_overall_band(avg) == expected


@pytest.mark.parametrize("raw, expected", [
    (10, 9.0), (-1, 0.0), (6.3, 6.5), (6.2, 6.0), ("7", 7.0), (None, 0.0), (float("nan"), 0.0),
])
def test_normalize_band_clamps_and_snaps(raw, expected):
    assert normalize_band(raw) == expected


def test_all_agent_outputs_overall_band():
    def out(band):
        return AgentCriterionOutput(band=band, summary="")
    outputs = AllAgentOutputs(ta=out(6.0), cc=out(6.5), lr=out(6.5), gra=out(6.0))
    assert outputs.overall_band == 6.5  # avg 6.25 → 6.5
