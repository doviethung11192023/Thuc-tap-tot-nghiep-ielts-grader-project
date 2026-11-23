
export interface CleanReadingKeywordMapping {
  original_text: string;
  paraphrased_text: string;
  mapping_type?: string;
}

export interface CleanReadingQuestion {
  id: number;
  question_number: number;
  passage_number: number;
  question_type: string | number;
  prompt: string;
  options: { key: string; text: string }[];
  user_answer: string;
  correct_answer: string;
  is_correct: boolean;
  explanation_4_steps: string;
  evidence_text: string;
  evidence_source_id?: string;
  keywords_mapping: CleanReadingKeywordMapping[];
}

export interface CleanReadingPassage {
  id: string;
  passage_number: number;
  title: string;
  content: string;
  paragraphs: { id: string; text: string }[];
}

export interface CleanReadingExerciseGroup {
  id: number;
  passage_number: number;
  type: string | number;
  title: string;
  content: string;
  table_data?: any;
  question_start: number;
  question_end: number;
}

export interface CleanTaskFormatResult {
  code?: string;
  name?: string;
  correct_answers?: number;
  total_questions?: number;
  correct_rate?: number;
  correct?: number;
  total?: number;
  percentage?: number;
  [key: string]: any;
}

export interface CleanReadingTestData {
  test_id: string;
  slug: string;
  title: string;
  overall_band: number;
  correct_count: number;
  total_questions: number;
  time_spent: string;
  submitted_at: string;
  task_formats_result: CleanTaskFormatResult[];
  exercise_groups: CleanReadingExerciseGroup[];
  passages: CleanReadingPassage[];
  questions: CleanReadingQuestion[];
}
