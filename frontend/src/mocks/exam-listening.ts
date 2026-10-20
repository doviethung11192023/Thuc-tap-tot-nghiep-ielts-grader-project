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

export const mockListeningFullTest: ListeningTestData = {
  test_id: 'cam-18-test-1-listening',
  title: 'Cambridge IELTS 18 - Academic Listening Test 1',
  total_duration_minutes: 30,
  sections: [
    {
      section_number: 1,
      title: 'Section 1: Accommodation Enquiry - Rental Agency',
      audio_url: 'https://cdn.freesound.org/previews/316/316844_4939433-lq.mp3',
      duration_seconds: 420,
      transcripts: [
        {
          id: 't1',
          timestamp: '00:15',
          speaker: 'Agent',
          text: 'Good morning! Welcome to Central Lettings Agency. How can I assist you with your flat hunt today?'
        },
        {
          id: 't2',
          timestamp: '00:28',
          speaker: 'Sarah',
          text: 'Hello! Yes, my name is Sarah Peterson. I am moving here to start work at the university hospital next month.'
        },
        {
          id: 't3',
          timestamp: '00:45',
          speaker: 'Agent',
          text: 'Pleasure to meet you, Ms. Peterson. Can I take down a contact telephone number for your file?'
        },
        {
          id: 't4',
          timestamp: '00:52',
          speaker: 'Sarah',
          text: 'Of course. It is 07700 900123. That is my personal mobile.',
          keywords: [
            { phrase: '07700 900123', question_number: 1, type: 'answer' }
          ]
        },
        {
          id: 't5',
          timestamp: '01:10',
          speaker: 'Agent',
          text: 'Wonderful. And what location preferences do you have regarding public transit?'
        },
        {
          id: 't6',
          timestamp: '01:18',
          speaker: 'Sarah',
          text: 'Well, initially I thought of an apartment near the bus depot, but with evening shift work, I would feel much safer if it is walking distance from the railway station.',
          keywords: [
            { phrase: 'bus depot', question_number: 2, type: 'distractor' },
            { phrase: 'railway station', question_number: 2, type: 'answer' }
          ]
        },
        {
          id: 't7',
          timestamp: '01:40',
          speaker: 'Agent',
          text: 'Got it. And what is your maximum monthly budget for rent including council tax?'
        },
        {
          id: 't8',
          timestamp: '01:50',
          speaker: 'Sarah',
          text: 'My absolute ceiling is 650 pounds. Anything higher than 650 would strain my finances.',
          keywords: [
            { phrase: '650', question_number: 3, type: 'answer' }
          ]
        }
      ],
      question_groups: [
        {
          group_id: 'l_g1',
          question_type: 'form_completion',
          instruction: 'Complete the notes below. Write ONE WORD AND/OR A NUMBER for each answer.',
          template: 'Contact Phone Number: {{1}}\nDesired Location: Walking distance from the {{2}}\nMaximum monthly budget: £{{3}}',
          questions: [
            {
              question_number: 1,
              correct_answers: ['07700900123', '07700 900123'],
              explanation: 'Tại timestamp 00:52: Sarah đọc số điện thoại: 07700 900123.'
            },
            {
              question_number: 2,
              correct_answers: ['railway station', 'station'],
              explanation: 'Tại timestamp 01:18: Bẫy ban đầu là bus depot, nhưng Sarah chốt lại muốn walking distance from the railway station.'
            },
            {
              question_number: 3,
              correct_answers: ['650'],
              explanation: 'Tại timestamp 01:50: Ngân sách tối đa của Sarah là £650.'
            }
          ]
        }
      ]
    },
    {
      section_number: 2,
      title: 'Section 2: City Bike Rental Scheme & Park Map',
      audio_url: 'https://cdn.freesound.org/previews/316/316844_4939433-lq.mp3',
      duration_seconds: 450,
      transcripts: [
        {
          id: 't2_1',
          timestamp: '00:20',
          speaker: 'Guide',
          text: 'Welcome visitors to the Greenways Riverside Park! Before you explore, let me orient you using the park map.'
        },
        {
          id: 't2_2',
          timestamp: '00:40',
          speaker: 'Guide',
          text: 'As you enter through the South Gate, immediately on your right across the duck pond is our dedicated Bicycle Repair Station.',
          keywords: [
            { phrase: 'across the duck pond', question_number: 4, type: 'synonym' },
            { phrase: 'Bicycle Repair Station', question_number: 4, type: 'answer' }
          ]
        },
        {
          id: 't2_3',
          timestamp: '01:05',
          speaker: 'Guide',
          text: 'If you proceed northward along the paved promenade until you reach the wooden suspension bridge, you will spot the First Aid Tent situated beside the picnic lawns.',
          keywords: [
            { phrase: 'First Aid Tent', question_number: 5, type: 'answer' }
          ]
        }
      ],
      question_groups: [
        {
          group_id: 'l_g2',
          question_type: 'diagram_labelling',
          instruction: 'Label the map below. Write the correct letter, A-E, next to Questions 4-5.',
          diagram_image_url: 'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&w=600&q=80',
          questions: [
            {
              question_number: 4,
              prompt: 'Bicycle Repair Station',
              correct_answers: ['B'],
              explanation: 'Bên phải hồ vịt đối diện cổng Nam là điểm B.',
              diagram_coordinate: { x: 75, y: 35 }
            },
            {
              question_number: 5,
              prompt: 'First Aid Tent',
              correct_answers: ['D'],
              explanation: 'Cạnh cầu treo gỗ và bãi cỏ dã ngoại là điểm D.',
              diagram_coordinate: { x: 45, y: 70 }
            }
          ]
        }
      ]
    },
    {
      section_number: 3,
      title: 'Section 3: Marine Biology Presentation Discussion',
      audio_url: 'https://cdn.freesound.org/previews/316/316844_4939433-lq.mp3',
      duration_seconds: 480,
      transcripts: [
        {
          id: 't3_1',
          timestamp: '00:15',
          speaker: 'Professor',
          text: 'Liam and Maya, let us review your proposal for next week\'s seminar on coral reef degradation.'
        },
        {
          id: 't3_2',
          timestamp: '00:30',
          speaker: 'Liam',
          text: 'We initially planned to focus exclusively on ocean acidification, but Maya suggested ocean thermal warming has a more acute shock effect on zooxanthellae algae.',
          keywords: [
            { phrase: 'ocean acidification', question_number: 6, type: 'distractor' },
            { phrase: 'ocean thermal warming', question_number: 6, type: 'answer' }
          ]
        }
      ],
      question_groups: [
        {
          group_id: 'l_g3',
          question_type: 'single_choice',
          instruction: 'Choose the correct letter, A, B or C.',
          questions: [
            {
              question_number: 6,
              prompt: 'What primary trigger did Maya and Liam decide to focus on regarding coral bleaching?',
              options_pool: [
                { key: 'A', text: 'Microplastic ingestion by marine life' },
                { key: 'B', text: 'Rising thermal temperatures in ocean water' },
                { key: 'C', text: 'Chemical runoff from commercial agriculture' }
              ],
              correct_answers: ['B'],
              explanation: 'Maya đề xuất tập trung vào hiện tượng tăng nhiệt độ nước biển (ocean thermal warming).'
            }
          ]
        }
      ]
    },
    {
      section_number: 4,
      title: 'Section 4: Academic Lecture - Roman Engineering & Pozzolanic Concrete',
      audio_url: 'https://cdn.freesound.org/previews/316/316844_4939433-lq.mp3',
      duration_seconds: 520,
      transcripts: [
        {
          id: 't4_1',
          timestamp: '00:10',
          speaker: 'Lecturer',
          text: 'Good afternoon. Today we examine the hydraulic properties of Roman concrete, known as opus caementicium.'
        },
        {
          id: 't4_2',
          timestamp: '00:45',
          speaker: 'Lecturer',
          text: 'Unlike modern cement which degrades in saline water, Roman maritime structures grew sturdier over millennia because volcanic ash containing aluminium reacted with seawater to form rare crystals of tobermorite.',
          keywords: [
            { phrase: 'volcanic ash', question_number: 7, type: 'answer' },
            { phrase: 'seawater', question_number: 7, type: 'synonym' }
          ]
        }
      ],
      question_groups: [
        {
          group_id: 'l_g4',
          question_type: 'sentence_completion',
          instruction: 'Complete the lecture notes below. Write NO MORE THAN TWO WORDS for each answer.',
          template: 'Roman maritime concrete gained unprecedented strength due to the interaction between seawater and {{7}}.',
          questions: [
            {
              question_number: 7,
              correct_answers: ['volcanic ash'],
              explanation: 'Tại timestamp 00:45: Nước biển phản ứng với "volcanic ash" (tro núi lửa) tạo ra tinh thể tobermorite bền vững.'
            }
          ]
        }
      ]
    }
  ]
};
