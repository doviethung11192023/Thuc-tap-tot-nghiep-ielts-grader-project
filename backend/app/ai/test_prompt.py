import os
import datetime
from dataclasses import dataclass
import pandas as pd
import numpy as np
from tqdm import tqdm
from concurrent.futures import ThreadPoolExecutor, as_completed
from openai import OpenAI
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

# ── Config ─────────────────────────────────────────────────────────────────────
SAMPLE_SIZE = 10
USE_BAND_DESCRIPTORS = True
USE_GEMINI_EXPLICIT_CACHE = False  # Gemini Context Caching API — requires paid tier (free tier limit=0)
CACHE_TTL_MINUTES = 30            # How long to keep the cache alive on Gemini servers
PROVIDER = {"gemini", "qwen","deepseek"}

MODEL_CONFIGS = {
    "gemini": {
        "balanced": "gemini-3.5-flash",
        # "reasoning": "gemini-2.5-pro"
    },
    "qwen": {
        "balanced": "qwen3.5-flash",
        # "reasoning": "qwq-32b"
    },
    "deepseek": {
        "balanced": "morph-dsv4flash",
        # "reasoning": "deepseek-v4-pro"
    },
}

# ── Internal State ─────────────────────────────────────────────────────────────
_clients = {}
_gemini_cache = None  # Holds the active CachedContent object


# ── Response Normalization ─────────────────────────────────────────────────────
@dataclass
class ChatResponse:
    """Unified response object across all providers."""
    content: str
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    cached_tokens: int = 0  # Tokens served from cache (Gemini explicit / Qwen auto)


# ── Gemini Cache Lifecycle ─────────────────────────────────────────────────────
def setup_gemini_cache(system_prompt: str) -> None:
    """Create an explicit CachedContent on Gemini servers for the system prompt.

    The cache is stored globally and reused for all subsequent Gemini calls in
    the session, avoiding re-processing of the (large) system prompt on every
    request.  Requires the system prompt to be ≥1024 tokens.
    """
    global _gemini_cache
    model_name = MODEL_CONFIGS["gemini"]["balanced"]
    genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
    _gemini_cache = genai.caching.CachedContent.create(
        model=f"models/{model_name}",
        display_name="ielts_system_prompt",
        system_instruction=system_prompt,
        ttl=datetime.timedelta(minutes=CACHE_TTL_MINUTES),
    )
    print(
        f"[Gemini Cache] Created: {_gemini_cache.name} | "
        f"TTL: {CACHE_TTL_MINUTES} min | "
        f"Expires: {_gemini_cache.expire_time}"
    )


def teardown_gemini_cache() -> None:
    """Delete the Gemini CachedContent to avoid ongoing storage charges."""
    global _gemini_cache
    if _gemini_cache:
        try:
            _gemini_cache.delete()
            print(f"[Gemini Cache] Deleted: {_gemini_cache.name}")
        except Exception as e:
            print(f"[Gemini Cache] Could not delete cache: {e}")
        _gemini_cache = None


# ── API Callers ────────────────────────────────────────────────────────────────
def _call_gemini_cached(user: str) -> ChatResponse:
    """Call Gemini using the pre-created CachedContent (native SDK).

    The system prompt is not re-sent; only the user message is transmitted,
    dramatically reducing billable prompt tokens for each request.
    """
    model = genai.GenerativeModel.from_cached_content(cached_content=_gemini_cache)
    raw = model.generate_content(
        contents=user,
        generation_config=genai.GenerationConfig(temperature=0.1),
    )
    usage = raw.usage_metadata
    return ChatResponse(
        content=raw.text,
        prompt_tokens=usage.prompt_token_count,
        completion_tokens=usage.candidates_token_count,
        total_tokens=usage.total_token_count,
        cached_tokens=getattr(usage, "cached_content_token_count", 0) or 0,
    )


def _call_openai_compat(provider: str, model_key: str, system: str, user: str) -> ChatResponse:
    """Call any OpenAI-compatible endpoint and return a normalized ChatResponse.

    For Qwen and DeepSeek, the server automatically caches repeated prefixes;
    cached_tokens is populated when the provider returns prompt_tokens_details.
    """
    global _clients
    if provider not in _clients:
        if provider == "gemini":
            _clients[provider] = OpenAI(
                base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
                api_key=os.getenv("GEMINI_API_KEY"),
            )
        elif provider == "qwen":
            _clients[provider] = OpenAI(
                base_url="https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
                api_key=os.getenv("QWEN_API_KEY"),
            )
        elif provider == "deepseek":
            _clients[provider] = OpenAI(
                base_url="https://api.morphllm.com/v1/",
                api_key=os.getenv("DEEPSEEK_API_KEY"),
            )
        else:
            raise ValueError(f"Unknown provider: {provider}")

    model_name = MODEL_CONFIGS[provider][model_key]
    raw = _clients[provider].chat.completions.create(
        model=model_name,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        temperature=0.1,
    )

    # Extract cached tokens if the provider returns them (e.g. Qwen auto-cache)
    cached = 0
    if raw.usage and hasattr(raw.usage, "prompt_tokens_details") and raw.usage.prompt_tokens_details:
        cached = getattr(raw.usage.prompt_tokens_details, "cached_tokens", 0) or 0

    return ChatResponse(
        content=raw.choices[0].message.content or "",
        prompt_tokens=raw.usage.prompt_tokens if raw.usage else 0,
        completion_tokens=raw.usage.completion_tokens if raw.usage else 0,
        total_tokens=raw.usage.total_tokens if raw.usage else 0,
        cached_tokens=cached,
    )


def call_chat(provider: str, model_key: str, system: str, user: str) -> ChatResponse:
    """Route the call to the appropriate backend and return a ChatResponse."""
    if provider == "gemini" and USE_GEMINI_EXPLICIT_CACHE and _gemini_cache is not None:
        return _call_gemini_cached(user)
    return _call_openai_compat(provider, model_key, system, user)


# ── Evaluation Logic ───────────────────────────────────────────────────────────
def eval(provider: str, model_key: str, prompt_template: str, prompt: str, essay: str):
    """Core evaluation logic. Returns (band, evaluation_text, response)."""
    system_content = prompt_template
    user_content = f"**Writing Prompt:**\n{prompt}\n\n**Essay:**\n{essay}"

    response = call_chat(provider, model_key, system_content, user_content)
    if not response or not response.content:
        return None, None, response

    evaluation = response.content

    # Find the overall score (e.g. a line like "Overall: 7.5")
    band = None
    for line in evaluation.splitlines():
        if "overall:" in line.lower():
            score_str = line.split(":")[-1].replace("*", "").strip()
            try:
                band = float(score_str)
                break
            except ValueError:
                pass

    return band, evaluation, response


def benchmark(provider: str, model_key: str, prompt_template: str, prompt: str, essay: str):
    """Wrapper around eval() that captures full token usage including cached tokens.

    Returns:
        band (float | None): predicted band score
        evaluation (str | None): full evaluation text
        usage (dict): prompt_tokens, completion_tokens, total_tokens, cached_tokens
    """
    empty_usage = {
        "prompt_tokens": None,
        "completion_tokens": None,
        "total_tokens": None,
        "cached_tokens": 0,
    }

    try:
        band, evaluation, response = eval(provider, model_key, prompt_template, prompt, essay)

        if not response:
            return None, None, empty_usage

        usage = {
            "prompt_tokens": response.prompt_tokens,
            "completion_tokens": response.completion_tokens,
            "total_tokens": response.total_tokens,
            "cached_tokens": response.cached_tokens,
        }

        cache_tag = f" | cached={usage['cached_tokens']}" if usage["cached_tokens"] else ""
        print(
            f"  [{provider}/{model_key}] "
            f"prompt={usage['prompt_tokens']} "
            f"completion={usage['completion_tokens']} "
            f"total={usage['total_tokens']}"
            f"{cache_tag}"
        )

        return band, evaluation, usage

    except Exception as e:
        print(f"Error evaluating with {provider} {model_key}: {e}")
        return None, None, empty_usage


# ── Main ───────────────────────────────────────────────────────────────────────
def main():
    df = pd.read_csv("Writting Task 2 Dataset/test.csv")
    df["band"] = pd.to_numeric(df["band"].astype(str).str.strip(), errors="coerce")
    df = df.dropna(subset=["band"]).reset_index(drop=True)

    with open("prompt.md", "r", encoding="utf-8") as f:
        prompt_template = f.read()

    if USE_BAND_DESCRIPTORS:
        with open("ielts_writing_band_description.md", "r", encoding="utf-8") as f:
            band_descriptors = f.read()
        prompt_template += "\n\n---\n\n" + band_descriptors

    # Create Gemini cache once — reused for every essay in the loop
    if "gemini" in PROVIDER and USE_GEMINI_EXPLICIT_CACHE:
        setup_gemini_cache(prompt_template)

    if SAMPLE_SIZE is not None:
        df = df.sample(min(SAMPLE_SIZE, len(df)), random_state=42).reset_index(drop=True)

    results = []
    active_providers = list(PROVIDER)
    lanes = ["balanced"]
    total_steps = len(df) * len(active_providers) * len(lanes)

    try:
        with tqdm(total=total_steps, desc="Evaluating", unit="req") as pbar:
            for idx, row in df.iterrows():
                for provider in active_providers:
                    for lane in lanes:
                        pbar.set_postfix(essay=idx, provider=provider, lane=lane)
                        band, evaluation, usage = benchmark(
                            provider, lane, prompt_template, row["prompt"], row["essay"]
                        )
                        results.append({
                            "index": idx,
                            "model": provider,
                            "lane": lane,
                            "actual": row["band"],
                            "act_eval": row["evaluation"],
                            "predicted": band,
                            "pred_eval": evaluation,
                            "prompt_tokens": usage["prompt_tokens"],
                            "completion_tokens": usage["completion_tokens"],
                            "total_tokens": usage["total_tokens"],
                            "cached_tokens": usage["cached_tokens"],
                        })
                        pbar.update(1)
    finally:
        # Always clean up to avoid ongoing Gemini cache storage charges
        teardown_gemini_cache()

    res_df = pd.DataFrame(results)
    res_df.to_csv("evaluation_results.csv", index=False)

    valid_res = res_df.dropna(subset=["predicted"])

    summary = []
    for (m_name, l_name), group in valid_res.groupby(["model", "lane"]):
        actual = group["actual"].values
        predicted = group["predicted"].values

        mae = np.mean(np.abs(predicted - actual))
        rmse = np.sqrt(np.mean((predicted - actual) ** 2))
        exact = np.mean(predicted == actual) * 100
        within_half = np.mean(np.abs(predicted - actual) <= 0.5) * 100

        avg_prompt_tok = group["prompt_tokens"].mean()
        avg_completion_tok = group["completion_tokens"].mean()
        avg_total_tok = group["total_tokens"].mean()
        avg_cached_tok = group["cached_tokens"].mean()

        summary.append({
            "Model": m_name,
            "Lane": l_name,
            "Count": len(group),
            "MAE": round(mae, 3),
            "RMSE": round(rmse, 3),
            "Exact Match %": round(exact, 2),
            "Within 0.5 %": round(within_half, 2),
            "Avg Prompt Tokens": round(avg_prompt_tok, 1) if pd.notna(avg_prompt_tok) else None,
            "Avg Completion Tokens": round(avg_completion_tok, 1) if pd.notna(avg_completion_tok) else None,
            "Avg Total Tokens": round(avg_total_tok, 1) if pd.notna(avg_total_tok) else None,
            "Avg Cached Tokens": round(avg_cached_tok, 1) if pd.notna(avg_cached_tok) else None,
        })

    summary_df = pd.DataFrame(summary)
    print("\nEvaluation Summary:")
    print(summary_df.to_string(index=False))
    summary_df.to_csv("summary_results.csv", index=False)


if __name__ == "__main__":
    main()
