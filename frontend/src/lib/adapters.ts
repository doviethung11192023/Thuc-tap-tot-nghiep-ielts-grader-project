import { EssayResultsResponse, GradingResult } from "@/types";

export function mapApiResultToGradingResult(resData: EssayResultsResponse["data"]): GradingResult {
  if (!resData.result) {
    throw new Error("Evaluation result is missing from API response.");
  }

  const taskNo: 1 | 2 = resData.essay.task_no === 1 || resData.essay.task_type === "task1" ? 1 : 2;

  return {
    essay_id: resData.essay.id,
    attempt_id: resData.essay.attempt_id ?? null,
    test_id: resData.essay.test_id ?? null,
    test_title: resData.essay.test_title ?? null,
    task_no: taskNo,
    task_type: resData.essay.task_type || (taskNo === 1 ? "task1" : "task2"),
    task_prompt: resData.essay.task_prompt || "",
    chart_image_url: resData.essay.chart_image_url ?? null,
    prompt_category: resData.essay.prompt_category ?? null,
    min_words: resData.essay.min_words ?? (taskNo === 1 ? 150 : 250),
    status: resData.essay.status,
    content: resData.essay.content,
    word_count: resData.essay.word_count,
    overall_upgraded_essay: resData.result.overall_upgraded_essay || "Không có bài nâng cấp.",
    is_score_overridden: Boolean(resData.result.is_score_overridden),
    evaluator_type: resData.result.evaluator_type || (resData.result.is_score_overridden ? "expert" : "ai"),
    expert_feedback: resData.result.expert_feedback ?? null,
    ai_evaluation: resData.result.ai_evaluation ?? null,
    expert_review: resData.result.expert_review ?? null,
    sibling_essays: resData.sibling_essays || [],
    scores: {
      overall_band: resData.result.overall_band,
      task_response: resData.result.task_response_score,
      coherence_cohesion: resData.result.coherence_cohesion_score,
      lexical_resource: resData.result.lexical_resource_score,
      grammatical_range_and_accuracy: resData.result.grammar_accuracy_score,
    },
    criteria_analysis: resData.result.criteria_analysis,
    inline_annotations: resData.inline_annotations || [],
    sample_essay: resData.result.sample_essay || null,
    key_point_check: resData.result.key_point_check || null,
  };
}
