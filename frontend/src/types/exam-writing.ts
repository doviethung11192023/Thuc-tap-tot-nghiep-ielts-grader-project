export interface WritingHighlight {
  id: string;
  category: 'error' | 'coherence' | 'lexical' | 'strength';
  original_text: string;
  title: string;
  reason: string;
  suggested_fix: string;
}

export interface WritingCriteriaDetail {
  score: number;
  description: string;
  strengths: string[];
  improvements: string[];
}

export interface WritingGraderResult {
  overall_band: number;
  criteria_scores: {
    task_response: WritingCriteriaDetail;
    coherence_cohesion: WritingCriteriaDetail;
    lexical_resource: WritingCriteriaDetail;
    grammatical_accuracy: WritingCriteriaDetail;
  };
  highlights: WritingHighlight[];
  top_priorities: string[];
  lexical_upgrades: { original: string; upgraded: string; context: string }[];
  model_essay_band_8: {
    title: string;
    word_count: number;
    paragraphs: string[];
  };
}
