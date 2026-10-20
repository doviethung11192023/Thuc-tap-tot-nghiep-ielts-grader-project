import { ReadingTestData, WritingTestData } from '../types/exam';

export const mockReadingTest: ReadingTestData = {
  test_id: 'r1',
  title: 'Cam 18 Test 1 - Reading',
  passages: [
    {
      passage: {
        id: 'p1',
        title: 'The Memory Paradox: How Forgetting Shapes Our Understanding of Memory',
        content: '',
        paragraphs: [
          { id: 'A', text: 'Forgetting is often seen as a failure of memory. However, recent research has identified certain proteins in the hippocampus that actively weaken synaptic connections. This process of pruning is essential for the brain to retain only the most important information.' },
          { id: 'B', text: 'Moreover, this selective process is active during deep sleep, a time when memory consolidation happens.' },
          { id: 'C', text: 'Without forgetting, our brains would be overwhelmed by the sheer volume of daily stimuli.' }
        ]
      },
      question_groups: [
        {
          group_id: 'g1',
          question_type: 'sentence_completion',
          instruction: 'Complete the sentences below. Choose NO MORE THAN TWO WORDS from the passage for each answer.',
          template: 'Research has identified {{1}} in the hippocampus that actively weaken synaptic connections. The selective process is active during {{2}} sleep.',
          questions: [
            {
              question_number: 1,
              correct_answers: ['proteins', 'protein', 'certain proteins'],
              explanation: 'Tại Paragraph A: "certain proteins actively weaken synaptic connections"',
              evidence_paragraph: 'A',
              evidence_quote: 'certain proteins in the hippocampus that actively weaken synaptic connections'
            },
            {
              question_number: 2,
              correct_answers: ['deep'],
              explanation: 'Tại Paragraph B: "consolidation happens during deep sleep"',
              evidence_paragraph: 'B',
              evidence_quote: 'consolidation happens during deep sleep'
            }
          ]
        },
        {
          group_id: 'g2',
          question_type: 'true_false_not_given',
          instruction: 'Do the following statements agree with the information given in Reading Passage 1? In boxes 3-4, choose TRUE, FALSE or NOT GIVEN.',
          questions: [
            {
              question_number: 3,
              prompt: 'Forgetting is generally considered a success of memory by most people.',
              correct_answers: ['FALSE'],
              explanation: 'Đoạn A nói Forgetting is often seen as a failure.',
              evidence_paragraph: 'A',
              evidence_quote: 'Forgetting is often seen as a failure of memory.'
            },
            {
              question_number: 4,
              prompt: 'The brain can remember every single detail if properly trained.',
              correct_answers: ['NOT GIVEN'],
              explanation: 'Không có thông tin về việc huấn luyện não bộ ghi nhớ mọi thứ.',
              evidence_paragraph: '',
              evidence_quote: ''
            }
          ]
        },
        {
          group_id: 'g3',
          question_type: 'diagram_labelling',
          instruction: 'Label the diagram below. Choose NO MORE THAN TWO WORDS from the passage for each answer.',
          diagram_image_url: 'https://via.placeholder.com/600x400?text=Hippocampus+Structure',
          questions: [
            {
              question_number: 5,
              correct_answers: ['hippocampus'],
              explanation: 'Tại Paragraph A: "certain proteins in the hippocampus"',
              evidence_paragraph: 'A',
              evidence_quote: 'certain proteins in the hippocampus that actively weaken synaptic connections',
              diagram_coordinate: { x: 30, y: 40 }
            },
            {
              question_number: 6,
              correct_answers: ['synaptic connections'],
              explanation: 'Tại Paragraph A: "actively weaken synaptic connections"',
              evidence_paragraph: 'A',
              evidence_quote: 'certain proteins in the hippocampus that actively weaken synaptic connections',
              diagram_coordinate: { x: 70, y: 60 }
            }
          ]
        }
      ]
    }
  ]
};

export const mockWritingTest: WritingTestData = {
  test_id: 'w1',
  title: 'WT1: Mixed charts + WT2: Two-part question',
  tasks: [
    {
      id: 't1',
      task_number: 1,
      prompt: 'The charts below show the percentage of water used for different purposes in six areas of the world. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
      min_words: 150,
      suggested_time: 20
    },
    {
      id: 't2',
      task_number: 2,
      prompt: 'Parenting roles are changing in many societies with fathers taking a more active role. Why is this happening? What impact does this have on families? Give reasons for your answer and include any relevant examples from your own knowledge or experience.',
      min_words: 250,
      suggested_time: 40
    }
  ]
};
