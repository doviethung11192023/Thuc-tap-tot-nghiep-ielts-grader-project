"""
Tests for LLM Evaluator (Phase D).
"""
import pytest
import asyncio
import json
from unittest.mock import patch, AsyncMock, MagicMock
from services.llm_evaluator import evaluate_criterion, evaluate_all_criteria, _parse_and_validate
from schemas.llm_output import AgentCriterionOutput
from services.prompt_builder import CriterionPrompts, CompiledPrompt

@pytest.fixture
def dummy_prompt():
    return CompiledPrompt(
        messages=[{"role": "user", "content": "test"}],
        model="test-model",
        temperature=0.0,
        max_tokens=1000,
        langfuse_prompt=None,
    )

def test_parse_and_validate_success():
    raw_json = json.dumps({
        "band": 7.5,
        "summary": "Good essay",
        "strengths": [{"strength": "Good voc", "evidence": "[1]", "impact": "clear"}],
        "issues": [],
        "improvements": []
    })
    result = _parse_and_validate(raw_json)
    assert isinstance(result, AgentCriterionOutput)
    assert result.band == 7.5
    assert len(result.strengths) == 1

def test_parse_and_validate_markdown_wrapper():
    raw_json = "```json\n" + json.dumps({
        "band": 6.5,
        "summary": "OK",
        "strengths": [],
        "issues": [],
        "improvements": []
    }) + "\n```"
    result = _parse_and_validate(raw_json)
    assert result.band == 6.5

def test_parse_and_validate_missing_keys():
    raw_json = json.dumps({
        "band": 7.5,
        "summary": "Good essay"
    })
    with pytest.raises(ValueError, match="Missing keys"):
        _parse_and_validate(raw_json)

@pytest.mark.asyncio
@patch("services.llm_evaluator._get_async_client")
async def test_evaluate_criterion_success(mock_get_client, dummy_prompt):
    mock_client = AsyncMock()
    mock_get_client.return_value = mock_client
    
    # Mock LLM response
    mock_response = MagicMock()
    mock_response.choices = [MagicMock()]
    mock_response.choices[0].message.content = json.dumps({
        "band": 8.0,
        "summary": "Excellent",
        "strengths": [],
        "issues": [],
        "improvements": []
    })
    mock_client.chat.completions.create.return_value = mock_response
    
    result = await evaluate_criterion("ta", dummy_prompt)
    assert result.band == 8.0
    assert mock_client.chat.completions.create.call_count == 1

@pytest.mark.asyncio
@patch("services.llm_evaluator._get_async_client")
async def test_evaluate_criterion_retry_success(mock_get_client, dummy_prompt):
    mock_client = AsyncMock()
    mock_get_client.return_value = mock_client
    
    # First response invalid, second response valid
    resp_invalid = MagicMock()
    resp_invalid.choices = [MagicMock()]
    resp_invalid.choices[0].message.content = "Invalid JSON"
    
    resp_valid = MagicMock()
    resp_valid.choices = [MagicMock()]
    resp_valid.choices[0].message.content = json.dumps({
        "band": 7.0,
        "summary": "Good",
        "strengths": [],
        "issues": [],
        "improvements": []
    })
    
    mock_client.chat.completions.create.side_effect = [resp_invalid, resp_valid]
    
    result = await evaluate_criterion("cc", dummy_prompt)
    assert result.band == 7.0
    assert mock_client.chat.completions.create.call_count == 2

@pytest.mark.asyncio
@patch("services.llm_evaluator.evaluate_criterion")
async def test_evaluate_all_criteria(mock_eval, dummy_prompt):
    mock_eval.side_effect = [
        AgentCriterionOutput(8.0, "ta", [], [], []),
        AgentCriterionOutput(7.5, "cc", [], [], []),
        AgentCriterionOutput(7.0, "lr", [], [], []),
        AgentCriterionOutput(6.5, "gra", [], [], [])
    ]
    
    prompts = CriterionPrompts(dummy_prompt, dummy_prompt, dummy_prompt, dummy_prompt)
    
    results = await evaluate_all_criteria(prompts)
    
    assert results.ta.band == 8.0
    assert results.cc.band == 7.5
    assert results.lr.band == 7.0
    assert results.gra.band == 6.5
    assert results.overall_band == 7.5  # (8+7.5+7+6.5)/4 = 7.25 -> 7.5
