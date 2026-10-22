export type SkillType = "listening" | "reading" | "writing" | "speaking";
export type AllowedMode = "practice" | "mock" | "both";
export type ContentStatus = "draft" | "pending_review" | "published" | "archived";

export interface TestSet {
  id: string;
  name: string;
  created_by?: string | null;
  created_at: string;
}

export interface AnswerKey {
  question_id: string;
  accepted_answers: string[];
  explanation?: string | null;
  evidence?: string | null;
}

export interface Question {
  id: string;
  group_id: string;
  number: number;
  prompt: string | null;
  options?: any[] | null;
  max_words?: number | null;
  prompt_audio_key?: string | null;
  prep_time_sec?: number | null;
  answer_time_sec?: number | null;
  question_answer_keys?: AnswerKey[];
}

export interface QuestionGroup {
  id: string;
  section_id: string;
  order_no: number;
  question_type: string;
  question_subtype?: string | null;
  instructions?: string | null;
  image_key?: string | null;
  content?: any;
  questions?: Question[];
}

export interface TestSection {
  id: string;
  test_id: string;
  order_no: number;
  title: string | null;
  passage_text?: string | null;
  audio_key?: string | null;
  transcript?: string | null;
  question_groups?: QuestionGroup[];
}

export interface TestItem {
  id: string;
  test_set_id?: string | null;
  title: string;
  skill: SkillType;
  allowed_mode: AllowedMode;
  status: ContentStatus;
  version: number;
  duration_min?: number | null;
  origin: string;
  source_name?: string | null;
  created_at: string;
  test_sets?: { id: string; name: string } | null;
  sections?: TestSection[];
}

export interface BandConversion {
  id: string;
  skill: "listening" | "reading";
  raw_min: number;
  raw_max: number;
  band: number;
}

export interface SystemSetting {
  key: string;
  value: Record<string, any>;
  description?: string | null;
  updated_at: string;
  updated_by?: string | null;
}

export interface IngestResponse {
  success: boolean;
  message: string;
  test_sets_created: number;
  tests_created: number;
  tests_skipped_existing?: number;
  sections_created: number;
  question_groups_created: number;
  questions_created: number;
  topics_created: number;
  errors: string[];
}

export interface SkillScanSummary {
  total: number;
  imported: number;
  pending: number;
}

export interface ScannedTestItem {
  id: string;
  title: string;
  skill: SkillType;
  category: string;
  folder: string;
  path: string;
  is_imported: boolean;
  duration_min?: number;
}

export interface DatasetScanResult {
  total_found: number;
  total_imported: number;
  total_pending: number;
  by_skill: Record<string, SkillScanSummary>;
  pending_samples: Array<{
    title: string;
    skill: string;
    folder: string;
    path: string;
  }>;
  tests: ScannedTestItem[];
}

// ============================================================
// TYPES CHO READING & WRITING EXAM WORKSPACE
// ============================================================

export type QuestionMode = 'exam' | 'review';

export interface DiagramCoordinate {
  x: number; // 0-100 percentage
  y: number; // 0-100 percentage
}

export interface BaseQuestion {
  question_number: number;
  correct_answers?: string[];
  explanation?: string;
  evidence_paragraph?: string;
  evidence_quote?: string;
  prompt?: string;
  diagram_coordinate?: DiagramCoordinate;
  options_pool?: OptionItem[] | null;
}

export interface OptionItem {
  key: string;
  text: string;
}

export interface QuestionGroupData {
  group_id: string;
  question_type: string;
  instruction: string;
  options_pool?: OptionItem[] | null;
  template?: string; // used for InlineFillBlank
  diagram_image_url?: string; // used for DiagramLabelling
  questions: BaseQuestion[];
}

export interface PassageData {
  id: string;
  title: string;
  content: string; // HTML or structured paragraphs
  paragraphs?: { id: string; text: string }[];
}

export interface ReadingTestData {
  test_id: string;
  title: string;
  passages: {
    passage: PassageData;
    question_groups: QuestionGroupData[];
  }[];
}

// For Writing
export interface WritingTaskData {
  id: string;
  task_number: 1 | 2;
  prompt: string;
  images?: string[];
  min_words: number;
  suggested_time: number; // in minutes
}

export interface WritingTestData {
  test_id: string;
  title: string;
  tasks: WritingTaskData[];
}