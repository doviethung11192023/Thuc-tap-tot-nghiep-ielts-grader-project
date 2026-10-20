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
  table_data?: any; // used for TableCompletion
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
