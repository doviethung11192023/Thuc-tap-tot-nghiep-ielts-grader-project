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

export const mockSpeakingExamDataset: MockSpeakingExamDataset = {
  test_id: 'speaking-test-1',
  title: "Full test 1: Saying 'thank you' + Describe a time when you encouraged someone to do something that he/she didn't want to do.",
  parts: [
    {
      part_number: 1,
      title: 'Part 1: Introduction & Interview (4-5 minutes)',
      instructions: 'Trong phần thi IELTS Speaking Part 1, bạn sẽ được hỏi những câu hỏi ngắn liên quan tới những chủ đề quen thuộc trong cuộc sống của bạn, ví dụ: gia đình, học tập, làm việc, sở thích, dự định. Phần thi mang tính khởi động trước khi bạn tới Part 2 và Part 3.',
      guidelines: [
        'Trả lời trực tiếp câu hỏi',
        'Không trả lời quá dài, quá 3-5 câu',
        'Gây ấn tượng với giám khảo bằng cách phát âm tốt, ngữ điệu tốt và tự nhiên'
      ],
      questions: [
        {
          id: 'p1_q1',
          question_number: 1,
          question: "Do people in your country often say 'thank you'?",
          ideas: [
            { step: 1, title: 'Give a general answer about frequency.', example: 'For example, you could say people commonly express gratitude in daily life.' },
            { step: 2, title: 'Mention common everyday situations.', example: 'For example, you could say it happens in shops or when people get help.' },
            { step: 3, title: 'Add a small condition or variation.', example: 'For example, you could say it depends on age or social setting.' },
            { step: 4, title: 'Give a brief personal observation.', example: 'For example, you could say how you personally feel about this habit.' }
          ],
          detailed_result: {
            question_id: 'p1_q1',
            part_number: 1,
            question_title: 'Question 1',
            question_prompt: "Do people in your country often say 'thank you'?",
            rating_badge: 'Excellent',
            audio_url: 'https://cdn.freesound.org/previews/316/316844_4939433-lq.mp3',
            audio_duration: '00:00/00:28',
            transcript_annotated: "Expressing¹ gratitude¹ is considered a basic piece² of² everyday etiquette in Vietnam. People regularly say thank you when receiving³ customer⁴ service³·⁴ at⁵ a⁵ store,⁵ getting⁶ help⁶ from a colleague, or accepting a favor. However, among very⁷ close⁷·⁸ family⁸·⁹ members⁹ or intimate¹⁰ friends,¹⁰ people sometimes show¹¹ appreciation¹¹ through actions or small¹² gestures¹² rather than saying¹³ the actual words.¹³ As formal facts, can occasionally feel a bit distant.",
            collocations: [
              { id: 1, phrase: 'Expressing - gratitude', type: 'Collocation', meaning: 'Bày tỏ lòng biết ơn' },
              { id: 2, phrase: 'piece - of', type: 'Collocation', meaning: 'Một phần / quy tắc' },
              { id: 3, phrase: 'receiving - service', type: 'Collocation', meaning: 'Nhận dịch vụ' },
              { id: 4, phrase: 'customer - service', type: 'Collocation', meaning: 'Dịch vụ khách hàng' },
              { id: 5, phrase: 'at - a - store', type: 'Collocation', meaning: 'Tại cửa hàng' },
              { id: 6, phrase: 'getting - help', type: 'Collocation', meaning: 'Nhận sự giúp đỡ' },
              { id: 7, phrase: 'very - close', type: 'Collocation', meaning: 'Rất thân thiết' },
              { id: 8, phrase: 'close - family', type: 'Collocation', meaning: 'Gia đình gắn bó' },
              { id: 9, phrase: 'family - members', type: 'Collocation', meaning: 'Thành viên gia đình' },
              { id: 10, phrase: 'intimate - friends', type: 'Collocation', meaning: 'Bạn bè tri kỷ' },
              { id: 11, phrase: 'show - appreciation', type: 'Collocation', meaning: 'Thể hiện sự cảm kích' },
              { id: 12, phrase: 'small - gestures', type: 'Collocation', meaning: 'Cử chỉ nhỏ' },
              { id: 13, phrase: 'saying - words', type: 'Collocation', meaning: 'Nói thành lời' }
            ],
            topic_specific_words: [],
            linking_devices: ['However', 'rather than'],
            complex_structures: [
              {
                id: 1,
                sentence: 'People regularly say thank you when receiving customer service at a store, getting help from a colleague, or accepting a favor.',
                clauses: [
                  {
                    keyword: 'when',
                    type: 'Relative Clause / Mệnh đề quan hệ',
                    explanation: 'Refers to time / Bổ nghĩa cho thời gian'
                  },
                  {
                    keyword: 'when',
                    type: 'Adverbial Clause / Mệnh đề trạng từ',
                    explanation: 'An adverb clause of time shows when something happens. It is usually introduced by time adverbs. / Mệnh đề trạng từ chỉ thời gian đưa ra thông tin về thời gian mà một hoạt động diễn ra.'
                  }
                ]
              }
            ],
            good_pronunciation: [
              {
                word: 'Expressing',
                ipa: '/ɪkˈspres·ɪŋ/',
                syllables: [
                  { syllable: 'e', ipa: '/ɪ/', rating: 'Tốt' },
                  { syllable: 'e', ipa: '/k/', rating: 'Tốt' },
                  { syllable: 'xpress', ipa: '/s/', rating: 'Tốt' },
                  { syllable: 'xpress', ipa: '/p/', rating: 'Tốt' },
                  { syllable: 'xpress', ipa: '/r/', rating: 'Tốt' },
                  { syllable: 'xpress', ipa: '/e/', rating: 'Tốt' },
                  { syllable: 'xpress', ipa: '/s/', rating: 'Tốt' },
                  { syllable: 'ing', ipa: '/ɪ/', rating: 'Tốt' },
                  { syllable: 'ing', ipa: '/ŋ/', rating: 'Tốt' }
                ]
              },
              {
                word: 'is',
                ipa: '/ɪz/',
                syllables: [
                  { syllable: 'is', ipa: '/ɪ/', rating: 'Tốt' },
                  { syllable: 'is', ipa: '/z/', rating: 'Tốt' }
                ]
              },
              {
                word: 'a',
                ipa: '/ə/',
                syllables: [
                  { syllable: 'a', ipa: '/ə/', rating: 'Tốt' }
                ]
              },
              {
                word: 'basic',
                ipa: '/ˈbeɪ·sɪk/',
                syllables: [
                  { syllable: 'ba', ipa: '/b/', rating: 'Tốt' },
                  { syllable: 'ba', ipa: '/eɪ/', rating: 'Tốt' },
                  { syllable: 'sic', ipa: '/s/', rating: 'Tốt' },
                  { syllable: 'sic', ipa: '/ɪ/', rating: 'Tốt' },
                  { syllable: 'sic', ipa: '/k/', rating: 'Cải thiện thêm' }
                ]
              },
              {
                word: 'everyday',
                ipa: '/ˈev·ri·deɪ/',
                syllables: [
                  { syllable: 'eve', ipa: '/e/', rating: 'Tốt' },
                  { syllable: 'eve', ipa: '/v/', rating: 'Tốt' },
                  { syllable: 'ry', ipa: '/r/', rating: 'Tốt' },
                  { syllable: 'ry', ipa: '/i/', rating: 'Tốt' },
                  { syllable: 'day', ipa: '/d/', rating: 'Tốt' },
                  { syllable: 'day', ipa: '/eɪ/', rating: 'Tốt' }
                ]
              },
              {
                word: 'People',
                ipa: '/ˈpiː·pəl/',
                syllables: [
                  { syllable: 'peo', ipa: '/p/', rating: 'Cải thiện thêm' },
                  { syllable: 'peo', ipa: '/i/', rating: 'Tốt' },
                  { syllable: 'ple', ipa: '/p/', rating: 'Tốt' },
                  { syllable: 'ple', ipa: '/ə/', rating: 'Tốt' }
                ]
              },
              {
                word: 'regularly',
                ipa: '/ˈreg·jə·lər·li/',
                syllables: [
                  { syllable: 'reg', ipa: '/r/', rating: 'Tốt' },
                  { syllable: 'reg', ipa: '/e/', rating: 'Tốt' },
                  { syllable: 'u', ipa: '/j/', rating: 'Tốt' },
                  { syllable: 'lar', ipa: '/l/', rating: 'Tốt' },
                  { syllable: 'ly', ipa: '/li/', rating: 'Tốt' }
                ]
              }
            ],
            good_word_stress: [
              {
                word: 'Expressing',
                ipa: '/ɪkˈspres·ɪŋ/',
                syllables: [
                  { syllable: 'e', correctStress: 'Không nhấn', studentStress: 'Không nhấn' },
                  { syllable: 'xpress', correctStress: 'Nhấn', studentStress: 'Nhấn' },
                  { syllable: 'ing', correctStress: 'Không nhấn', studentStress: 'Không nhấn' }
                ]
              },
              {
                word: 'gratitude',
                ipa: '/ˈgræt·ɪ·tʃuːd/',
                syllables: [
                  { syllable: 'grat', correctStress: 'Nhấn', studentStress: 'Nhấn' },
                  { syllable: 'i', correctStress: 'Không nhấn', studentStress: 'Không nhấn' },
                  { syllable: 'tude', correctStress: 'Không nhấn', studentStress: 'Không nhấn' }
                ]
              },
              {
                word: 'considered',
                ipa: '/kənˈsɪd·əd/',
                syllables: [
                  { syllable: 'con', correctStress: 'Không nhấn', studentStress: 'Không nhấn' },
                  { syllable: 'sid', correctStress: 'Nhấn', studentStress: 'Nhấn' },
                  { syllable: 'ered', correctStress: 'Không nhấn', studentStress: 'Không nhấn' }
                ]
              }
            ],
            lexical_errors: [],
            grammar_errors: [
              {
                id: 1,
                title: 'Thừa từ: the',
                category: 'Mạo từ',
                explanation: "'the' là không cần thiết / không chính xác trong bối cảnh 'rather than saying the actual words'."
              }
            ],
            pronunciation_improvements: [
              {
                word: 'gratitude',
                ipa: '/ˈgræt·ɪ·tʃuːd/',
                syllables: [
                  { syllable: 'grat', ipa: '/g/', rating: 'Tốt' },
                  { syllable: 'grat', ipa: '/r/', rating: 'Tốt' },
                  { syllable: 'grat', ipa: '/æ/', rating: 'Tốt' },
                  { syllable: 'grat', ipa: '/t/', rating: 'Tốt' },
                  { syllable: 'i', ipa: '/ɪ/', rating: 'Cải thiện thêm' },
                  { syllable: 'tude', ipa: '/tʃ/', rating: 'Cải thiện thêm' },
                  { syllable: 'tude', ipa: '/u/', rating: 'Cải thiện thêm' },
                  { syllable: 'tude', ipa: '/d/', rating: 'Cải thiện thêm' }
                ]
              },
              {
                word: 'considered',
                ipa: '/kənˈsɪd·əd/',
                syllables: [
                  { syllable: 'con', ipa: '/k/', rating: 'Cải thiện thêm' },
                  { syllable: 'con', ipa: '/ə/', rating: 'Cải thiện thêm' },
                  { syllable: 'con', ipa: '/n/', rating: 'Cải thiện thêm' },
                  { syllable: 'sid', ipa: '/s/', rating: 'Tốt' },
                  { syllable: 'sid', ipa: '/ɪ/', rating: 'Tốt' },
                  { syllable: 'sid', ipa: '/d/', rating: 'Tốt' },
                  { syllable: 'ered', ipa: '/ə/', rating: 'Tốt' },
                  { syllable: 'ered', ipa: '/d/', rating: 'Cải thiện thêm' }
                ]
              }
            ],
            word_stress_improvements: [
              {
                word: 'etiquette',
                ipa: '/ˈet·ɪ·ket/',
                syllables: [
                  { syllable: 'et', correctStress: 'Nhấn', studentStress: 'Không nhấn' },
                  { syllable: 'i', correctStress: 'Không nhấn', studentStress: 'Nhấn' },
                  { syllable: 'quette', correctStress: 'Không nhấn', studentStress: 'Không nhấn' }
                ]
              },
              {
                word: 'getting',
                ipa: '/ˈget·ɪŋ/',
                syllables: [
                  { syllable: 'get', correctStress: 'Nhấn', studentStress: 'Không nhấn' },
                  { syllable: 'ting', correctStress: 'Không nhấn', studentStress: 'Nhấn' }
                ]
              }
            ],
            upgraded_answer: {
              title: 'Bài nâng cấp Band 8.5+',
              description: 'MoonLab đã nâng cấp trên bài của bạn. Với những bài có band dưới 7.5, bài nâng cấp sẽ giúp bạn tăng từ 0.5 đến 1.0 điểm từ vựng và/hoặc ngữ pháp.',
              transcript: "Expressing gratitude is considered a basic part of everyday etiquette in Vietnam. People regularly say “thank you” when receiving customer service in a store, getting help from a colleague, or accepting a favour. However, among very close family members or intimate friends, people sometimes show appreciation through actions or small gestures rather than saying the actual words. In fact, saying “thank you” can occasionally feel a bit distant in very close relationships.",
              collocations_count: 19,
              collocations: [
                { id: 1, phrase: 'Expressing - gratitude' },
                { id: 2, phrase: 'basic - part' },
                { id: 3, phrase: 'part - in' },
                { id: 4, phrase: 'part - of' },
                { id: 5, phrase: 'receiving - service' },
                { id: 6, phrase: 'customer - service' },
                { id: 7, phrase: 'in - a - store' },
                { id: 8, phrase: 'getting - help' },
                { id: 9, phrase: 'accepting - favour' },
                { id: 10, phrase: 'very - close' },
                { id: 11, phrase: 'close - family' },
                { id: 12, phrase: 'family - members' },
                { id: 13, phrase: 'intimate - friends' },
                { id: 14, phrase: 'show - appreciation' },
                { id: 15, phrase: 'small - gestures' },
                { id: 16, phrase: 'saying - words' },
                { id: 17, phrase: 'In - fact' },
                { id: 18, phrase: 'very - close' },
                { id: 19, phrase: 'close - relationships' }
              ],
              linking_devices_count: 3,
              linking_devices: ['However', 'rather than', 'In fact'],
              complex_structures_count: 1,
              complex_structures: [
                {
                  id: 1,
                  sentence: 'People regularly say “thank you” when receiving customer service in a store, getting help from a colleague, or accepting a favour.',
                  clauses: [
                    {
                      keyword: 'when',
                      type: 'Adverbial Clause of Time',
                      explanation: 'Mệnh đề trạng ngữ chỉ thời gian kết hợp chuỗi hành động song song.'
                    }
                  ]
                }
              ]
            },
            model_answer: {
              title: 'Bài mẫu ở trình độ band 7.0+ / 8.0+',
              band_target: 'Band 8.0+',
              transcript: "In my country, expressing gratitude is pretty common, especially in day-to-day interactions. Well, people usually thank service staff, and it sounds genuine rather than forced. That said, it’s a social expectation that can vary depending on the setting, so some people almost take it for granted.",
              vocabulary_notes: [
                {
                  phrase: 'expressing gratitude',
                  part_of_speech: 'noun phrase',
                  definition: 'showing appreciation or thanks'
                },
                {
                  phrase: 'pretty common',
                  part_of_speech: 'adjective phrase',
                  definition: 'happening frequently'
                },
                {
                  phrase: 'day-to-day interactions',
                  part_of_speech: 'noun phrase',
                  definition: 'everyday communication'
                },
                {
                  phrase: 'service staff',
                  part_of_speech: 'noun',
                  definition: 'people working in service jobs'
                },
                {
                  phrase: 'genuine',
                  part_of_speech: 'adjective',
                  definition: 'sincere and real'
                },
                {
                  phrase: 'social expectation',
                  part_of_speech: 'noun phrase',
                  definition: 'behavior society expects'
                },
                {
                  phrase: 'depending on the setting',
                  part_of_speech: 'prepositional phrase',
                  definition: 'influenced by the situation'
                },
                {
                  phrase: 'take it for granted',
                  part_of_speech: 'idiom',
                  definition: 'fail to appreciate something fully'
                }
              ]
            }
          }
        },
        {
          id: 'p1_q2',
          question_number: 2,
          question: "On what occasions do people often say 'thank you'?",
          ideas: [
            { step: 1, title: 'Identify common situations.', example: 'For example, you could say when people receive help or support.' },
            { step: 2, title: 'Give specific everyday examples.', example: 'For example, you could mention favors or professional services.' },
            { step: 3, title: 'Add informal or personal contexts.', example: 'For example, you could say it happens among friends or family.' },
            { step: 4, title: 'Conclude with a general pattern.', example: 'For example, you could say it’s linked to kindness.' }
          ]
        },
        {
          id: 'p1_q3',
          question_number: 3,
          question: 'Have you ever sent a thank you card to others?',
          ideas: [
            { step: 1, title: 'Give a clear yes or no answer.', example: 'For example, you could say you have done it before.' },
            { step: 2, title: 'Explain the situation.', example: 'For example, you could mention a special occasion.' },
            { step: 3, title: 'Describe your feelings about it.', example: 'For example, you could say it felt meaningful.' },
            { step: 4, title: 'Add a reflection.', example: 'For example, you could say it’s less common now.' }
          ]
        },
        {
          id: 'p1_q4',
          question_number: 4,
          question: 'Why do people need to say thank you?',
          ideas: [
            { step: 1, title: 'Explain the main reason.', example: 'For example, you could say it shows appreciation.' },
            { step: 2, title: 'Talk about social impact.', example: 'For example, you could say it improves relationships.' },
            { step: 3, title: 'Mention emotional benefits.', example: 'For example, you could say it makes people feel valued.' },
            { step: 4, title: 'Give a concluding idea.', example: 'For example, you could say it builds a positive society.' }
          ]
        }
      ]
    },
    {
      part_number: 2,
      title: 'Part 2: Individual Long Turn (3-4 minutes)',
      instructions: 'Trong phần thi IELTS Speaking Part 2, bạn sẽ được nói liên tục về một chủ đề trong 1-2 phút. Trong bài thi thực tế, bạn sẽ có 1 phút để nháp trước những nội dung bạn dự định sẽ nói, sau đó giám khảo mới bắt đầu bấm giờ làm bài.',
      guidelines: [
        'Đề thi Part 2 khá mở, hãy chọn hướng trả lời bạn có nhiều ý tưởng và từ vựng nhất',
        'Để đạt điểm Lưu loát (Fluency), bạn không cần phải nói nhanh, nhưng không được ngắt nghỉ không tự nhiên giữa chừng',
        'Dù đề bài ghi là nói từ 1-2 phút nhưng bạn nên nói càng gần 2 phút càng tốt',
        'Duy trì ngữ điệu tự nhiên, nhấn các từ vựng quan trọng trong suốt bài'
      ],
      cue_card: {
        topic: "Describe a time when you encouraged someone to do something that he or she didn't want to do.",
        bullet_points: [
          'Who he or she is',
          'What you encouraged him/her to do',
          'How he/she reacted',
          'And explain why you encouraged him/her to do it'
        ],
        ideas: [
          { step: 1, title: 'Introduce the person and your relationship with them.', example: 'For example, you could say who the person was and how you knew them.' },
          { step: 2, title: 'Describe the situation and what he or she didn’t want to do.', example: 'For example, you could say what decision or action they were avoiding and why.' },
          { step: 3, title: 'Explain your reasons for encouraging him or her.', example: 'For example, you could say why you thought it was important for them.' },
          { step: 4, title: 'Describe how you encouraged him or her.', example: 'For example, you could say what strategies or words you used to persuade them.' },
          { step: 5, title: 'Talk about his or her initial reaction.', example: 'For example, you could say how they responded emotionally at first.' },
          { step: 6, title: 'Explain the final outcome and reflection.', example: 'For example, you could say what happened in the end and what you learned from it.' }
        ],
        preparation_time_seconds: 60,
        speaking_time_seconds: 120
      }
    },
    {
      part_number: 3,
      title: 'Part 3: Two-Way In-Depth Discussion (4-5 minutes)',
      instructions: 'Trong phần thi IELTS Speaking Part 3, bạn sẽ được hỏi các câu hỏi cùng nhóm chủ đề nhưng sâu hơn so với Part 2. Lối tư duy và phát triển ý của Part 3 giống với Writing Task 2, nhưng ngắn hơn và sử dụng ngôn ngữ văn nói.',
      guidelines: [
        'Dùng ngôn ngữ để chuyển ý (signposting) rõ ràng, giúp giám khảo luôn biết bạn đang nói tới đâu',
        'Ưu tiên sử dụng đa góc nhìn (perspectives) để trả lời các vấn đề',
        'Dùng các cấu trúc phức để trả lời những câu khó nhất về nhận định, dự đoán',
        'Duy trì ngữ điệu tự nhiên, nhấn các từ vựng quan trọng trong suốt bài',
        'Đừng ngại câu hỏi khó, vì câu hỏi càng khó bạn càng có cơ hội đạt điểm số cao'
      ],
      questions: [
        {
          id: 'p3_q1',
          question_number: 1,
          question: 'How can leaders encourage their employees?',
          ideas: [
            { step: 1, title: 'Introduce the main way leaders motivate staff.', example: 'For example, you could say leaders often motivate people by recognising their efforts.' },
            { step: 2, title: 'Explain how communication and feedback help.', example: 'For example, you could say clear feedback helps employees feel valued and confident.' },
            { step: 3, title: 'Add the importance of trust and autonomy.', example: 'For example, you could say giving responsibility shows trust and boosts motivation.' }
          ]
        },
        {
          id: 'p3_q2',
          question_number: 2,
          question: 'When should parents encourage their children?',
          ideas: [
            { step: 1, title: 'State that encouragement is important during challenges.', example: 'For example, you could say children need support when facing difficulties.' },
            { step: 2, title: 'Explain encouragement during failure or mistakes.', example: 'For example, you could say encouragement helps children cope with setbacks.' },
            { step: 3, title: 'Mention encouragement at key developmental stages.', example: 'For example, you could say encouragement matters when children try new things.' }
          ]
        },
        {
          id: 'p3_q3',
          question_number: 3,
          question: 'What kind of encouragement should parents give?',
          ideas: [
            { step: 1, title: 'Introduce positive and realistic encouragement.', example: 'For example, you could say encouragement should be honest and specific.' },
            { step: 2, title: 'Explain the value of effort-based praise.', example: 'For example, you could say parents should praise effort, not just results.' },
            { step: 3, title: 'Mention emotional support and guidance.', example: 'For example, you could say encouragement should include listening and advice.' }
          ]
        },
        {
          id: 'p3_q4',
          question_number: 4,
          question: 'Do you think some people are better than others at persuading?',
          ideas: [
            { step: 1, title: 'Give a clear opinion that persuasion skills vary.', example: 'For example, you could say persuasion depends on personality and skills.' },
            { step: 2, title: 'Explain communication and emotional awareness.', example: 'For example, you could say good persuaders understand others’ feelings.' },
            { step: 3, title: 'Mention experience and practice.', example: 'For example, you could say persuasion improves with time and exposure.' }
          ]
        }
      ]
    }
  ],
  summary: {
    student_name: 'long',
    completion_date: '09/10/2026',
    test_title: "Full test 1: Saying 'thank you' + Describe a time when you encouraged someone to do something that he/she didn't want to do.",
    overall_band: 8.0,
    criteria_scores: {
      fc: 8.0,
      gra: 8.0,
      lr: 8.0,
      pr: 8.0
    },
    performance_by_part: {
      part1: 'Very Good',
      part2: 'Excellent',
      part3: 'Excellent'
    },
    overall_feedback: {
      main_strength: 'Tốc độ nói',
      strength_criterion: 'Fluency & Coherence',
      main_weakness_1: 'Phát âm từ đơn lẻ',
      main_weakness_2: 'Từ vựng theo chủ điểm',
      weakness_criterion_1: 'Pronunciation',
      weakness_criterion_2: 'Lexical Resource',
      action_plans: [
        'Bước đầu, bạn nên luyện tập nói chậm để đảm bảo phát âm chính xác từng từ, rồi tăng tốc độ khi đã thành thạo. Phát âm sai khi đã thành thói quen rất khó sửa. Nếu phát hiện lỗi, cần lặp đi lặp lại cách phát âm đúng cho đến khi nó trở thành phản xạ mới.',
        'Bạn có thể tận dụng nhiều nguồn tài liệu từ sách, báo, hoặc podcast liên quan đến chủ đề bạn quan tâm. Bạn cũng nên thực hành sử dụng từ vựng này thường xuyên khi nói và viết để có thể thành thạo trong việc sử dụng từ hơn.'
      ]
    },
    criteria_breakdown: {
      fc: {
        score: 8.0,
        band_descriptors: [
          'Nói trôi chảy, hiếm khi lặp lại ý hoặc tự sửa lại khi mắc lỗi',
          'Sự ngập ngừng trong lúc nói chủ yếu do tìm nội dung hoặc ý diễn đạt, ít khi phải dừng để tìm từ hoặc ngữ pháp',
          'Phát triển các chủ đề một cách mạch lạc, hợp lý và bám sát câu hỏi'
        ],
        sub_metrics: [
          {
            name: 'Linking devices',
            rating: 'Very Good',
            percent: 85,
            feedback: 'Bạn đã thành công trong việc sử dụng nhiều loại cụm từ kết nối một cách linh hoạt.'
          },
          {
            name: 'Relevance',
            rating: 'Very Good',
            percent: 88,
            feedback: 'Câu trả lời của bạn cho thấy độ liên quan ở mức độ cao với nội dung được hỏi.'
          },
          {
            name: 'Speak at length',
            rating: 'Very Good',
            percent: 82,
            feedback: 'Hãy cố gắng kéo dài câu trả lời để phát triển thêm nội dung, mặc dù độ dài hiện tại đã khá phù hợp.'
          },
          {
            name: 'Rate of speech',
            rating: 'Excellent',
            percent: 95,
            feedback: 'Một điểm đáng khen ngợi là tốc độ nói của bạn rất tốt, thể hiện qua việc hầu như câu trả lời không bị gián đoạn hoặc ngừng không cần thiết.'
          }
        ]
      },
      lr: {
        score: 8.0,
        band_descriptors: [
          'Sử dụng vốn từ vựng phong phú, dễ dàng và linh hoạt khi thảo luận về tất cả các chủ đề và truyền đạt ý nghĩa chính xác.',
          'Sử dụng các từ vựng ít phổ biến và thành ngữ một cách khéo léo, mặc dù đôi khi có những sai sót trong cách chọn và sắp xếp từ',
          'Sử dụng kĩ năng diễn đạt cùng một ý bằng các cách khác nhau hiệu quả khi cần thiết'
        ],
        sub_metrics: [
          {
            name: 'Collocations',
            rating: 'Very Good',
            percent: 85,
            feedback: 'Bạn đã áp dụng cụm từ cố định đều đặn xuyên suốt phần trả lời của mình.'
          },
          {
            name: 'Topic specific words',
            rating: 'Good',
            percent: 68,
            feedback: 'Trong câu trả lời, có thể nhận thấy một số ít trường hợp sử dụng từ vựng theo chủ điểm.'
          },
          {
            name: 'Word repetition control',
            rating: 'Excellent',
            percent: 92,
            feedback: 'Bạn đã hạn chế thành công lỗi lặp từ với tần suất lỗi rất thấp.'
          },
          {
            name: 'Lexical accuracy',
            rating: 'Very Good',
            percent: 84,
            feedback: 'Bạn còn mắc lỗi từ vựng với tần suất cứ vài câu lại gặp một lỗi.'
          }
        ]
      },
      gra: {
        score: 8.0,
        band_descriptors: [
          'Sử dụng nhiều và đa dạng các loại cấu trúc một cách linh hoạt',
          'Phần lớn các câu đều không mắc lỗi ngữ pháp, chỉ thỉnh thoảng vẫn sử dụng không phù hợp hoặc có lỗi ngữ pháp nhưng do vô tình mắc phải, không phải lỗi lặp lại liên tục.',
          'Thỉnh thoảng xảy ra các lỗi không phù hợp và không mang tính hệ thống. Có thể vẫn còn một vài lỗi cơ bản.'
        ],
        sub_metrics: [
          {
            name: 'Complex structures',
            rating: 'Very Good',
            percent: 84,
            feedback: 'Câu trả lời của bạn cho thấy khả năng sử dụng cấu trúc phức, tuy nhiên cần cải thiện về độ đa dạng và liên tục.'
          },
          {
            name: 'Grammatical accuracy',
            rating: 'Excellent',
            percent: 94,
            feedback: 'Có thể nhận thấy sự thành công đáng kể trong việc hạn chế lỗi ngữ pháp, với tần suất lỗi rất thấp.'
          }
        ],
        frequent_errors: [
          { count: 3, name: 'Mạo từ' },
          { count: 2, name: 'Dạng động từ' },
          { count: 2, name: 'Giới từ' }
        ]
      },
      pr: {
        score: 8.0,
        band_descriptors: [
          'Sử dụng đầy đủ các thành tố phát âm để truyền đạt ý nghĩa chính xác và/hoặc các ý hàm ẩn',
          'Duy trì nhịp điệu nói phù hợp, sử dụng linh hoạt trọng âm và ngữ điệu trong các câu nói dài, chỉ thỉnh thoảng bị ngắt quãng',
          'Người nghe có thể hiểu xuyên suốt bài nói một cách khá dễ dàng',
          'Giọng tiếng Anh chỉ ảnh hưởng rất ít đến tính dễ hiểu của bài nói'
        ],
        sub_metrics: [
          {
            name: 'Individual sound',
            rating: 'Good',
            percent: 70,
            feedback: 'Tần suất mắc lỗi phát âm từ đơn lẻ của bạn còn ở mức đáng kể.'
          },
          {
            name: 'Intonation and stress',
            rating: 'Excellent',
            percent: 93,
            feedback: 'Sự làm chủ trọng âm và ngữ điệu của bạn đã đạt mức tốt, âm điệu trong phần trả lời được nhấn nhá và lên xuống một cách khá tự nhiên, tạo sự dễ hiểu.'
          }
        ]
      }
    }
  },
  // Backward compatibility mock
  grading_result: {
    overall_band: 8.0,
    criteria_scores: {
      fluency_coherence: { score: 8.0, feedback: 'Nói trôi chảy, tốc độ tốt.' },
      lexical_resource: { score: 8.0, feedback: 'Vốn từ phong phú, dùng 13 collocations.' },
      grammatical_accuracy: { score: 8.0, feedback: 'Dùng câu phức linh hoạt, hạn chế tối đa lỗi.' },
      pronunciation: { score: 8.0, feedback: 'Ngữ điệu và trọng âm tự nhiên.' }
    },
    audio_url: 'https://cdn.freesound.org/previews/316/316844_4939433-lq.mp3'
  }
};
