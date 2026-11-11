/** Per-response feedback from the Speaking detail API (spec 007). Offsets are character positions in the transcript. */

export interface SpeakingEdit {
  kind: 'replace' | 'unnecessary' | 'missing';
  criterion: 'GRA' | 'LR';
  category: string;
  original: string;
  corrected: string;
  explanation: string;
  start: number;
  end: number;
}

export interface SpeakingStrength {
  group: 'collocation' | 'linking' | 'topic_word' | 'complex_structure';
  text: string;
  start: number;
  end: number;
}

export interface SpeakingPronunciationHint {
  word: string;
  start: number;
  end: number;
  start_sec: number;
  end_sec: number;
  accuracy: number;
}

export const EDIT_KIND_LABELS: Record<SpeakingEdit['kind'], string> = {
  replace: 'Thay thế',
  unnecessary: 'Thừa từ',
  missing: 'Thiếu từ',
};

export const EDIT_CATEGORY_LABELS: Record<string, string> = {
  verb_tense: 'Thì động từ',
  verb_form: 'Dạng động từ',
  subject_verb_agreement: 'Hoà hợp chủ ngữ – động từ',
  noun_number: 'Danh từ số ít / số nhiều',
  article: 'Mạo từ',
  preposition: 'Giới từ',
  conjunction: 'Liên từ',
  pronoun: 'Đại từ',
  word_order: 'Trật tự từ',
  word_choice: 'Chọn từ',
  word_form: 'Dạng từ',
  collocation: 'Kết hợp từ',
  other: 'Khác',
};

export const STRENGTH_GROUP_LABELS: Record<SpeakingStrength['group'], string> = {
  collocation: 'Cụm từ hay',
  linking: 'Từ nối',
  topic_word: 'Từ vựng theo chủ đề',
  complex_structure: 'Cấu trúc phức',
};
