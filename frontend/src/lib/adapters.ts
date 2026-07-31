import { EssayResultsResponse, GradingResult } from "@/types";

export function mapApiResultToGradingResult(resData: EssayResultsResponse["data"]): GradingResult {
  if (!resData.result) {
    throw new Error("Evaluation result is missing from API response.");
  }

  return {
    essay_id: resData.essay.id,
    status: resData.essay.status,
    content: resData.essay.content,
    word_count: resData.essay.word_count,
    overall_upgraded_essay: resData.result.overall_upgraded_essay || "Không có bài nâng cấp.",
    scores: {
      overall_band: resData.result.overall_band,
      task_response: resData.result.task_response_score,
      coherence_cohesion: resData.result.coherence_cohesion_score,
      lexical_resource: resData.result.lexical_resource_score,
      grammatical_range_and_accuracy: resData.result.grammar_accuracy_score,
    },
    criteria_analysis: resData.result.criteria_analysis,
    inline_annotations: resData.inline_annotations || [],
  };
}
