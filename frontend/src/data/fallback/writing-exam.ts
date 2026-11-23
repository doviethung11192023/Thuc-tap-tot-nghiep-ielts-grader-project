export interface WritingHighlight {
  id: string;
  category: 'error' | 'coherence' | 'lexical' | 'strength';
  original_text: string;
  title: string;
  reason: string;
  suggested_fix: string;
}

export interface WritingCriteriaDetail {
  score: number;
  description: string;
  strengths: string[];
  improvements: string[];
}

export interface WritingGraderResult {
  overall_band: number;
  criteria_scores: {
    task_response: WritingCriteriaDetail;
    coherence_cohesion: WritingCriteriaDetail;
    lexical_resource: WritingCriteriaDetail;
    grammatical_accuracy: WritingCriteriaDetail;
  };
  highlights: WritingHighlight[];
  top_priorities: string[];
  lexical_upgrades: { original: string; upgraded: string; context: string }[];
  model_essay_band_8: {
    title: string;
    word_count: number;
    paragraphs: string[];
  };
}

export const mockWritingExamDataset = {
  test_id: 'cam-18-test-1-writing',
  title: 'IELTS Academic Writing - Task 1 & Task 2 Real Test',
  task1: {
    id: 'wt1',
    task_number: 1 as const,
    topic: 'EDUCATION EXPENDITURES',
    prompt: 'The charts below show the percentage of household expenditures on education in five European countries in 2010 and 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    min_words: 150,
    suggested_time: 20
  },
  task2: {
    id: 'wt2',
    task_number: 2 as const,
    topic: 'HIGHER EDUCATION & SOCIETY',
    prompt: 'Some people believe that university education should be free for all students, while others argue that individuals should pay for their own higher education fees. Discuss both views and give your own opinion.',
    min_words: 250,
    suggested_time: 40
  },
  sample_student_submission: `Some people believe that tertiary education should be fully financed by governments for every citizen. Meanwhile, others argue that students must pay their own college tuition fees. In my opinion, while state-funded universities foster equal opportunities, students should share part of the financial burden to maintain academic quality.

On the one hand, providing free higher education has huge benefits for social mobility. When universities do not charge tuition fees, talented students from underprivileged backgrounds can pursue academic degrees without worrying about debts. For instance, in several Scandinavian countries, free education has noticeably reduced the gap between rich and poor households. Furthermore, a highly educated workforce attracts international investments and increases national productivity.

On the other hand, funding universities solely through public taxes creates significant fiscal strain for governments. As student enrollments continue to rise, national budgets might not be sufficient to maintain modern laboratories and high professor salaries. Consequently, if educational institutions lack funding, the quality of lecturing will deteriorate. Therefore, asking students to pay modest fees ensures sustainable resources for campus facilities.

In conclusion, although government subsidies are crucial to ensure that no impoverished student is left behind, I believe a hybrid model is the most practical solution for modern economies.`,
  grading_result: {
    overall_band: 7.0,
    criteria_scores: {
      task_response: {
        score: 6.5,
        description: 'Thí sinh đã giải quyết cả hai mặt của vấn đề và thể hiện lập trường rõ ràng xuyên suốt bài viết.',
        strengths: [
          'Có quan điểm cá nhân rõ ràng (hybrid model) xuất hiện ở cả Mở bài và Kết bài.',
          'Các luận điểm được hỗ trợ bằng ví dụ xác thực (Scandinavian countries).'
        ],
        improvements: [
          'Cần đào sâu hơn phần phân tích hậu quả của việc thiếu kinh phí ở Body 2 để tăng tính thuyết phục.',
          'Nên nêu thêm một câu chốt liên kết (Link sentence) ở cuối đoạn Body 1.'
        ]
      },
      coherence_cohesion: {
        score: 7.0,
        description: 'Bố cục bài viết mạch lạc, chia 4 đoạn chuẩn xác. Sử dụng linh hoạt các liên từ logic.',
        strengths: [
          'Cặp liên từ đối lập "On the one hand" và "On the other hand" tạo sự cân đối cấu trúc hoàn hảo.',
          'Chuyển ý mượt mà giữa các câu bằng liên từ kết nối: "Furthermore", "Consequently", "Therefore".'
        ],
        improvements: [
          'Hạn chế lạm dụng liên từ ở đầu mọi câu đơn; nên kết hợp đại từ quan hệ (which, that) để tạo liên kết ngầm.'
        ]
      },
      lexical_resource: {
        score: 7.0,
        description: 'Vốn từ vựng học thuật phong phú, sử dụng chính xác nhiều collocations C1 phù hợp với chủ đề giáo dục và kinh tế.',
        strengths: [
          'Sử dụng các cụm từ đắt giá: "social mobility", "underprivileged backgrounds", "fiscal strain", "hybrid model".'
        ],
        improvements: [
          'Tránh lặp từ "students" và "education" trong cùng một đoạn văn.'
        ]
      },
      grammatical_accuracy: {
        score: 7.0,
        description: 'Kiểm soát ngữ pháp chắc chắn, đa dạng hóa các cấu trúc câu phức, câu điều kiện loại 1 và mệnh đề quan hệ.',
        strengths: [
          '85% số câu không mắc lỗi ngữ pháp cơ bản.',
          'Sử dụng chính xác mệnh đề nhượng bộ: "while state-funded universities foster...", "although government subsidies are crucial...".'
        ],
        improvements: [
          'Cần chú ý lỗi mạo từ "the rich and poor" và biến đổi thì ở câu điều kiện giả định.'
        ]
      }
    },
    highlights: [
      {
        id: 'h1',
        category: 'strength',
        original_text: 'foster equal opportunities',
        title: 'Cụm Collocation Tự Nhiên (Band 7.5+)',
        reason: 'Kết hợp động từ "foster" với danh từ "equal opportunities" mang sắc thái học thuật chuẩn bản ngữ.',
        suggested_fix: 'Giữ nguyên cách diễn đạt xuất sắc này.'
      },
      {
        id: 'h2',
        category: 'lexical',
        original_text: 'huge benefits',
        title: 'Nâng Cấp Từ Vựng (B1 -> C1)',
        reason: 'Tính từ "huge" mang tính văn nói (informal). Trong văn phong nghị luận học thuật nên dùng từ trang trọng hơn.',
        suggested_fix: 'Thay thế bằng "substantial advantages" hoặc "profound benefits".'
      },
      {
        id: 'h3',
        category: 'error',
        original_text: 'gap between rich and poor',
        title: 'Lỗi Thiếu Mạo Từ (Grammar)',
        reason: 'Khi dùng tính từ để chỉ một nhóm người trong xã hội, cần có mạo từ "the" đi kèm trước mỗi từ.',
        suggested_fix: 'Sửa thành: "the gap between the rich and the poor".'
      },
      {
        id: 'h4',
        category: 'coherence',
        original_text: 'high professor salaries',
        title: 'Lập Luận Cần Làm Rõ',
        reason: 'Cụm từ "professor salaries" chưa bao quát hết chi phí vận hành nghiên cứu của trường đại học.',
        suggested_fix: 'Nên mở rộng thành: "competitive academic compensation and research endowments".'
      },
      {
        id: 'h5',
        category: 'strength',
        original_text: 'significant fiscal strain',
        title: 'Thuật Ngữ Kinh Tế Học Thuật (C1)',
        reason: 'Dùng chính xác thuật ngữ "fiscal strain" để diễn đạt áp lực ngân sách chính phủ.',
        suggested_fix: 'Điểm cộng lớn cho tiêu chí Lexical Resource.'
      }
    ],
    top_priorities: [
      '1. Phát triển sâu hơn ví dụ trong Thân bài 2: Giải thích cụ thể chi phí phòng thí nghiệm công nghệ cao.',
      '2. Thay thế các từ vựng thường gặp (huge benefits, rich and poor) bằng thuật ngữ C1 chuẩn học thuật.',
      '3. Gia tăng tỷ lệ câu phức bằng cách lồng ghép các cấu trúc đảo ngữ (Not only... but also).'
    ],
    lexical_upgrades: [
      { original: 'huge benefits', upgraded: 'substantial advantages', context: 'providing free education has substantial advantages' },
      { original: 'rich and poor', upgraded: 'socioeconomically advantaged and marginalized groups', context: 'reduce the disparity between socioeconomically advantaged...' },
      { original: 'debts', upgraded: 'crippling student indebtedness', context: 'without fear of crippling student indebtedness' },
      { original: 'modern laboratories', upgraded: 'state-of-the-art research facilities', context: 'fund state-of-the-art research facilities' }
    ],
    model_essay_band_8: {
      title: 'Bài Mẫu Nâng Cấp Hoàn Chỉnh (Band 8.5 Model Answer)',
      word_count: 285,
      paragraphs: [
        'A contentious debate persists regarding whether tertiary education ought to be an entitlement universally funded by the public purse or a private investment shouldered by matriculating students. While non-fee-paying universities undeniably champion meritocracy and egalitarianism, I maintain that a cost-sharing framework provides the most sustainable avenue for educational excellence.',
        'Advocates of universal state financing emphasize its transformative impact on socioeconomic mobility. Imposing prohibitive tuition fees establishes systemic barriers that prevent disadvantaged scholars from realizing their intellectual potential. In contrast, tuition-free institutions in nations such as Norway and Germany democratize access, ensuring that human capital is mobilized regardless of hereditary wealth. Consequently, a highly qualified populace bolsters national innovation and broadens the tax base over the long term.',
        'Nevertheless, relying entirely on government appropriations introduces acute financial vulnerabilities. When higher education is funded solely via taxpayer revenue, university administrations frequently encounter fiscal deficits as demographic demand surges. Such constraints inevitably compromise academic standards, manifested in deteriorated laboratory infrastructure and an exodus of distinguished faculty. By contributing reasonable co-payments, students provide tertiary institutions with autonomous capital necessary to maintain global competitiveness.',
        'In conclusion, although robust state scholarships must safeguard access for impoverished students, universal gratuitous education is structurally untenable. A hybrid tuition framework remains paramount for sustaining academic rigor.'
      ]
    }
  }
};
