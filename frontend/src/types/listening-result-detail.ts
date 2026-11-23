
export interface CleanListeningKeywordMapping {
  original_text: string;
  paraphrased_text: string;
  mapping_type?: string;
}

export interface CleanListeningQuestion {
  id: number;
  question_number: number;
  section_number: number;
  question_type: string | number;
  prompt: string;
  options: { key: string; text: string }[];
  user_answer: string;
  correct_answer: string;
  is_correct: boolean;
  explanation_4_steps: string;
  evidence_text: string;
  evidence_source_id?: string;
  keywords_mapping: CleanListeningKeywordMapping[];
}

export interface CleanListeningUtterance {
  id: number;
  speaker_id: number;
  speaker_name: string;
  role: string;
  text: string;
  start_timestamp: number;
  end_timestamp: number;
  start_seconds: number;
  time_formatted: string;
}

export interface CleanListeningSection {
  section_number: number;
  title: string;
  audio_url: string;
  playtime_string: string;
  duration_seconds: number;
  transcript_utterances: CleanListeningUtterance[];
}

export interface CleanListeningExerciseGroup {
  id: number | string;
  section_number: number;
  type: string | number;
  title: string;
  content: string;
  template?: string;
  options_pool?: Array<{ key: string; text: string }>;
  diagram_image_url?: string;
  table_data?: any;
  question_start: number;
  question_end: number;
}

export interface CleanListeningTaskFormatResult {
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

export interface CleanListeningTestData {
  test_id: string;
  slug: string;
  title: string;
  overall_band: number | null; // null khi chưa đủ 40 câu (BR-03)
  correct_count: number;
  total_questions: number;
  time_spent: string;
  submitted_at: string;
  task_formats_result: CleanListeningTaskFormatResult[];
  exercise_groups: CleanListeningExerciseGroup[];
  sections: CleanListeningSection[];
  questions: CleanListeningQuestion[];
}
