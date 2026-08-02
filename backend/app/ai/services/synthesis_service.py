from __future__ import annotations
import json
import logging
import uuid
from dataclasses import asdict

from openai import AsyncOpenAI
from settings.config import get_settings
from services.langfuse.prompt_manager import PromptManager
from schemas.llm_output import AllAgentOutputs
from utils.char_index_resolver import resolve_span_global

logger = logging.getLogger(__name__)

class SynthesisService:
    def __init__(self):
        self.settings = get_settings()
        self.prompt_manager = PromptManager()
        self.client = AsyncOpenAI(
            api_key=self.settings.qwen_api_key,
            base_url=self.settings.default_base_url,
        )

    async def synthesize_and_rewrite(
        self,
        title: str,
        essay_raw: str,
        all_agent_outputs: AllAgentOutputs,
        max_retries: int = 2
    ) -> dict:
        
        # 1. Prepare string feedbacks
        ta_str = json.dumps(asdict(all_agent_outputs.ta), ensure_ascii=False)
        cc_str = json.dumps(asdict(all_agent_outputs.cc), ensure_ascii=False)
        lr_str = json.dumps(asdict(all_agent_outputs.lr), ensure_ascii=False)
        gra_str = json.dumps(asdict(all_agent_outputs.gra), ensure_ascii=False)
        
        # 2. Get prompt
        compiled = self.prompt_manager.get_rewrite_prompt(
            title=title,
            essay=essay_raw,
            ta_feedback=ta_str,
            cc_feedback=cc_str,
            lr_feedback=lr_str,
            gra_feedback=gra_str
        )
        
        messages = list(compiled.messages)
        
        # 3. Query LLM
        llm_json = None
        for attempt in range(max_retries + 1):
            try:
                response = await self.client.chat.completions.create(
                    model=compiled.model,
                    messages=messages,
                    temperature=compiled.temperature,
                    max_tokens=compiled.max_tokens,
                    response_format={"type": "json_object"},
                )
                raw_content = response.choices[0].message.content or "{}"
                
                if raw_content.startswith("```json"):
                    raw_content = raw_content.split("```json")[1].rsplit("```", 1)[0].strip()
                elif raw_content.startswith("```"):
                    raw_content = raw_content.split("```")[1].rsplit("```", 1)[0].strip()
                    
                llm_json = json.loads(raw_content)
                with open("raw_llm.json", "w") as f:
                    f.write(raw_content)
                break
                
            except Exception as e:
                if attempt == max_retries:
                    logger.error(f"Rewrite Agent failed after {max_retries} retries. Error: {e}")
                    raise
                
                error_msg = f"Your previous output failed JSON validation with error: {e}. Return ONLY valid JSON."
                messages.append({"role": "assistant", "content": raw_content if 'raw_content' in locals() else "{}"})
                messages.append({"role": "user", "content": error_msg})
                
        if not llm_json:
            raise ValueError("Failed to retrieve valid JSON from Rewrite Agent.")
            
        # 4. Post-processing: Map coordinates
        annotations = llm_json.get("inline_annotations", [])
        valid_annotations = []
        
        for anno in annotations:
            original_text = anno.get("original_text", "")
            span = resolve_span_global(original_text, essay_raw)
            if span:
                anno["id"] = str(uuid.uuid4())
                anno["position_start"] = span[0]
                anno["position_end"] = span[1]
                valid_annotations.append(anno)

        # 4b. Remove overlapping annotations
        # Priority: error (0) > logic_issue (1) > upgrade (2) > strength (3)
        # If two annotations overlap, keep the higher-priority one.
        _priority = {"error": 0, "logic_issue": 1, "upgrade": 2, "strength": 3}
        # Sort by start position, then by priority (lower = more important)
        valid_annotations.sort(
            key=lambda x: (x["position_start"], _priority.get(x.get("type", "upgrade"), 99))
        )
        non_overlapping = []
        last_end = -1
        for anno in valid_annotations:
            if anno["position_start"] >= last_end:
                non_overlapping.append(anno)
                last_end = anno["position_end"]
            else:
                # Overlap detected — keep whichever has higher priority
                prev = non_overlapping[-1]
                if _priority.get(anno.get("type"), 99) < _priority.get(prev.get("type"), 99):
                    # New anno has higher priority, replace the previous one
                    non_overlapping[-1] = anno
                    last_end = anno["position_end"]
                # else: keep existing, discard current
        valid_annotations = non_overlapping

                
        # 5. Generate overall_upgraded_essay
        rewrites = [a for a in valid_annotations if "corrected_text" in a and a["corrected_text"]]
        rewrites_sorted = sorted(rewrites, key=lambda x: x["position_start"], reverse=True)
        
        revised_essay = essay_raw
        for rw in rewrites_sorted:
            start = rw["position_start"]
            end = rw["position_end"]
            revised_essay = revised_essay[:start] + rw["corrected_text"] + revised_essay[end:]
            
        # 6. BUILD FINAL FRONTEND JSON IN PYTHON
        def map_items(items):
            res = []
            for i in items:
                if isinstance(i, str):
                    res.append(i)
                elif isinstance(i, dict):
                    val = i.get("issue") or i.get("strength") or i.get("description") or i.get("point")
                    if not val and len(i) > 0:
                        val = str(list(i.values())[0])
                    res.append(str(val) if val else str(i))
                else:
                    res.append(str(i))
            return res

        llm_criteria = llm_json.get("criteria_analysis", {})
        
        def get_sub(key):
            node = llm_criteria.get(key, {})
            return node.get("sub_criteria", node)

        final_json = {
            "scores": {
                "overall_band": all_agent_outputs.overall_band,
                "task_response": all_agent_outputs.ta.band,
                "coherence_cohesion": all_agent_outputs.cc.band,
                "lexical_resource": all_agent_outputs.lr.band,
                "grammatical_range_and_accuracy": all_agent_outputs.gra.band
            },
            "criteria_analysis": {
                "task_response": {
                    "sub_criteria": get_sub("task_response"),
                    "feedback": {
                        "strengths": map_items(all_agent_outputs.ta.strengths),
                        "areas_to_improve": map_items(all_agent_outputs.ta.issues)
                    }
                },
                "coherence_cohesion": {
                    "sub_criteria": get_sub("coherence_cohesion"),
                    "feedback": {
                        "strengths": map_items(all_agent_outputs.cc.strengths),
                        "areas_to_improve": map_items(all_agent_outputs.cc.issues)
                    }
                },
                "lexical_resource": {
                    "sub_criteria": get_sub("lexical_resource"),
                    "feedback": {
                        "strengths": map_items(all_agent_outputs.lr.strengths),
                        "areas_to_improve": map_items(all_agent_outputs.lr.issues)
                    }
                },
                "grammatical_range_and_accuracy": {
                    "sub_criteria": get_sub("grammatical_range_and_accuracy"),
                    "feedback": {
                        "strengths": map_items(all_agent_outputs.gra.strengths),
                        "areas_to_improve": map_items(all_agent_outputs.gra.issues)
                    }
                }
            },
            "inline_annotations": valid_annotations,
            "overall_upgraded_essay": revised_essay,
            "word_count": len(essay_raw.split())
        }
        
        return final_json
