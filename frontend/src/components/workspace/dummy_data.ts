export interface CriteriaFeedback {
  strengths: string[];
  areas_to_improve: string[];
}

export interface CriteriaScore {
  sub_criteria: Record<string, string>;
  feedback: CriteriaFeedback;
}

export interface InlineAnnotation {
  id: string;
  type: "error" | "upgrade" | "logic_issue" | "strength";
  category: "TR" | "CC" | "LR" | "GRA";
  position_start: number;
  position_end: number;
  original_text: string;
  corrected_text: string | null;
  title?: string;
  explanation: string;
  recommendation?: string;
}

export interface GradingResult {
  essay_id: string;
  status: string;
  content: string;
  word_count: number;
  overall_upgraded_essay: string;
  scores: {
    overall_band: number;
    task_response: number;
    coherence_cohesion: number;
    lexical_resource: number;
    grammatical_range_and_accuracy: number;
  };
  criteria_analysis: {
    task_response: CriteriaScore;
    coherence_cohesion: CriteriaScore;
    lexical_resource: CriteriaScore;
    grammatical_range_and_accuracy: CriteriaScore;
  };
  inline_annotations: InlineAnnotation[];
}

export const DUMMY_RESULT: GradingResult = {
  essay_id: "essay_369",
  status: "graded",
  content: `The domestic migration from countryside to urban areas is a constant fact in a great number of parts of the globe, which results in problems, especifically in cities. In my opinion, some of the causes might be the transition from agricultural to technological economies and the lack of support from governments to coutryside economy. I will suggest that major support and promotion of the agricultural services might encourage people to stay at coutryside.\nThe national migration is a well-know fact that happen into the countries as a product of technological advancements and its impact in the national and international economy. The service sector is nowadays the main activity within the countries, which resulted in more opportunities along the the cities of the world because this sector is mainly located in cosmopolitan areas, therefore, rural people have decided to emigrate to the cities seeking to improve their standard of living. Additionally, with the growth of the service sector, governments have reduced the funding for countryside which resulted in high rates of unemployed people in that regions. This lack of support, encourage the movement of people as a negative side effects in the cities because of overcowded populations.\nIn order to mitigate the overcrowded populations accross the cities in the world, it is crucial to support and promote the country side economies to avoid the movement of people domestically. Governmments need to increase the budged allocated to rural areas, but additionally, they ought to provide better systems to promote and increase the participation of agricultural economies. If farmers find the adecuate support to produce the farms, they are less unlikely to abandond their lands because they already have a livelyhood. This support may impact benefically in cities because differents social issues could be reduced.\nIn conclusion, it is an undeniable fact that the domestic migration happens because of technological advancements and lack of support to countryside economy. Nonetheless, if some measures are incremented and adecuated to the countryside. I strongly believe that farmers are likely to work their lands instead of migrate.`,
  word_count: 340,
  overall_upgraded_essay: "Domestic migration from rural to urban areas has become a pervasive phenomenon globally, precipitating numerous challenges, particularly in major cities. In my view, the primary drivers of this trend are the shift from agrarian to technology-driven economies and the systematic underfunding of rural infrastructure by governments. To reverse this, I would propose that substantial governmental investment in agricultural sectors could effectively incentivize individuals to remain in rural communities.\n\nInternal migration is largely a byproduct of technological advancements and their sweeping impact on national economies. Today, the service sector dominates economic activity; because it is concentrated in cosmopolitan areas, it offers abundant employment opportunities. Consequently, rural residents migrate to cities in pursuit of a higher standard of living. Concurrently, as the service sector expands, governments have steadily reduced rural funding, leading to soaring unemployment rates in those regions. This lack of support exacerbates urban migration, resulting in detrimental side effects such as severe overpopulation in cities.\n\nTo mitigate urban overcrowding, it is imperative to revitalize rural economies to discourage domestic migration. Governments must not only increase budget allocations to rural areas but also implement comprehensive systems to promote agricultural participation. If farmers receive adequate support—such as subsidies or modern farming equipment—they are far less likely to abandon their land, as their livelihood is secured. Such interventions would indirectly benefit cities by alleviating the social pressures caused by overpopulation.\n\nIn conclusion, the exodus from the countryside is an undeniable consequence of technological progress and the neglect of rural economies. However, if appropriate investments are strategically redirected toward rural development, I firmly believe that individuals will choose to cultivate their lands rather than migrate to cities.",
  scores: {
    overall_band: 6.0,
    task_response: 6.5,
    coherence_cohesion: 6.0,
    lexical_resource: 6.0,
    grammatical_range_and_accuracy: 5.5,
  },
  criteria_analysis: {
    task_response: {
      sub_criteria: {
        "relevance_to_prompt": "Bài viết giải quyết khá tốt 2 vế của đề bài (causes & solutions).",
        "clarity_of_position": "Quan điểm rõ ràng ngay từ mở bài và được duy trì xuyên suốt.",
        "depth_of_ideas": "Các luận điểm được đưa ra (transition to technological economies, lack of funding) hợp lý nhưng chưa được khai thác sâu bằng ví dụ thực tế.",
        "appropriateness_of_format": "Đúng định dạng essay.",
        "relevant_specific_examples": "Thiếu các ví dụ cụ thể để minh họa cho luận điểm.",
        "appropriate_word_count": "340 từ (Đạt tiêu chuẩn > 250 từ)."
      },
      feedback: {
        strengths: [
          "Xác định đúng trọng tâm đề bài.",
          "Quan điểm được trình bày rõ ràng ở mở bài và kết luận."
        ],
        areas_to_improve: [
          "Cần phát triển sâu hơn các giải pháp thay vì chỉ nói chung chung 'increase budget'.",
          "Nên đưa thêm ví dụ thực tế (Ví dụ: chính sách hỗ trợ nông dân ở một quốc gia cụ thể)."
        ]
      }
    },
    coherence_cohesion: {
      sub_criteria: {
        "logical_progression": "Có sự chuyển ý giữa nguyên nhân và giải pháp nhưng đôi khi còn rườm rà.",
        "effective_intro_conclusion": "Mở bài và kết bài làm tốt nhiệm vụ tóm tắt ý chính.",
        "paragraph_unity_and_topic_sentence": "Mỗi đoạn văn có câu chủ đề tương đối rõ, nhưng các câu support đôi khi bị lặp ý.",
        "cohesive_devices_usage": "Sử dụng các từ nối cơ bản (Additionally, In order to, In conclusion).",
        "paragraphing": "Chia 4 đoạn rõ ràng, hợp lý."
      },
      feedback: {
        strengths: [
          "Cấu trúc 4 đoạn chuẩn mực cho dạng Cause/Solution.",
          "Sử dụng từ nối (cohesive devices) tương đối ổn định."
        ],
        areas_to_improve: [
          "Tránh lặp lại quá nhiều các cụm từ nối quen thuộc.",
          "Cần chú ý hơn đến tính mạch lạc giữa các câu trong đoạn 2."
        ]
      }
    },
    lexical_resource: {
      sub_criteria: {
        "vocabulary_range": "Sử dụng được một số từ vựng chủ đề (domestic migration, cosmopolitan areas, standard of living).",
        "lexical_accuracy": "Đôi chỗ dùng từ chưa chính xác ngữ cảnh (ví dụ: 'constant fact').",
        "spelling_word_formation": "Sai chính tả khá nhiều (especifically, coutryside, well-know, overcowded, accross, governmments, budged, adecuate, abandond, livelyhood, differents, adecuated)."
      },
      feedback: {
        strengths: [
          "Có nỗ lực sử dụng từ vựng liên quan đến kinh tế và di cư."
        ],
        areas_to_improve: [
          "Sai chính tả ở những từ cơ bản là điểm trừ cực kỳ lớn làm giảm điểm LR.",
          "Tránh lặp từ (coutryside, support, movement of people)."
        ]
      }
    },
    grammatical_range_and_accuracy: {
      sub_criteria: {
        "sentence_structure_variety": "Cố gắng sử dụng câu phức (which results in..., If farmers find...) nhưng chưa đa dạng.",
        "grammar_accuracy": "Còn mắc nhiều lỗi ngữ pháp cơ bản (chia động từ, mạo từ, thì).",
        "punctuation_usage": "Sử dụng dấu câu cơ bản, đôi khi thiếu dấu phẩy trong câu phức."
      },
      feedback: {
        strengths: [
          "Có sử dụng câu điều kiện (If farmers find...)."
        ],
        areas_to_improve: [
          "Sai lỗi chia động từ cơ bản (fact that happen -> happens).",
          "Lỗi về số ít số nhiều (in that regions -> those regions)."
        ]
      }
    }
  },
  inline_annotations: [
    {
      id: "ann_1",
      type: "error",
      category: "LR",
      position_start: 142,
      position_end: 155,
      original_text: "especifically",
      corrected_text: "specifically",
      title: "Sai chính tả",
      explanation: "Từ này bị viết sai chính tả, cần sửa lại thành 'specifically'."
    },
    {
      id: "ann_2",
      type: "error",
      category: "LR",
      position_start: 314,
      position_end: 324,
      original_text: "coutryside",
      corrected_text: "countryside",
      title: "Sai chính tả",
      explanation: "Lỗi chính tả thường gặp. 'Country' + 'side'."
    },
    {
      id: "ann_3",
      type: "error",
      category: "GRA",
      position_start: 746,
      position_end: 753,
      original_text: "the the",
      corrected_text: "the",
      title: "Lặp mạo từ",
      explanation: "Lỗi đánh máy lặp 2 chữ 'the'.",
      recommendation: "Chỉ sử dụng 1 chữ 'the'."
    },
    {
      id: "ann_4",
      type: "error",
      category: "GRA",
      position_start: 1042,
      position_end: 1054,
      original_text: "that regions",
      corrected_text: "those regions",
      title: "Sai mạo từ / Từ chỉ định",
      explanation: "'Regions' là danh từ số nhiều nên phải dùng 'those' thay vì 'that'."
    },
    {
      id: "ann_5",
      type: "strength",
      category: "TR",
      position_start: 167,
      position_end: 456,
      original_text: "In my opinion, some of the causes might be the transition from agricultural to technological economies and the lack of support from governments to coutryside economy. I will suggest that major support and promotion of the agricultural services might encourage people to stay at coutryside.",
      corrected_text: null,
      title: "Thesis Statement rõ ràng",
      explanation: "Bạn đã nêu rõ ràng cả 2 khía cạnh: Nguyên nhân (transition to technological economies) và Giải pháp (promotion of agricultural services)."
    }
  ]
};
