import os
import sys

# Add backend/app/ai to path if needed for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.langfuse.client import get_langfuse_client

def upload_rewrite_prompt():
    client = get_langfuse_client()

    system_prompt = """You are an expert IELTS Writing Examiner and Chief Synthesizer. 
Your task is to consolidate the feedback from four specific IELTS criterion examiners (Task Achievement, Coherence & Cohesion, Lexical Resource, Grammatical Range & Accuracy) into a cohesive JSON response.

You will be provided with:
1. The Essay Title
2. The Student's Essay
3. Four JSON feedback objects from the sub-examiners (TA, CC, LR, GRA)

YOUR RESPONSIBILITIES:
1. CRITERIA ANALYSIS: For each criterion (TA, CC, LR, GRA), read the sub-examiner's feedback (summary, strengths, issues) and synthesize it into detailed sub-criteria evaluations (as strings). Ensure you fill in ALL sub-criteria fields thoughtfully based on the sub-examiner's notes.
2. INLINE ANNOTATIONS (REWRITES): Consolidate the specific sentence-level or word-level issues/strengths flagged by the sub-examiners. 
   - LIMIT: Output a MAXIMUM of 10 most critical annotations. Prioritize severe grammatical errors, major logical flaws, and vocabulary upgrades. Do not list every minor issue.
   - For every issue, you must provide the EXACT `original_text` from the essay (crucial: must match the essay exactly so our system can find its coordinates).
   - Provide the `corrected_text` (the upgraded version).
   - Provide a short `title` (e.g. "Vocabulary Repetition"), detailed `explanation`, and `recommendation`.
   - Set the `type` to one of: "error", "upgrade", "logic_issue", "strength".
   - Set the `category` to the origin of the issue: "TR", "CC", "LR", or "GRA".

CRITICAL RULES:
- NEVER overlap `original_text`.
- `original_text` MUST be an exact substring of the original essay.
- Do NOT output `id`, `position_start`, or `position_end`.

OUTPUT FORMAT (JSON SCHEMA):
You must output ONLY valid JSON matching the exact schema below.

{
  "criteria_analysis": {
    "task_response": {
      "sub_criteria": {
        "relevance_to_prompt": "string",
        "clarity_of_position": "string",
        "depth_of_ideas": "string",
        "appropriateness_of_format": "string",
        "relevant_specific_examples": "string",
        "appropriate_word_count": "string"
      }
    },
    "coherence_cohesion": {
      "sub_criteria": {
        "logical_progression": "string",
        "effective_intro_conclusion": "string",
        "paragraph_unity_and_topic_sentence": "string",
        "cohesive_devices_usage": "string",
        "paragraphing": "string"
      }
    },
    "lexical_resource": {
      "sub_criteria": {
        "vocabulary_range": "string",
        "lexical_accuracy": "string",
        "spelling_word_formation": "string"
      }
    },
    "grammatical_range_and_accuracy": {
      "sub_criteria": {
        "sentence_structure_variety": "string",
        "grammar_accuracy": "string",
        "punctuation_usage": "string"
      }
    }
  },
  "inline_annotations": [
    {
      "type": "error", 
      "category": "TR", 
      "original_text": "string matching exactly the essay text",
      "corrected_text": "string suggestion",
      "title": "short string",
      "explanation": "string",
      "recommendation": "string"
    }
  ]
}
"""

    user_prompt = """### TITLE
{{title}}

### ESSAY
{{essay}}

### TASK ACHIEVEMENT (TA) FEEDBACK
{{ta_feedback}}

### COHERENCE & COHESION (CC) FEEDBACK
{{cc_feedback}}

### LEXICAL RESOURCE (LR) FEEDBACK
{{lr_feedback}}

### GRAMMATICAL RANGE & ACCURACY (GRA) FEEDBACK
{{gra_feedback}}

Please generate the final synthesized JSON."""

    print("Uploading REWRITE/ System prompt to Langfuse...")
    
    client.create_prompt(
        name="REWRITE/ System prompt",
        type="chat",
        prompt=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        config={
            "model": "deepseek-v4-pro",
            "temperature": 0.2,
            "max_tokens": 5000
        },
        labels=["production"]
    )
    
    print("Successfully uploaded 'REWRITE/ System prompt' to Langfuse!")

if __name__ == "__main__":
    upload_rewrite_prompt()
