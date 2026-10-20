export interface SpeakingPartData {
  part_number: 1 | 2 | 3;
  title: string;
  instructions: string;
  questions?: string[];
  cue_card?: {
    topic: string;
    bullet_points: string[];
    preparation_time_seconds: number;
    speaking_time_seconds: number;
  };
}

export interface PhoneticErrorItem {
  id: string;
  word: string;
  student_ipa: string;
  standard_ipa: string;
  issue: string;
  practice_tip: string;
}

export interface SpeakingGraderResult {
  overall_band: number;
  criteria_scores: {
    fluency_coherence: {
      score: number;
      words_per_minute: number;
      hesitation_rate_percentage: number;
      feedback: string;
    };
    lexical_resource: {
      score: number;
      idiomatic_expressions: string[];
      feedback: string;
    };
    grammatical_accuracy: {
      score: number;
      complex_sentence_ratio: number;
      feedback: string;
    };
    pronunciation: {
      score: number;
      intonation_clarity: string;
      phonetic_errors: PhoneticErrorItem[];
      feedback: string;
    };
  };
  transcript: {
    text: string;
    annotations: {
      word: string;
      type: 'phonetic_error' | 'hesitation' | 'collocation';
      note: string;
    }[];
  };
  audio_url: string;
}

export const mockSpeakingExamDataset = {
  test_id: 'cam-18-test-1-speaking',
  title: 'Cambridge IELTS 18 - Full Speaking Examination',
  parts: [
    {
      part_number: 1 as const,
      title: 'Part 1: Introduction & Interview (4-5 minutes)',
      instructions: 'Answer short questions about yourself, your hometown, and your daily routine.',
      questions: [
        '1. Could you describe your hometown and what you like most about living there?',
        '2. Do you prefer working or studying in the morning or late at night? Why?',
        '3. How often do you spend time outdoors enjoying nature in your free time?'
      ]
    },
    {
      part_number: 2 as const,
      title: 'Part 2: Individual Long Turn (Cue Card - 3-4 minutes)',
      instructions: 'You have 1 minute to prepare your notes on the scratchpad, followed by 2 minutes to speak uninterrupted.',
      cue_card: {
        topic: 'Describe a memorable journey that made a strong impression on you.',
        bullet_points: [
          'Where you traveled to and when the trip took place',
          'Who accompanied you during this journey',
          'What unique activities or challenges you experienced',
          'And explain why this particular journey remains so unforgettable to you.'
        ],
        preparation_time_seconds: 60,
        speaking_time_seconds: 120
      }
    },
    {
      part_number: 3 as const,
      title: 'Part 3: Two-Way In-Depth Discussion (4-5 minutes)',
      instructions: 'Discuss broader abstract issues related to travel, cultural preservation, and environmental tourism.',
      questions: [
        '1. How has mass tourism transformed the economic and cultural landscape of developing countries?',
        '2. Do you think commercial space tourism will ever become a sustainable mode of travel in the future?'
      ]
    }
  ],
  grading_result: {
    overall_band: 6.5,
    criteria_scores: {
      fluency_coherence: {
        score: 6.5,
        words_per_minute: 122,
        hesitation_rate_percentage: 8.5,
        feedback: 'Thí sinh duy trì mạch nói tương đối liền mạch, tốc độ nói tự nhiên (122 từ/phút). Có một số quãng ngập ngừng "um, uh" khi tìm kiếm ý tưởng ở Part 2.'
      },
      lexical_resource: {
        score: 7.0,
        idiomatic_expressions: [
          'breathtaking scenery',
          'off the beaten track',
          'broaden my horizons',
          'hustle and bustle'
        ],
        feedback: 'Vốn từ vựng đa dạng, áp dụng khéo léo các thành ngữ bản ngữ và cụm từ miêu tả phong cảnh sắc sảo.'
      },
      grammatical_accuracy: {
        score: 6.5,
        complex_sentence_ratio: 0.65,
        feedback: 'Sử dụng linh hoạt các mệnh đề điều kiện và thì quá khứ hoàn thành. Cần lưu ý chia đúng động từ khi nói ở tốc độ nhanh.'
      },
      pronunciation: {
        score: 6.0,
        intonation_clarity: 'Ngữ điệu lên xuống tự nhiên, tuy nhiên còn mắc một số lỗi nuốt âm đuôi và phát âm sai trọng âm từ 3 âm tiết.',
        phonetic_errors: [
          {
            id: 'pe1',
            word: 'comfortable',
            student_ipa: '/kʌm.fɔːrˈteɪ.bəl/',
            standard_ipa: '/ˈkʌmftəbl/',
            issue: 'Phát âm thành 4 âm tiết và nhấn sai trọng âm vào âm tiết thứ 3.',
            practice_tip: 'Từ này chỉ có 3 âm tiết: /ˈkʌmf.tə.bl/, trọng âm rơi vào âm tiết đầu tiên.'
          },
          {
            id: 'pe2',
            word: 'journey',
            student_ipa: '/ˈzɜːni/',
            standard_ipa: '/ˈdʒɜː.ni/',
            issue: 'Nhầm lẫn âm đầu /dʒ/ thành âm /z/.',
            practice_tip: 'Tròn môi và bật hơi dứt khoát âm /dʒ/ thay vì kéo dài âm /z/.'
          },
          {
            id: 'pe3',
            word: 'breathtaking',
            student_ipa: '/ˈbreɪs.teɪ.kɪŋ/',
            standard_ipa: '/ˈbreθˌteɪ.kɪŋ/',
            issue: 'Phát âm nguyên âm /e/ thành /eɪ/ và nhầm âm /θ/ thành /s/.',
            practice_tip: 'Đặt đầu lưỡi giữa hai hàm răng để tạo âm vô thanh /θ/.'
          }
        ],
        feedback: 'Cần chú ý khẩu hình của các âm /dʒ/, /θ/ và giảm bớt các âm tiết thừa trong các từ đa âm tiết.'
      }
    },
    transcript: {
      text: `Well, I would like to talk about an unforgettable journey that I took two summers ago to the mountainous region of Ha Giang. I went there with a group of close university friends right after our exhausting final examinations. The scenery along the Ma Pi Leng pass was genuinely breathtaking, with emerald rivers winding through towering limestone karsts. However, the motorbike trek was quite demanding because of the steep, winding roads. What made this trip unforgettable was not just the dramatic landscape, but the warmth of the ethnic minority children we encountered in the remote villages. It truly broadened my horizons and offered a peaceful escape from the hustle and bustle of city life.`,
      annotations: [
        {
          word: 'breathtaking',
          type: 'phonetic_error',
          note: 'Phát âm cần lưu ý âm /θ/: /ˈbreθˌteɪ.kɪŋ/'
        },
        {
          word: 'broadened my horizons',
          type: 'collocation',
          note: 'Cụm Collocation C1 dùng rất tự nhiên'
        },
        {
          word: 'hustle and bustle',
          type: 'collocation',
          note: 'Idiom quen thuộc thể hiện nhịp sống đô thị'
        }
      ]
    },
    audio_url: 'https://cdn.freesound.org/previews/316/316844_4939433-lq.mp3'
  }
};
