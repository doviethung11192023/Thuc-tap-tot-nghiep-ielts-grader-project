export interface ListeningTranscriptLine {
  id: string;
  timestamp: string; // e.g. "01:15"
  speaker: string;
  text: string;
  keywords?: { phrase: string; question_number: number; type: 'answer' | 'distractor' | 'synonym' }[];
}

export interface ListeningSectionData {
  section_number: 1 | 2 | 3 | 4;
  title: string;
  audio_url: string;
  duration_seconds: number;
  transcripts: ListeningTranscriptLine[];
  question_groups: any[];
}

export interface ListeningTestData {
  test_id: string;
  title: string;
  total_duration_minutes: number;
  sections: ListeningSectionData[];
}
