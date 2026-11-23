export interface SpeakingIdeaStep {
  step: number;
  title: string;
  example: string;
}

export interface CollocationItem {
  id: number;
  phrase: string;
  type?: string;
  meaning?: string;
}

export interface SyllableEvaluation {
  syllable: string;
  ipa: string;
  rating: 'Tốt' | 'Cải thiện thêm';
}

export interface PronunciationWordItem {
  word: string;
  ipa: string;
  studentAudioUrl?: string;
  standardAudioUrl?: string;
  syllables: SyllableEvaluation[];
}

export interface WordStressItem {
  word: string;
  ipa: string;
  studentAudioUrl?: string;
  standardAudioUrl?: string;
  syllables: {
    syllable: string;
    correctStress: 'Nhấn' | 'Không nhấn';
    studentStress: 'Nhấn' | 'Không nhấn';
  }[];
}

export interface GrammarErrorItem {
  id: number;
  title: string;
  category: string;
  explanation: string;
}

export interface ComplexStructureItem {
  id: number;
  sentence: string;
  clauses: {
    keyword: string;
    type: string;
    explanation: string;
  }[];
}

export interface UpgradedAnswerData {
  title: string;
  description: string;
  transcript: string;
  collocations_count: number;
  collocations: CollocationItem[];
  linking_devices_count: number;
  linking_devices: string[];
  complex_structures_count: number;
  complex_structures: ComplexStructureItem[];
}

export interface ModelAnswerData {
  title: string;
  band_target: string;
  transcript: string;
  vocabulary_notes: {
    phrase: string;
    part_of_speech: string;
    definition: string;
  }[];
}

export interface DetailedQuestionResult {
  question_id: string;
  part_number: 1 | 2 | 3;
  question_title: string;
  question_prompt: string;
  rating_badge: 'Excellent' | 'Very Good' | 'Good' | 'Needs Improvement';
  audio_url: string;
  audio_duration: string;
  transcript_annotated: string;
  
  // Tab 1: Ưu điểm
  collocations: CollocationItem[];
  topic_specific_words: string[];
  linking_devices: string[];
  complex_structures: ComplexStructureItem[];
  good_pronunciation: PronunciationWordItem[];
  good_word_stress: WordStressItem[];

  // Tab 2: Cần cải thiện
  lexical_errors: string[];
  grammar_errors: GrammarErrorItem[];
  pronunciation_improvements: PronunciationWordItem[];
  word_stress_improvements: WordStressItem[];

  // Tab 3: Bài nâng cấp
  upgraded_answer: UpgradedAnswerData;

  // Tab 4: Bài mẫu
  model_answer: ModelAnswerData;
}

export interface SpeakingPartQuestionItem {
  id: string;
  question_number: number;
  question: string;
  audio_prompt_url?: string;
  prep_time_sec?: number;
  answer_time_sec?: number;
  ideas: SpeakingIdeaStep[];
  detailed_result?: DetailedQuestionResult;
}

export interface SpeakingPartData {
  part_number: 1 | 2 | 3;
  title: string;
  instructions: string;
  guidelines: string[];
  questions?: SpeakingPartQuestionItem[];
  cue_card?: {
    topic: string;
    bullet_points: string[];
    ideas: SpeakingIdeaStep[];
    preparation_time_seconds: number;
    speaking_time_seconds: number;
    detailed_result?: DetailedQuestionResult;
  };
}

export interface CriteriaSubMetric {
  name: string;
  rating: 'Excellent' | 'Very Good' | 'Good' | 'Needs Improvement';
  percent: number;
  feedback: string;
}

export interface SpeakingSummaryDataset {
  student_name: string;
  completion_date: string;
  test_title: string;
  overall_band: number;
  criteria_scores: {
    fc: number;
    lr: number;
    gra: number;
    pr: number;
  };
  performance_by_part: {
    part1: 'Excellent' | 'Very Good' | 'Good';
    part2: 'Excellent' | 'Very Good' | 'Good';
    part3: 'Excellent' | 'Very Good' | 'Good';
  };
  overall_feedback: {
    main_strength: string;
    strength_criterion: string;
    main_weakness_1: string;
    main_weakness_2: string;
    weakness_criterion_1: string;
    weakness_criterion_2: string;
    action_plans: string[];
  };
  criteria_breakdown: {
    fc: {
      score: number;
      band_descriptors: string[];
      sub_metrics: CriteriaSubMetric[];
    };
    lr: {
      score: number;
      band_descriptors: string[];
      sub_metrics: CriteriaSubMetric[];
    };
    gra: {
      score: number;
      band_descriptors: string[];
      sub_metrics: CriteriaSubMetric[];
      frequent_errors: { count: number; name: string }[];
    };
    pr: {
      score: number;
      band_descriptors: string[];
      sub_metrics: CriteriaSubMetric[];
    };
  };
}

export interface MockSpeakingExamDataset {
  test_id: string;
  title: string;
  parts: SpeakingPartData[];
  summary: SpeakingSummaryDataset;
  // Backward compatibility property for existing components
  grading_result: any;
}
