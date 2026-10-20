import { ReadingTestData } from '../types/exam';

export const mockReadingFullTest: ReadingTestData = {
  test_id: 'cam-18-test-1-reading',
  title: 'Cambridge IELTS 18 - Academic Reading Test 1',
  passages: [
    {
      passage: {
        id: 'p1',
        title: 'Passage 1: The Memory Paradox: How Forgetting Shapes Cognition',
        content: '',
        paragraphs: [
          {
            id: 'A',
            text: 'For decades, neuroscientists considered forgetting to be an unfortunate flaw or passive decay within the biological storage of memory. However, emerging research from the Oxford Institute of Brain Sciences reveals that forgetting is in fact an active, energy-consuming process that enables cognitive flexibility. Researchers have identified specialized proteins in the hippocampus that actively dismantle synaptic connections, clearing outdated data.'
          },
          {
            id: 'B',
            text: 'This selective pruning of neural pathways occurs predominantly during deep slow-wave sleep. When an organism rests, microglial cells inspect synaptic junctions and dissolve traces of insignificant events, such as what one ate for breakfast three weeks ago, while consolidating crucial survival skills and core semantic knowledge.'
          },
          {
            id: 'C',
            text: 'Without this active erasure, the human neural architecture would suffer severe information overload. Artificial intelligence models that lack forgetting algorithms frequently experience "catastrophic forgetting" or cognitive paralysis when confronted with novel, ambiguous environments. Biological pruning therefore prevents cognitive stagnation.'
          },
          {
            id: 'D',
            text: 'Dr. Evelyn Vance and her colleagues conducted experiments with maze-trained rodents. Rats genetically modified to produce lower concentrations of the erasure protein exhibited extraordinary recall for historical routes, yet struggled profoundly when food rewards were relocated. Their inability to unlearn past routes prevented adaptive problem-solving in dynamic conditions.'
          }
        ]
      },
      question_groups: [
        {
          group_id: 'g1_p1',
          question_type: 'sentence_completion',
          instruction: 'Complete the sentences below. Choose NO MORE THAN TWO WORDS from the passage for each answer.',
          template: 'Recent neurological studies show that specialized {{1}} located within the hippocampus dismantle unused synaptic connections. This process of neural pruning primarily takes place during {{2}} sleep.',
          questions: [
            {
              question_number: 1,
              correct_answers: ['proteins', 'specialized proteins'],
              explanation: 'Tại Paragraph A: "Researchers have identified specialized proteins in the hippocampus that actively dismantle synaptic connections".',
              evidence_paragraph: 'A',
              evidence_quote: 'specialized proteins in the hippocampus that actively dismantle synaptic connections'
            },
            {
              question_number: 2,
              correct_answers: ['deep', 'slow-wave', 'deep slow-wave'],
              explanation: 'Tại Paragraph B: "This selective pruning of neural pathways occurs predominantly during deep slow-wave sleep".',
              evidence_paragraph: 'B',
              evidence_quote: 'selective pruning of neural pathways occurs predominantly during deep slow-wave sleep'
            }
          ]
        },
        {
          group_id: 'g2_p1',
          question_type: 'true_false_not_given',
          instruction: 'Do the following statements agree with the information given in Reading Passage 1? Write TRUE, FALSE or NOT GIVEN.',
          questions: [
            {
              question_number: 3,
              prompt: 'Historically, scientists regarded forgetting as an involuntary deterioration of memory.',
              correct_answers: ['TRUE'],
              explanation: 'Tại Paragraph A: "For decades, neuroscientists considered forgetting to be an unfortunate flaw or passive decay".',
              evidence_paragraph: 'A',
              evidence_quote: 'neuroscientists considered forgetting to be an unfortunate flaw or passive decay within the biological storage of memory'
            },
            {
              question_number: 4,
              prompt: 'Rats with reduced erasure proteins adapted more swiftly to relocated food sources.',
              correct_answers: ['FALSE'],
              explanation: 'Tại Paragraph D: Các con chuột này "struggled profoundly when food rewards were relocated", tức là khó thích nghi hơn chứ không phải nhanh hơn.',
              evidence_paragraph: 'D',
              evidence_quote: 'yet struggled profoundly when food rewards were relocated'
            },
            {
              question_number: 5,
              prompt: 'Dr. Evelyn Vance plans to conduct human clinical trials in the next decade.',
              correct_answers: ['NOT GIVEN'],
              explanation: 'Đoạn D chỉ nhắc đến thí nghiệm trên loài gặm nhấm, không có bất kỳ thông tin nào về kế hoạch thử nghiệm lâm sàng trên người.',
              evidence_paragraph: 'D',
              evidence_quote: ''
            }
          ]
        },
        {
          group_id: 'g3_p1',
          question_type: 'diagram_labelling',
          instruction: 'Label the diagram below. Choose NO MORE THAN TWO WORDS from the passage for each answer.',
          diagram_image_url: 'https://images.unsplash.com/photo-1559757175-5700dde675bc?auto=format&fit=crop&w=600&q=80',
          questions: [
            {
              question_number: 6,
              correct_answers: ['hippocampus'],
              explanation: 'Tại Paragraph A: "specialized proteins in the hippocampus".',
              evidence_paragraph: 'A',
              evidence_quote: 'specialized proteins in the hippocampus',
              diagram_coordinate: { x: 35, y: 45 }
            },
            {
              question_number: 7,
              correct_answers: ['synaptic connections', 'synaptic junctions'],
              explanation: 'Tại Paragraph A & B: "dismantle synaptic connections", "inspect synaptic junctions".',
              evidence_paragraph: 'A',
              evidence_quote: 'dismantle synaptic connections, clearing outdated data',
              diagram_coordinate: { x: 68, y: 55 }
            }
          ]
        }
      ]
    },
    {
      passage: {
        id: 'p2',
        title: 'Passage 2: Sustainable Urban Architecture & Microclimates',
        content: '',
        paragraphs: [
          {
            id: 'A',
            text: 'Metropolitan areas worldwide are increasingly subjected to the urban heat island (UHI) phenomenon, wherein concrete pavements and glass skyscrapers absorb and re-radiate solar thermal energy. In cities like Singapore and Tokyo, ambient temperatures in city centers often exceed those of surrounding rural peripheries by up to 7 degrees Celsius.'
          },
          {
            id: 'B',
            text: 'Architectural innovators have begun implementing vertical biophilic integration. By cloaking building facades in indigenous climbing flora and incorporating wind-funneling breezeways, surface temperatures can be reduced by 12 degrees Celsius, concurrently lowering municipal air conditioning consumption by 30 percent.'
          },
          {
            id: 'C',
            text: 'Moreover, traditional Portland cement production accounts for roughly 8 percent of global carbon dioxide emissions. Forward-thinking structural engineers are turning toward cross-laminated timber (CLT) and recycled pozzolanic ash concrete, transforming towers into carbon sinks rather than carbon polluters.'
          }
        ]
      },
      question_groups: [
        {
          group_id: 'g1_p2',
          question_type: 'matching_headings',
          instruction: 'Reading Passage 2 has three paragraphs, A-C. Choose the correct heading for each paragraph from the list of headings below.',
          options_pool: [
            { key: 'i', text: 'The severe thermodynamic toll of traditional urbanization' },
            { key: 'ii', text: 'Biophilic facade cooling and energy mitigation techniques' },
            { key: 'iii', text: 'Decarbonizing construction materials through timber and ash' },
            { key: 'iv', text: 'The economic repercussions of residential air conditioning' }
          ],
          questions: [
            {
              question_number: 8,
              prompt: 'Paragraph A',
              correct_answers: ['i'],
              explanation: 'Paragraph A nói về hiện tượng Urban Heat Island và nhiệt độ tăng 7 độ C do bê tông và kính hấp thụ nhiệt.',
              evidence_paragraph: 'A',
              evidence_quote: 'Metropolitan areas worldwide are increasingly subjected to the urban heat island (UHI) phenomenon'
            },
            {
              question_number: 9,
              prompt: 'Paragraph B',
              correct_answers: ['ii'],
              explanation: 'Paragraph B nói về tường cây xanh (vertical biophilic flora) và thông gió tự nhiên giúp giảm nhiệt độ bề mặt 12 độ C và giảm 30% điện điều hòa.',
              evidence_paragraph: 'B',
              evidence_quote: 'Architectural innovators have begun implementing vertical biophilic integration'
            },
            {
              question_number: 10,
              prompt: 'Paragraph C',
              correct_answers: ['iii'],
              explanation: 'Paragraph C nói về vật liệu thay thế xi măng Portland gồm gỗ CLT và tro xỉ pozzolanic để giảm phát thải carbon.',
              evidence_paragraph: 'C',
              evidence_quote: 'turning toward cross-laminated timber (CLT) and recycled pozzolanic ash concrete'
            }
          ]
        }
      ]
    },
    {
      passage: {
        id: 'p3',
        title: 'Passage 3: The Evolution of Cetacean Communication',
        content: '',
        paragraphs: [
          {
            id: 'A',
            text: 'Marine bioacousticians studying humpback whales (Megaptera novaeangliae) have uncovered that their vocalizations possess syntactic hierarchical structure akin to human musical compositions. Songs are partitioned into themes, phrases, and discrete acoustic units known as notes.'
          },
          {
            id: 'B',
            text: 'Intriguingly, entire pods across the South Pacific synchronize their musical motifs each breeding season. When a pod introduces a compelling novel acoustic theme, it propagates across thousands of kilometers within months—a phenomenon known as cultural transmission.'
          }
        ]
      },
      question_groups: [
        {
          group_id: 'g1_p3',
          question_type: 'single_choice',
          instruction: 'Choose the correct letter, A, B, C or D.',
          questions: [
            {
              question_number: 11,
              prompt: 'What characteristic do humpback whale songs share with human music?',
              options_pool: [
                { key: 'A', text: 'They are transmitted exclusively by female matriarchs.' },
                { key: 'B', text: 'They demonstrate a structured hierarchy of themes and phrases.' },
                { key: 'C', text: 'They remain strictly unaltered throughout an individual\'s lifetime.' },
                { key: 'D', text: 'They are restricted to short-distance echolocation.' }
              ],
              correct_answers: ['B'],
              explanation: 'Tại Paragraph A: "their vocalizations possess syntactic hierarchical structure akin to human musical compositions. Songs are partitioned into themes, phrases, and discrete acoustic units".',
              evidence_paragraph: 'A',
              evidence_quote: 'syntactic hierarchical structure akin to human musical compositions. Songs are partitioned into themes, phrases'
            },
            {
              question_number: 12,
              prompt: 'The rapid dissemination of novel musical motifs across whale pods demonstrates:',
              options_pool: [
                { key: 'A', text: 'Genetic mutation in acoustic organs' },
                { key: 'B', text: 'Marine acoustic interference caused by shipping vessels' },
                { key: 'C', text: 'Cultural transmission across expansive oceanic regions' },
                { key: 'D', text: 'Competitive territory demarcation rituals' }
              ],
              correct_answers: ['C'],
              explanation: 'Tại Paragraph B: "it propagates across thousands of kilometers within months—a phenomenon known as cultural transmission".',
              evidence_paragraph: 'B',
              evidence_quote: 'propagates across thousands of kilometers within months—a phenomenon known as cultural transmission'
            }
          ]
        }
      ]
    }
  ]
};
