// Dữ liệu Đề Bài & Lời Giải Chi Tiết Thật từ de_bai_clean và dap_an_loi_giai_clean
// Nguồn: 445_Recent_Actual_Test / test_25863_Test_1 / listening

export interface CleanListeningKeywordMapping {
  original_text: string;
  paraphrased_text: string;
  mapping_type?: string;
}

export interface CleanListeningQuestion {
  id: number;
  question_number: number;
  section_number: number;
  question_type: string | number;
  prompt: string;
  options: { key: string; text: string }[];
  user_answer: string;
  correct_answer: string;
  is_correct: boolean;
  explanation_4_steps: string;
  evidence_text: string;
  evidence_source_id?: string;
  keywords_mapping: CleanListeningKeywordMapping[];
}

export interface CleanListeningUtterance {
  id: number;
  speaker_id: number;
  speaker_name: string;
  role: string;
  text: string;
  start_timestamp: number;
  end_timestamp: number;
  start_seconds: number;
  time_formatted: string;
}

export interface CleanListeningSection {
  section_number: number;
  title: string;
  audio_url: string;
  playtime_string: string;
  duration_seconds: number;
  transcript_utterances: CleanListeningUtterance[];
}

export interface CleanListeningExerciseGroup {
  id: number;
  section_number: number;
  type: string | number;
  title: string;
  content: string;
  table_data?: any;
  question_start: number;
  question_end: number;
}

export interface CleanListeningTaskFormatResult {
  code?: string;
  name?: string;
  correct_answers?: number;
  total_questions?: number;
  correct_rate?: number;
  correct?: number;
  total?: number;
  percentage?: number;
  [key: string]: any;
}

export interface CleanListeningTestData {
  test_id: string;
  slug: string;
  title: string;
  overall_band: number;
  correct_count: number;
  total_questions: number;
  time_spent: string;
  submitted_at: string;
  task_formats_result: CleanListeningTaskFormatResult[];
  exercise_groups: CleanListeningExerciseGroup[];
  sections: CleanListeningSection[];
  questions: CleanListeningQuestion[];
}

export const cleanListeningTest1Data: CleanListeningTestData = {
  "test_id": "test-1",
  "slug": "recent-actual-test-listening-test-1",
  "title": "Recent Actual Test - Listening Test 1",
  "overall_band": 4.5,
  "correct_count": 13,
  "total_questions": 40,
  "time_spent": "28:15",
  "submitted_at": "14:20 12/10/2026",
  "task_formats_result": [
    {
      "code": "ielts_listening_table_completion",
      "name": "Table Completion",
      "total_questions": 17,
      "correct_answers": 8,
      "correct_rate": 47,
      "incorrect_rate": 52.9
    },
    {
      "code": "ielts_listening_plan_map_labelling",
      "name": "Plan/Map Labelling",
      "total_questions": 5,
      "correct_answers": 1,
      "correct_rate": 20,
      "incorrect_rate": 80
    },
    {
      "code": "ielts_listening_sentence_completion",
      "name": "Sentence Completion",
      "total_questions": 5,
      "correct_answers": 0,
      "correct_rate": 0,
      "incorrect_rate": 100
    },
    {
      "code": "ielts_listening_mcq_multiple",
      "name": "MCQ - Multiple Answers",
      "total_questions": 7,
      "correct_answers": 4,
      "correct_rate": 57,
      "incorrect_rate": 42.9
    },
    {
      "code": "ielts_listening_note_completion",
      "name": "Note Completion",
      "total_questions": 6,
      "correct_answers": 0,
      "correct_rate": 0,
      "incorrect_rate": 100
    }
  ],
  "exercise_groups": [
    {
      "id": 229453,
      "section_number": 1,
      "type": 34,
      "title": "Questions 1-4 Complete the form below. Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.",
      "content": "Product Incident Report\nExample | Answer |\nProduct: | rice cooker |",
      "table_data": {
        "number_of_row": 4,
        "number_of_column": 2,
        "cells": [
          {
            "is_header": true,
            "data": [
              {
                "question_number": null,
                "is_input": false,
                "question_id": null,
                "value": "Model Number:"
              }
            ]
          },
          {
            "is_header": false,
            "data": [
              {
                "is_input": true,
                "question_id": 1175875,
                "value": "",
                "question_number": 1
              },
              {
                "is_input": false,
                "question_id": null,
                "value": "",
                "question_number": null
              }
            ]
          },
          {
            "is_header": true,
            "data": [
              {
                "question_number": null,
                "is_input": false,
                "question_id": null,
                "value": "Price of the Product:"
              }
            ]
          },
          {
            "is_header": false,
            "data": [
              {
                "is_input": false,
                "question_id": null,
                "value": "£",
                "question_number": null
              },
              {
                "is_input": true,
                "question_id": 1176319,
                "value": "",
                "question_number": 2
              },
              {
                "is_input": false,
                "question_id": null,
                "value": "",
                "question_number": null
              }
            ]
          },
          {
            "is_header": true,
            "data": [
              {
                "question_number": null,
                "is_input": false,
                "question_id": null,
                "value": "Name of the Branch:"
              }
            ]
          },
          {
            "is_header": false,
            "data": [
              {
                "is_input": true,
                "question_id": 1176320,
                "value": "",
                "question_number": 3
              },
              {
                "is_input": false,
                "question_id": null,
                "value": "",
                "question_number": null
              }
            ]
          },
          {
            "is_header": true,
            "data": [
              {
                "question_number": null,
                "is_input": false,
                "question_id": null,
                "value": "Problem:"
              }
            ]
          },
          {
            "is_header": false,
            "data": [
              {
                "is_input": true,
                "question_id": 1175879,
                "value": "",
                "question_number": 4
              },
              {
                "is_input": false,
                "question_id": null,
                "value": "",
                "question_number": null
              }
            ]
          }
        ]
      },
      "question_start": 1,
      "question_end": 4
    },
    {
      "id": 229454,
      "section_number": 1,
      "type": 34,
      "title": "Questions 5-10 Complete the form below. Write NO MORE THAN THREE WORDS AND/OR A NUMBER for each answer.",
      "content": "CUSTOMER’S INFORMATION DETAILS",
      "table_data": {
        "number_of_row": 7,
        "number_of_column": 2,
        "cells": [
          {
            "is_header": true,
            "data": [
              {
                "question_number": null,
                "is_input": false,
                "question_id": null,
                "value": "Name:"
              }
            ]
          },
          {
            "is_header": false,
            "data": [
              {
                "is_input": false,
                "question_id": null,
                "value": "Herbert Hewitt",
                "question_number": null
              }
            ]
          },
          {
            "is_header": true,
            "data": [
              {
                "question_number": null,
                "is_input": false,
                "question_id": null,
                "value": "Address:"
              }
            ]
          },
          {
            "is_header": false,
            "data": [
              {
                "is_input": true,
                "question_id": 1175880,
                "value": "",
                "question_number": 1
              },
              {
                "is_input": false,
                "question_id": null,
                "value": "",
                "question_number": null
              }
            ]
          },
          {
            "is_header": true,
            "data": [
              {
                "question_number": null,
                "is_input": false,
                "question_id": null,
                "value": "Postcode:"
              }
            ]
          },
          {
            "is_header": false,
            "data": [
              {
                "is_input": true,
                "question_id": 1175881,
                "value": "",
                "question_number": 2
              },
              {
                "is_input": false,
                "question_id": null,
                "value": "",
                "question_number": null
              }
            ]
          },
          {
            "is_header": true,
            "data": [
              {
                "question_number": null,
                "is_input": false,
                "question_id": null,
                "value": "Method of payment:"
              }
            ]
          },
          {
            "is_header": false,
            "data": [
              {
                "is_input": true,
                "question_id": 1175882,
                "value": "",
                "question_number": 3
              },
              {
                "is_input": false,
                "question_id": null,
                "value": "",
                "question_number": null
              }
            ]
          },
          {
            "is_header": true,
            "data": [
              {
                "question_number": null,
                "is_input": false,
                "question_id": null,
                "value": "Card’s Expiry Date:"
              }
            ]
          },
          {
            "is_header": false,
            "data": [
              {
                "is_input": true,
                "question_id": 1175883,
                "value": "",
                "question_number": 4
              },
              {
                "is_input": false,
                "question_id": null,
                "value": "",
                "question_number": null
              }
            ]
          },
          {
            "is_header": true,
            "data": [
              {
                "question_number": null,
                "is_input": false,
                "question_id": null,
                "value": "Method of Compensation:"
              }
            ]
          },
          {
            "is_header": false,
            "data": [
              {
                "is_input": true,
                "question_id": 1175884,
                "value": "",
                "question_number": 5
              },
              {
                "is_input": false,
                "question_id": null,
                "value": "",
                "question_number": null
              }
            ]
          },
          {
            "is_header": true,
            "data": [
              {
                "question_number": null,
                "is_input": false,
                "question_id": null,
                "value": "Shopping Frequency:"
              }
            ]
          },
          {
            "is_header": false,
            "data": [
              {
                "is_input": true,
                "question_id": 1175885,
                "value": "",
                "question_number": 6
              },
              {
                "is_input": false,
                "question_id": null,
                "value": "",
                "question_number": null
              }
            ]
          }
        ]
      },
      "question_start": 5,
      "question_end": 10
    },
    {
      "id": 229455,
      "section_number": 2,
      "type": 7,
      "title": "Questions 11-15 Listen to the directions and match the places in questions 11-15 to the appropriate place among A-E on the map.",
      "content": "",
      "table_data": null,
      "question_start": 11,
      "question_end": 15
    },
    {
      "id": 229456,
      "section_number": 2,
      "type": 1,
      "title": "Questions 16-20 Complete the sentences below. Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.",
      "content": "",
      "table_data": null,
      "question_start": 16,
      "question_end": 20
    },
    {
      "id": 229457,
      "section_number": 3,
      "type": 8,
      "title": "Questions 21-22 Choose the correct letters, A-C. According to Betty, which lines describe the sales of both cheese and oil in New Zealand and Colombia?",
      "content": "",
      "table_data": null,
      "question_start": 21,
      "question_end": 22
    },
    {
      "id": 229458,
      "section_number": 3,
      "type": 8,
      "title": "Questions 23-24 Choose the correct letters, A-E. Which TWO of the following are sales strategies for chocolate in Italy and Germany?",
      "content": "",
      "table_data": null,
      "question_start": 23,
      "question_end": 24
    },
    {
      "id": 229459,
      "section_number": 3,
      "type": 1,
      "title": "Questions 25-30 Complete the notes below. Write NO MORE THAN TWO WORDS for each answer.",
      "content": "Research plan",
      "table_data": null,
      "question_start": 25,
      "question_end": 30
    },
    {
      "id": 229460,
      "section_number": 4,
      "type": 34,
      "title": "Questions 31-37 Complete the table below. Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.",
      "content": "Talking about the history of bikes",
      "table_data": {
        "number_of_row": 5,
        "number_of_column": 4,
        "cells": [
          {
            "is_header": false,
            "data": [
              {
                "is_input": false,
                "question_id": null,
                "value": "Years/Time",
                "question_number": null
              }
            ]
          },
          {
            "is_header": false,
            "data": [
              {
                "is_input": false,
                "question_id": null,
                "value": "Feature",
                "question_number": null
              }
            ]
          },
          {
            "is_header": false,
            "data": [
              {
                "is_input": false,
                "question_id": null,
                "value": "Advantage",
                "question_number": null
              }
            ]
          },
          {
            "is_header": false,
            "data": [
              {
                "is_input": false,
                "question_id": null,
                "value": "Disadvantage",
                "question_number": null
              }
            ]
          },
          {
            "is_header": false,
            "data": [
              {
                "is_input": false,
                "question_id": null,
                "value": "1830s",
                "question_number": null
              }
            ]
          },
          {
            "is_header": false,
            "data": [
              {
                "is_input": false,
                "question_id": null,
                "value": "wooden wheels covered with metal",
                "question_number": null
              }
            ]
          },
          {
            "is_header": false,
            "data": [
              {
                "is_input": false,
                "question_id": null,
                "value": "need",
                "question_number": null
              },
              {
                "is_input": true,
                "question_id": 1175906,
                "value": "",
                "question_number": 1
              },
              {
                "is_input": false,
                "question_id": null,
                "value": "than walking",
                "question_number": null
              }
            ]
          },
          {
            "is_header": false,
            "data": [
              {
                "is_input": false,
                "question_id": null,
                "value": "quite",
                "question_number": null
              },
              {
                "is_input": true,
                "question_id": 1175907,
                "value": "",
                "question_number": 2
              },
              {
                "is_input": false,
                "question_id": null,
                "value": "",
                "question_number": null
              }
            ]
          },
          {
            "is_header": false,
            "data": [
              {
                "is_input": true,
                "question_id": 1175908,
                "value": "",
                "question_number": 3
              },
              {
                "is_input": false,
                "question_id": null,
                "value": "",
                "question_number": null
              }
            ]
          },
          {
            "is_header": false,
            "data": [
              {
                "is_input": false,
                "question_id": null,
                "value": "Chain and sprocket are",
                "question_number": null
              },
              {
                "is_input": true,
                "question_id": 1175909,
                "value": "",
                "question_number": 4
              },
              {
                "is_input": false,
                "question_id": null,
                "value": "",
                "question_number": null
              }
            ]
          },
          {
            "is_header": false,
            "data": [
              {
                "is_input": false,
                "question_id": null,
                "value": "easier and",
                "question_number": null
              },
              {
                "is_input": true,
                "question_id": 1175910,
                "value": "",
                "question_number": 5
              },
              {
                "is_input": false,
                "question_id": null,
                "value": "ride",
                "question_number": null
              }
            ]
          },
          {
            "is_header": false,
            "data": [
              {
                "is_input": false,
                "question_id": null,
                "value": "harder to balance",
                "question_number": null
              }
            ]
          },
          {
            "is_header": false,
            "data": [
              {
                "is_input": false,
                "question_id": null,
                "value": "1880s",
                "question_number": null
              }
            ]
          },
          {
            "is_header": false,
            "data": [
              {
                "is_input": false,
                "question_id": null,
                "value": "use",
                "question_number": null
              },
              {
                "is_input": true,
                "question_id": 1175911,
                "value": "",
                "question_number": 6
              },
              {
                "is_input": false,
                "question_id": null,
                "value": "",
                "question_number": null
              }
            ]
          },
          {
            "is_header": false,
            "data": [
              {
                "is_input": false,
                "question_id": null,
                "value": "more comfortable",
                "question_number": null
              }
            ]
          },
          {
            "is_header": false,
            "data": [
              {
                "is_input": false,
                "question_id": null,
                "value": "The faster you go, the more you feel every bump.",
                "question_number": null
              }
            ]
          },
          {
            "is_header": false,
            "data": [
              {
                "is_input": false,
                "question_id": null,
                "value": "1890s",
                "question_number": null
              }
            ]
          },
          {
            "is_header": false,
            "data": [
              {
                "is_input": false,
                "question_id": null,
                "value": "equal-sized wheels",
                "question_number": null
              }
            ]
          },
          {
            "is_header": false,
            "data": [
              {
                "is_input": true,
                "question_id": 1176321,
                "value": "",
                "question_number": 7
              },
              {
                "is_input": false,
                "question_id": null,
                "value": "",
                "question_number": null
              }
            ]
          },
          {
            "is_header": false,
            "data": [
              {
                "is_input": false,
                "question_id": null,
                "value": "dangerous before brakes appeared",
                "question_number": null
              }
            ]
          }
        ]
      },
      "question_start": 31,
      "question_end": 37
    },
    {
      "id": 229461,
      "section_number": 4,
      "type": 8,
      "title": "Questions 38-40 Choose THREE letters, A-F. The invention of different gears on a bicycle affected which THREE of the following?",
      "content": "",
      "table_data": null,
      "question_start": 38,
      "question_end": 40
    }
  ],
  "sections": [
    {
      "section_number": 1,
      "title": "Part 1",
      "audio_url": "https://storage.googleapis.com/prep-storage-service/lms/elements/IELTS-Recent-Actual-Test-With-Answers-Pr-2b2150e2.mp3",
      "playtime_string": "07:15",
      "duration_seconds": 435,
      "transcript_utterances": [
        {
          "id": 0,
          "speaker_id": 0,
          "speaker_name": "Narrator",
          "role": "Narrator",
          "text": "Section 1. You will hear a conversation between a customer service representative and a customer who demands a full refund. 1st, you have some time to look at questions 1 to 4. You will see that there is an example which has been done for you. On this occasion only, the conversation relating to this will be played 1st.",
          "start_timestamp": 480,
          "end_timestamp": 36040,
          "start_seconds": 0,
          "time_formatted": "0:00"
        },
        {
          "id": 1,
          "speaker_id": 1,
          "speaker_name": "Speaker 1",
          "role": "Speaker 1",
          "text": "Hello, and welcome to Under Pressure Enterprises customer service department. This is Kelly. How may I help you?",
          "start_timestamp": 39495,
          "end_timestamp": 45815,
          "start_seconds": 39,
          "time_formatted": "0:39"
        },
        {
          "id": 2,
          "speaker_id": 2,
          "speaker_name": "Speaker 2",
          "role": "Speaker 2",
          "text": "Yes. I'm calling about 1 of your rice cookers I just purchased.",
          "start_timestamp": 46215,
          "end_timestamp": 49655,
          "start_seconds": 46,
          "time_formatted": "0:46"
        },
        {
          "id": 3,
          "speaker_id": 0,
          "speaker_name": "Narrator",
          "role": "Narrator",
          "text": "The customer says that he is calling about 1 of the rice cookers he just purchased. So rice cooker has been written in the space. Now we shall begin. You should answer the questions as you listen because you will not hear the recording a 2nd time. Listen carefully and answer questions 1 to 4.",
          "start_timestamp": 52830,
          "end_timestamp": 73705,
          "start_seconds": 52,
          "time_formatted": "0:52"
        },
        {
          "id": 4,
          "speaker_id": 1,
          "speaker_name": "Speaker 1",
          "role": "Speaker 1",
          "text": "Hello, and welcome to Under Pressure Enterprises customer service department. This is Kelly. How may I help you?",
          "start_timestamp": 76905,
          "end_timestamp": 83160,
          "start_seconds": 76,
          "time_formatted": "1:16"
        },
        {
          "id": 5,
          "speaker_id": 2,
          "speaker_name": "Speaker 2",
          "role": "Speaker 2",
          "text": "Yes. I'm calling about 1 of your rice cookers I just purchased.",
          "start_timestamp": 83640,
          "end_timestamp": 87320,
          "start_seconds": 83,
          "time_formatted": "1:23"
        },
        {
          "id": 6,
          "speaker_id": 1,
          "speaker_name": "Speaker 1",
          "role": "Speaker 1",
          "text": "What seems to be the problem, sir?",
          "start_timestamp": 87720,
          "end_timestamp": 89320,
          "start_seconds": 87,
          "time_formatted": "1:27"
        },
        {
          "id": 7,
          "speaker_id": 2,
          "speaker_name": "Speaker 2",
          "role": "Speaker 2",
          "text": "Seems? There's no seeming about it. The blasted thing shoots hot steam all over the place. That's what. It nearly scalded my hand when I went to open it. Why, it could have killed the cat or something. It could have exploded and killed my wife and me.",
          "start_timestamp": 89880,
          "end_timestamp": 105515,
          "start_seconds": 89,
          "time_formatted": "1:29"
        },
        {
          "id": 8,
          "speaker_id": 1,
          "speaker_name": "Speaker 1",
          "role": "Speaker 1",
          "text": "Sir, sir, please calm down. As long as the steam escapes the cooker, it won't explode.",
          "start_timestamp": 106075,
          "end_timestamp": 111700,
          "start_seconds": 106,
          "time_formatted": "1:46"
        },
        {
          "id": 9,
          "speaker_id": 2,
          "speaker_name": "Speaker 2",
          "role": "Speaker 2",
          "text": "So you're telling me there's no problem? Are you calling me a liar?",
          "start_timestamp": 112100,
          "end_timestamp": 115940,
          "start_seconds": 112,
          "time_formatted": "1:52"
        },
        {
          "id": 10,
          "speaker_id": 1,
          "speaker_name": "Speaker 1",
          "role": "Speaker 1",
          "text": "Sir, no 1 is calling you a liar.",
          "start_timestamp": 116340,
          "end_timestamp": 118100,
          "start_seconds": 116,
          "time_formatted": "1:56"
        },
        {
          "id": 11,
          "speaker_id": 2,
          "speaker_name": "Speaker 2",
          "role": "Speaker 2",
          "text": "Yes. So I demand a full refund.",
          "start_timestamp": 118500,
          "end_timestamp": 121140,
          "start_seconds": 118,
          "time_formatted": "1:58"
        },
        {
          "id": 12,
          "speaker_id": 1,
          "speaker_name": "Speaker 1",
          "role": "Speaker 1",
          "text": "Under pressure, we'll be happy to refund your money, sir. Now I just need some basic information.",
          "start_timestamp": 121620,
          "end_timestamp": 126865,
          "start_seconds": 121,
          "time_formatted": "2:01"
        },
        {
          "id": 13,
          "speaker_id": 2,
          "speaker_name": "Speaker 2",
          "role": "Speaker 2",
          "text": "Okay. Okay. Sorry. I do tend to get a little hot under the collar. My wife tells me to slow down. So what do you need to know?",
          "start_timestamp": 127424,
          "end_timestamp": 136385,
          "start_seconds": 127,
          "time_formatted": "2:07"
        },
        {
          "id": 14,
          "speaker_id": 1,
          "speaker_name": "Speaker 1",
          "role": "Speaker 1",
          "text": "Sir, don't worry. I just need to ask you the model number of the cooker.",
          "start_timestamp": 136785,
          "end_timestamp": 140990,
          "start_seconds": 136,
          "time_formatted": "2:16"
        },
        {
          "id": 15,
          "speaker_id": 2,
          "speaker_name": "Speaker 2",
          "role": "Speaker 2",
          "text": "Where are my glasses? Ah, here. Let's see. Ah, it's R242.",
          "start_timestamp": 141390,
          "end_timestamp": 150430,
          "start_seconds": 141,
          "time_formatted": "2:21"
        },
        {
          "id": 16,
          "speaker_id": 1,
          "speaker_name": "Speaker 1",
          "role": "Speaker 1",
          "text": "R242. Okay. And how much did you pay for the product?",
          "start_timestamp": 150990,
          "end_timestamp": 155265,
          "start_seconds": 150,
          "time_formatted": "2:30"
        },
        {
          "id": 17,
          "speaker_id": 2,
          "speaker_name": "Speaker 2",
          "role": "Speaker 2",
          "text": "£89.99. It was on sale. I guess I should tell you.",
          "start_timestamp": 155905,
          "end_timestamp": 160785,
          "start_seconds": 155,
          "time_formatted": "2:35"
        },
        {
          "id": 18,
          "speaker_id": 1,
          "speaker_name": "Speaker 1",
          "role": "Speaker 1",
          "text": "Thank you. That's honest of you. Now where did you buy the cooker? Which store and which branch?",
          "start_timestamp": 161265,
          "end_timestamp": 167380,
          "start_seconds": 161,
          "time_formatted": "2:41"
        },
        {
          "id": 19,
          "speaker_id": 2,
          "speaker_name": "Speaker 2",
          "role": "Speaker 2",
          "text": "At that big electric life appliance store downtown.",
          "start_timestamp": 167860,
          "end_timestamp": 170660,
          "start_seconds": 167,
          "time_formatted": "2:47"
        },
        {
          "id": 20,
          "speaker_id": 1,
          "speaker_name": "Speaker 1",
          "role": "Speaker 1",
          "text": "The city center branch?",
          "start_timestamp": 171220,
          "end_timestamp": 172340,
          "start_seconds": 171,
          "time_formatted": "2:51"
        },
        {
          "id": 21,
          "speaker_id": 2,
          "speaker_name": "Speaker 2",
          "role": "Speaker 2",
          "text": "That's the 1.",
          "start_timestamp": 172740,
          "end_timestamp": 173460,
          "start_seconds": 172,
          "time_formatted": "2:52"
        },
        {
          "id": 22,
          "speaker_id": 1,
          "speaker_name": "Speaker 1",
          "role": "Speaker 1",
          "text": "And you say the problem is that the steam escapes?",
          "start_timestamp": 174020,
          "end_timestamp": 177220,
          "start_seconds": 174,
          "time_formatted": "2:54"
        },
        {
          "id": 23,
          "speaker_id": 2,
          "speaker_name": "Speaker 2",
          "role": "Speaker 2",
          "text": "Yes. It does.",
          "start_timestamp": 177700,
          "end_timestamp": 178580,
          "start_seconds": 177,
          "time_formatted": "2:57"
        },
        {
          "id": 24,
          "speaker_id": 1,
          "speaker_name": "Speaker 1",
          "role": "Speaker 1",
          "text": "No problem, sir. If there's steam escaping, clearly, the cooker is broken or defective. So we have an r 2 4 2 cooker with an escaping steam problem. It was bought from Electric Life City Center branch for $89.99. Is that correct?",
          "start_timestamp": 179220,
          "end_timestamp": 194845,
          "start_seconds": 179,
          "time_formatted": "2:59"
        },
        {
          "id": 25,
          "speaker_id": 2,
          "speaker_name": "Speaker 2",
          "role": "Speaker 2",
          "text": "Yes. That is correct.",
          "start_timestamp": 195770,
          "end_timestamp": 196970,
          "start_seconds": 195,
          "time_formatted": "3:15"
        },
        {
          "id": 26,
          "speaker_id": 1,
          "speaker_name": "Speaker 1",
          "role": "Speaker 1",
          "text": "Oh, I nearly forgot. When did you buy the cooker?",
          "start_timestamp": 197370,
          "end_timestamp": 200490,
          "start_seconds": 197,
          "time_formatted": "3:17"
        },
        {
          "id": 27,
          "speaker_id": 2,
          "speaker_name": "Speaker 2",
          "role": "Speaker 2",
          "text": "Just as soon as my wife got the crazy idea, she'll live longer if she stops eating good English food, roast beef, and mash. No. All she says she wants is rice and vegetables and sauces you'd not soak your feet in.",
          "start_timestamp": 200970,
          "end_timestamp": 215255,
          "start_seconds": 200,
          "time_formatted": "3:20"
        },
        {
          "id": 28,
          "speaker_id": 0,
          "speaker_name": "Narrator",
          "role": "Narrator",
          "text": "Before you hear the rest of the conversation, you have some time to look at questions 5 to 10. Now listen and answer questions 5 to 10.",
          "start_timestamp": 218935,
          "end_timestamp": 253060,
          "start_seconds": 218,
          "time_formatted": "3:38"
        },
        {
          "id": 29,
          "speaker_id": 1,
          "speaker_name": "Speaker 1",
          "role": "Speaker 1",
          "text": "Sir, sir, when did you buy it?",
          "start_timestamp": 256420,
          "end_timestamp": 258775,
          "start_seconds": 256,
          "time_formatted": "4:16"
        },
        {
          "id": 30,
          "speaker_id": 2,
          "speaker_name": "Speaker 2",
          "role": "Speaker 2",
          "text": "Oh, there I go again. Let's see. We bought it just 6 months ago. We hardly use it either. But 6 months, is that too long? I mean, for the warranty.",
          "start_timestamp": 259415,
          "end_timestamp": 271495,
          "start_seconds": 259,
          "time_formatted": "4:19"
        },
        {
          "id": 31,
          "speaker_id": 1,
          "speaker_name": "Speaker 1",
          "role": "Speaker 1",
          "text": "Very well. That's well within the warranty period. Now what's your name and address?",
          "start_timestamp": 271975,
          "end_timestamp": 276630,
          "start_seconds": 271,
          "time_formatted": "4:31"
        },
        {
          "id": 32,
          "speaker_id": 2,
          "speaker_name": "Speaker 2",
          "role": "Speaker 2",
          "text": "Name and address? What for?",
          "start_timestamp": 277190,
          "end_timestamp": 279510,
          "start_seconds": 277,
          "time_formatted": "4:37"
        },
        {
          "id": 33,
          "speaker_id": 1,
          "speaker_name": "Speaker 1",
          "role": "Speaker 1",
          "text": "Sir, it is company policy. If you want your money, you must inform me.",
          "start_timestamp": 280150,
          "end_timestamp": 284470,
          "start_seconds": 280,
          "time_formatted": "4:40"
        },
        {
          "id": 34,
          "speaker_id": 2,
          "speaker_name": "Speaker 2",
          "role": "Speaker 2",
          "text": "Money, you say? Oh, my name is Herbert Hewitt, and my address is 84 Park Road.",
          "start_timestamp": 284870,
          "end_timestamp": 292475,
          "start_seconds": 284,
          "time_formatted": "4:44"
        },
        {
          "id": 35,
          "speaker_id": 1,
          "speaker_name": "Speaker 1",
          "role": "Speaker 1",
          "text": "Is that here in Coventry?",
          "start_timestamp": 292875,
          "end_timestamp": 294234,
          "start_seconds": 292,
          "time_formatted": "4:52"
        },
        {
          "id": 36,
          "speaker_id": 2,
          "speaker_name": "Speaker 2",
          "role": "Speaker 2",
          "text": "Yes. The postal code is B0241DJ, but I don't think sending things in the mail is very secure or very efficient. I mean",
          "start_timestamp": 294634,
          "end_timestamp": 306740,
          "start_seconds": 294,
          "time_formatted": "4:54"
        },
        {
          "id": 37,
          "speaker_id": 1,
          "speaker_name": "Speaker 1",
          "role": "Speaker 1",
          "text": "Don't worry, mister Hewitt. Don't worry. We can credit the money to your credit card. You do have 1, don't you?",
          "start_timestamp": 307460,
          "end_timestamp": 313245,
          "start_seconds": 307,
          "time_formatted": "5:07"
        },
        {
          "id": 38,
          "speaker_id": 2,
          "speaker_name": "Speaker 2",
          "role": "Speaker 2",
          "text": "Yes. That's how we paid for the cooker.",
          "start_timestamp": 313645,
          "end_timestamp": 315965,
          "start_seconds": 313,
          "time_formatted": "5:13"
        },
        {
          "id": 39,
          "speaker_id": 1,
          "speaker_name": "Speaker 1",
          "role": "Speaker 1",
          "text": "Oh, yes. We still have the number on the computer. I only need to ask your card's expiry date.",
          "start_timestamp": 316365,
          "end_timestamp": 321485,
          "start_seconds": 316,
          "time_formatted": "5:16"
        },
        {
          "id": 40,
          "speaker_id": 2,
          "speaker_name": "Speaker 2",
          "role": "Speaker 2",
          "text": "I'm afraid I never give that sort of information out. I mean, once you have that, anyone could go charging things and",
          "start_timestamp": 321885,
          "end_timestamp": 329340,
          "start_seconds": 321,
          "time_formatted": "5:21"
        },
        {
          "id": 41,
          "speaker_id": 1,
          "speaker_name": "Speaker 1",
          "role": "Speaker 1",
          "text": "Sir, I said your expiry date, not your card's password.",
          "start_timestamp": 329900,
          "end_timestamp": 333900,
          "start_seconds": 329,
          "time_formatted": "5:29"
        },
        {
          "id": 42,
          "speaker_id": 2,
          "speaker_name": "Speaker 2",
          "role": "Speaker 2",
          "text": "Oh, yes. Foolish me. Of course, You didn't say password. Let's see. That will be April 2008.",
          "start_timestamp": 334300,
          "end_timestamp": 344314,
          "start_seconds": 334,
          "time_formatted": "5:34"
        },
        {
          "id": 43,
          "speaker_id": 1,
          "speaker_name": "Speaker 1",
          "role": "Speaker 1",
          "text": "April 2008. Very well. Your card still has nearly 2 months left to go. We'll get that refund right to you probably by 05:00 this evening.",
          "start_timestamp": 344715,
          "end_timestamp": 354049,
          "start_seconds": 344,
          "time_formatted": "5:44"
        },
        {
          "id": 44,
          "speaker_id": 2,
          "speaker_name": "Speaker 2",
          "role": "Speaker 2",
          "text": "You had better. If I don't get my money... Wait. Wait. Yes. I know I'm losing my temper again. I really am sorry. I haven't had my medicine today.",
          "start_timestamp": 354449,
          "end_timestamp": 366905,
          "start_seconds": 354,
          "time_formatted": "5:54"
        },
        {
          "id": 45,
          "speaker_id": 1,
          "speaker_name": "Speaker 1",
          "role": "Speaker 1",
          "text": "And, sir, just 1 more question for our records. How often do you go shopping at the city center branch?",
          "start_timestamp": 367465,
          "end_timestamp": 373465,
          "start_seconds": 367,
          "time_formatted": "6:07"
        },
        {
          "id": 46,
          "speaker_id": 2,
          "speaker_name": "Speaker 2",
          "role": "Speaker 2",
          "text": "Oh, well, it's hard to say. I suppose maybe once a month. But I can tell you this. If I don't get my refund, I'll never shop there again.",
          "start_timestamp": 373865,
          "end_timestamp": 384320,
          "start_seconds": 373,
          "time_formatted": "6:13"
        },
        {
          "id": 47,
          "speaker_id": 1,
          "speaker_name": "Speaker 1",
          "role": "Speaker 1",
          "text": "I think it's time to start looking for another job.",
          "start_timestamp": 386160,
          "end_timestamp": 389280,
          "start_seconds": 386,
          "time_formatted": "6:26"
        },
        {
          "id": 48,
          "speaker_id": 0,
          "speaker_name": "Narrator",
          "role": "Narrator",
          "text": "That is the end of section 1. You now have 0.5 a minute to check your answers. Now turn to section 2.",
          "start_timestamp": 392415,
          "end_timestamp": 428710,
          "start_seconds": 392,
          "time_formatted": "6:32"
        }
      ]
    },
    {
      "section_number": 2,
      "title": "Part 2",
      "audio_url": "https://storage.googleapis.com/prep-storage-service/lms/elements/IELTS-Recent-Actual-Test-With-Answers-Pr-7a3b5f12.mp3",
      "playtime_string": "08:23",
      "duration_seconds": 503,
      "transcript_utterances": [
        {
          "id": 0,
          "speaker_id": 0,
          "speaker_name": "Narrator",
          "role": "Narrator",
          "text": "Section 2. You hear a talk by a counsellor from the University of New South Wales who will introduce some useful facilities and services on the campus. 1st, you have some time to look at questions 11 to 15. Listen carefully and answer questions 11 to 15.",
          "start_timestamp": 560,
          "end_timestamp": 44725,
          "start_seconds": 0,
          "time_formatted": "0:00"
        },
        {
          "id": 1,
          "speaker_id": 1,
          "speaker_name": "Speaker 1",
          "role": "Speaker 1",
          "text": "Hello everyone and welcome to the University of New South Wales. The 1st thing I'd like to do at today's orientation session is get you all oriented. That means tell you the location of some useful facilities and services. So 1st of all, take out the maps we gave you all as you came in the door. The map is the big yellow sheet of paper. As you can see on the map, north is at the top, south at the bottom, etcetera. Which way is north? Well, look through that window on my left, your right. See the rising sun? That would have to be east. So north must be directly behind me. Now we're at the campus main gate. The recreational facilities are on my right hand and its opposite is the student center. No questions? Good. Pretty easy, right? Okay. Did everyone eat breakfast at the student food service this morning? Was the food good? Yes, yes, I am joking. I've eaten there too. So after a meal like that, you must be eager to go to a doctor, right? Well, I have good news for you. The Student Health Centre is located about 0.5 a kilometre straight north of here. Look on your maps. You see the street on the east side of this building? Ned Kelly Avenue? Just follow that about 500 meters, and the health center will be on your left at the 3rd Cross Street. Now, I know you all just got here. So you must be wondering how to tell your folks you've arrived safely, how much you miss the dog, and how you already need more money. If you don't have an iPhone, you probably are wondering where to find a computer. Well, I have good news. If you go straight out of its door and walk down the Garden Street, you'll see the Internet unit on your left side, just next to the gym. The hours are posted on the door and the computers are free, but you must bring your student ID card with you. Like I tell everyone, if you need help with anything, you can probably find right here in the student center. Do you see the 4 buildings there between the student center and the library? Those are the dormitories. The men's dorms are the 2 on the South, the women's the 2 on the North. Okay. I'm sorry to have to tell you, but the university has been doing a lot of repairs and remodeling and it's not all done yet. So there may be some small problems with your dorm rooms. Maybe the window doesn't open. Maybe an air conditioner is missing or does not work. If there are any problems, you can go to the complaint office, which is right beside the teaching building between the Parker Street and the Crammer Street. Just tell them your problem and they should have it fixed by the time you graduate in 4 years. I'm joking, but please be patient. There are a lot of little things they need to take care of. Tired of the school food? No? Give it a week. Or maybe you just need a place to get coffee in the wee hours of the night during 1 of those marathon study sessions. Either way, you definitely have to check out the little cafe just past the women's dormitories. They've got free Wi Fi, so a lot of students saddle up with coffee and a bagel for hours on end to get work done.",
          "start_timestamp": 47205,
          "end_timestamp": 249434,
          "start_seconds": 47,
          "time_formatted": "0:47"
        },
        {
          "id": 2,
          "speaker_id": 0,
          "speaker_name": "Narrator",
          "role": "Narrator",
          "text": "Before you hear the rest of the talk, you have some time to look at questions 16 to 20. Now listen and answer questions 16 to 20.",
          "start_timestamp": 252870,
          "end_timestamp": 288180,
          "start_seconds": 252,
          "time_formatted": "4:12"
        },
        {
          "id": 3,
          "speaker_id": 1,
          "speaker_name": "Speaker 1",
          "role": "Speaker 1",
          "text": "As for the dorm rooms, I have some bad news and some good news. The bad news is the rooms are small and you'll probably be sharing space with at least 3 students. The good news is that each room has its own bathroom. What's good about sharing a bathroom with 3 strangers? Good question. Okay, call it bad news and worse news. Hey, maybe try this for good news. Each dorm has a kitchen. If you want to make snacks or meals, you can do it there. You can buy food containers at any campus convenience store so you can store your food in the kitchen. But a word of warning, you should definitely write your name on your food containers. Sad to say, there are food thieves among your fellow students. Speaking of thieves, a word about security. I mean, this is Australia and we do get drunken bushrangers wandering onto campus. Each of you will be given a key for your dorm room. Don't lose it. You have to pay for any replacement and fill out a bunch of papers too. Red tape, Your key does not work for the front door of your dorm, however. To the right of each door, there's a keypad with numbers. When you move in, they will tell you the code you use to enter the door. Please do not tell the code to people who do not live in the dorm. Let's see. Have I forgotten anything? Oh yes, most of you are not rich, correct? So when your clothes get dirty, you can't just throw them away and buy new ones. That means you have to learn to do laundry. Or, men, that means you have to hurry up and get married. If you decide to wash those clothes and not get married, there are laundries in each dorm. Where? Oh, I almost forgot to tell you. The laundry for each dorm is in the basement. Some real good news this time if you're a student, it is free. You do have to buy your own soap, however. The laundry closes by the by at 11:30. And now that I've mentioned 11:30, please remember the dorm doors are locked at 11:30PM. Your code will not work. If you want to get in, you'll have to call the night watchman. Don't worry, you can get that number at the dorm office. Yes, the dorm office and the complaint office are the same office. Alright then, before we continue, are there any questions?",
          "start_timestamp": 291205,
          "end_timestamp": 461580,
          "start_seconds": 291,
          "time_formatted": "4:51"
        },
        {
          "id": 4,
          "speaker_id": 0,
          "speaker_name": "Narrator",
          "role": "Narrator",
          "text": "That is the end of section 2. You now have 0.5 a minute to check your answers. Now turn to section 3.",
          "start_timestamp": 464194,
          "end_timestamp": 501267,
          "start_seconds": 464,
          "time_formatted": "7:44"
        }
      ]
    },
    {
      "section_number": 3,
      "title": "Part 3",
      "audio_url": "https://storage.googleapis.com/prep-storage-service/lms/elements/IELTS-Recent-Actual-Test-With-Answers-Pr-cfcbeba0.mp3",
      "playtime_string": "06:24",
      "duration_seconds": 384,
      "transcript_utterances": [
        {
          "id": 0,
          "speaker_id": 0,
          "speaker_name": "Narrator",
          "role": "Narrator",
          "text": "Section 3. You will hear 2 students called Betty and Bruce talking to Professor Dundee about their own presentation. 1st, you have some time to look at questions 21 to to 24. Now listen carefully and answer questions 21 to 24.",
          "start_timestamp": 560,
          "end_timestamp": 45935,
          "start_seconds": 0,
          "time_formatted": "0:00"
        },
        {
          "id": 1,
          "speaker_id": 1,
          "speaker_name": "Speaker 1",
          "role": "Speaker 1",
          "text": "Come in.",
          "start_timestamp": 50015,
          "end_timestamp": 50415,
          "start_seconds": 50,
          "time_formatted": "0:50"
        },
        {
          "id": 2,
          "speaker_id": 2,
          "speaker_name": "Speaker 2",
          "role": "Speaker 2",
          "text": "Professor Dundee, we're ready to make our presentation.",
          "start_timestamp": 50895,
          "end_timestamp": 53534,
          "start_seconds": 50,
          "time_formatted": "0:50"
        },
        {
          "id": 3,
          "speaker_id": 1,
          "speaker_name": "Speaker 1",
          "role": "Speaker 1",
          "text": "Oh, yes. I did say 01:00, didn't I? Please sit down. So who goes 1st? Bruce or you, Betty?",
          "start_timestamp": 54620,
          "end_timestamp": 64860,
          "start_seconds": 54,
          "time_formatted": "0:54"
        },
        {
          "id": 4,
          "speaker_id": 2,
          "speaker_name": "Speaker 2",
          "role": "Speaker 2",
          "text": "I guess I could. Bruce is always little shy.",
          "start_timestamp": 65500,
          "end_timestamp": 68145,
          "start_seconds": 65,
          "time_formatted": "1:05"
        },
        {
          "id": 5,
          "speaker_id": 1,
          "speaker_name": "Speaker 1",
          "role": "Speaker 1",
          "text": "Not after he's had a lager for lunch, Bruce? No. Betty really should go 1st.",
          "start_timestamp": 68625,
          "end_timestamp": 75265,
          "start_seconds": 68,
          "time_formatted": "1:08"
        },
        {
          "id": 6,
          "speaker_id": 2,
          "speaker_name": "Speaker 2",
          "role": "Speaker 2",
          "text": "Okay. Well, I'm reporting on the effects of different marketing strategies on the cheese and oil markets. Different strategies obviously affect the sales volume differently. I looked at the sales in 2 countries, New Zealand and Colombia.",
          "start_timestamp": 76225,
          "end_timestamp": 90859,
          "start_seconds": 76,
          "time_formatted": "1:16"
        },
        {
          "id": 7,
          "speaker_id": 1,
          "speaker_name": "Speaker 1",
          "role": "Speaker 1",
          "text": "And what did you find? Pray, tell.",
          "start_timestamp": 91579,
          "end_timestamp": 94219,
          "start_seconds": 91,
          "time_formatted": "1:31"
        },
        {
          "id": 8,
          "speaker_id": 2,
          "speaker_name": "Speaker 2",
          "role": "Speaker 2",
          "text": "Well, in New Zealand, the sales of both oil and cheese have declined pretty steadily. And in fact, the sales have decreased more quickly than the population. On the other hand, in Colombia, the volume of sales for both products has remained the same.",
          "start_timestamp": 95195,
          "end_timestamp": 108875,
          "start_seconds": 95,
          "time_formatted": "1:35"
        },
        {
          "id": 9,
          "speaker_id": 1,
          "speaker_name": "Speaker 1",
          "role": "Speaker 1",
          "text": "Wait. So you said sales in New Zealand have been going down?",
          "start_timestamp": 109760,
          "end_timestamp": 114400,
          "start_seconds": 109,
          "time_formatted": "1:49"
        },
        {
          "id": 10,
          "speaker_id": 2,
          "speaker_name": "Speaker 2",
          "role": "Speaker 2",
          "text": "Correct. Suppliers have introduced 2 new upscale brands of each product, which are a bit expensive but very tasty. The big ad agencies are trying out a new series of ads that shift the focus from health to great taste. They think that will get sales moving up in New Zealand where the population is less affluent and generally less health conscious.",
          "start_timestamp": 115200,
          "end_timestamp": 137865,
          "start_seconds": 115,
          "time_formatted": "1:55"
        },
        {
          "id": 11,
          "speaker_id": 1,
          "speaker_name": "Speaker 1",
          "role": "Speaker 1",
          "text": "Brilliant. Thank you. And Bruce? Yeah. My report is about chocolate sales in Italy and Germany. The 2 countries marketers have found out that you have to market chocolate differently in each country. For example, in Italy, Kostig, the most expensive brand, pays shop owners to put the candy just about knee high for an adult. I don't see for little kids. That's about eye level. That bright red candy is the 1st 1 they see, so they buy it. Even better, they start telling their moms to buy it too. So you mean? Well, I mean, in Italy, if you locate your product at the right location of shelves, sales do great. They say it doesn't matter much what brand of chocolate you're selling. As for Germany, That's German. It means the land of chocolate. Germans love the stuff, so people make a joke and call Germany that. Oh, right. So you were saying, well, like you pointed out, Germans love chocolate, but they're thrifty. For a long time, the biggest selling brand was Schmutzig, mostly because it was the 2nd cheapest but didn't taste too bad.",
          "start_timestamp": 138745,
          "end_timestamp": 225585,
          "start_seconds": 138,
          "time_formatted": "2:18"
        },
        {
          "id": 12,
          "speaker_id": 0,
          "speaker_name": "Narrator",
          "role": "Narrator",
          "text": "Before you hear the rest of the talk, you have some time to look at questions 25 to 30. Now listen and answer questions 25 to 30.",
          "start_timestamp": 228800,
          "end_timestamp": 261309,
          "start_seconds": 228,
          "time_formatted": "3:48"
        },
        {
          "id": 13,
          "speaker_id": 1,
          "speaker_name": "Speaker 1",
          "role": "Speaker 1",
          "text": "Again, brilliant. A pretty good job, both of you. Tell me, what do you plan to investigate next week?",
          "start_timestamp": 264604,
          "end_timestamp": 271644,
          "start_seconds": 264,
          "time_formatted": "4:24"
        },
        {
          "id": 14,
          "speaker_id": 2,
          "speaker_name": "Speaker 2",
          "role": "Speaker 2",
          "text": "I'm especially interested in the effects of color on sales of products. So I'll be looking at ads for cosmetics and cleaning products in the local market. You know, like the distinct orange color of mister Muscle, lavatory cleaning products.",
          "start_timestamp": 272044,
          "end_timestamp": 285829,
          "start_seconds": 272,
          "time_formatted": "4:32"
        },
        {
          "id": 15,
          "speaker_id": 1,
          "speaker_name": "Speaker 1",
          "role": "Speaker 1",
          "text": "And you, Bruce? I'm focusing on the effects of different containers on sales of cookies. So I'm going to look into packaging for cookies and how the materials they use will affect the image and in turn sales. You know, most containers are paper, but some expensive cookies come in metal boxes. The shiny metal boxes catch people's attention and the image remains in the memory longer. Well, it sounds like you 2 are all set. But as always in this course, I urge you both to pay much more attention to the advertisement extensions. That's often the key. Alright. Any questions for me before you go?",
          "start_timestamp": 286629,
          "end_timestamp": 327885,
          "start_seconds": 286,
          "time_formatted": "4:46"
        },
        {
          "id": 16,
          "speaker_id": 2,
          "speaker_name": "Speaker 2",
          "role": "Speaker 2",
          "text": "No. I think I'm all set. Thanks.",
          "start_timestamp": 328285,
          "end_timestamp": 330285,
          "start_seconds": 328,
          "time_formatted": "5:28"
        },
        {
          "id": 17,
          "speaker_id": 1,
          "speaker_name": "Speaker 1",
          "role": "Speaker 1",
          "text": "Me too. Thanks, professor Dundee. See you later.",
          "start_timestamp": 330685,
          "end_timestamp": 333645,
          "start_seconds": 330,
          "time_formatted": "5:30"
        },
        {
          "id": 18,
          "speaker_id": 0,
          "speaker_name": "Narrator",
          "role": "Narrator",
          "text": "That is the end of section 3. You now have 0.5 a minute to check your answers. Now turn to section 4.",
          "start_timestamp": 336100,
          "end_timestamp": 372785,
          "start_seconds": 336,
          "time_formatted": "5:36"
        }
      ]
    },
    {
      "section_number": 4,
      "title": "Part 4",
      "audio_url": "https://storage.googleapis.com/prep-storage-service/lms/elements/IELTS-Recent-Actual-Test-With-Answers-Pr-f304acbe.mp3",
      "playtime_string": "07:05",
      "duration_seconds": 425,
      "transcript_utterances": [
        {
          "id": 0,
          "speaker_id": 0,
          "speaker_name": "Narrator",
          "role": "Narrator",
          "text": "Section 4. You will hear an introduction of the exhibition named 2 Centuries of the Bike. 1st, you have some time to look at questions 31 to 40. Now listen carefully and answer questions 31 to 40.",
          "start_timestamp": 960,
          "end_timestamp": 56330,
          "start_seconds": 0,
          "time_formatted": "0:00"
        },
        {
          "id": 1,
          "speaker_id": 1,
          "speaker_name": "Speaker 1",
          "role": "Speaker 1",
          "text": "Good afternoon, ladies and gentlemen. I'd like to take this opportunity to welcome you to our exhibition, 2 centuries of the bike. Let's stroll around the exhibition, shall we? Although there were a few early efforts back in the 17 hundreds, you didn't really see many bikes till, say, the 18 thirties in England. Bikes were a response to the rapid growth of cities early in the 19th century. Cities like London were getting too big to walk across. The early bike let people travel with less effort than walking. Plus, a bike was a lot cheaper than a horse. Think of it. No 1 invited a bike for, what, 5,000 of human history. Why did people do it then? Probably because this was the start of the machine age. People wanted machines to do all the work. There were some drawbacks, however. For 1 thing, there were no pedals. You simply pushed yourself along using your feet, kind of like today's skateboard. That meant you went fairly slow, and uphill, you actually worked harder pushing that 2 wheeler. Plus, the wheels were made of wood covered with metal as you can see from this model. So the downside was that the ride was quite uncomfortable on most roads. Only a few gadget lovers had or used them. By the 18 sixties though, improvements were being made. As you can see from this specimen, metal frames had become the rule. They're more durable than wood, and they don't warp in the rain. The biggest improvement, however, was the development of the chain and sprocket system. They're connected. This meant you did not push the bike. You used pedals just like today. You had to try harder to balance, so it took some practice to figure out how to use the pedals. But it made the ride so much easier. As a result, the good thing was that you could ride a lot more smoothly and with very little effort. By the 18 eighties, another big change was the use of rubber wheels. These became pretty common at that time. Though the 1st ones were solid rubber, the ride was a good deal more comfortable than the old iron and wood system. This is a big consideration because the faster you go, the more you feel every bump. Air filled tires, pneumatic tires, didn't really come into use till around the year 1900, as you can see from this exhibition over here. That made the ride even more comfortable. So by 1890 or so, people were going a lot faster and a lot more smoothly. There was 1 problem when you were going quickly and comfortably. Oh, no. How do I stop? Yes. We all laugh now. But for a long time, the only way to stop was to drag your feet. That didn't work very well, and it would be dangerous if you were going fast. In the crowded cities of those years, New York, Chicago, and so on, you'd get killed if you couldn't stop for, say, a street car. Plus, look at this bike. The front wheel is nearly a meter and 0.667 tall. They made them that way so you could see over people in wagons, but you couldn't drag your feet. This model is called a velocipede, a speed pedal. Another characteristic of the bike in this period is that it has 2 equal sized wheels which signaled a big change in bikes. For with the velocipede, brakes appeared. If you wanted to stop, you just pushed the pedal backwards. Doing that stopped the back wheel of the bike. This technique worked a lot better than dragging your feet or jumping off the high seat there. This meant that bikes became a great deal safer. It would have been safer if people wore helmets, but the 1st bicycle helmet wasn't invented until years later. And even then, it was little more than a leather ball cap. It really wasn't until the 19 seventies that the bike helmet was modified to provide some real protection. Before continuing on to look at developments since the 18 nineties, let's say a word more about safety. Everyone knows if you're going downhill, you can get going dangerously fast. To go more than a 100 kilometers an hour isn't all that difficult. But even on level ground, it's easy to go too quickly. On a city street, today's bicycles can be ridden at a speed of over 40 miles an hour over a short distance. That's about 64 kilometers an hour. Remember, you're on a bike, not in a car. There's nothing to protect you. People are killed in single bicycle accidents every day just from hitting the road. A good rule to remember is if you're going faster than the cars, slow down, And please wear a helmet. Nearly 0.25 of the epilepsy cases come from head injuries in accidents on bikes and motorcycles. I don't mean to scare you, but safety is everyone's business. What? Now that's a good question. Why are today's bikes so much faster? Well, it's not just that today's athletes are faster. The answer is partly mechanical. If you look closely here at the back wheel, you'll see a number of gears. Changing gears is what makes those fast speeds possible. You can shift gears depending on the terrain and how hard you wish to pedal. So you can put it on a higher gear for downhill and a lower gear for uphill travel to make it easier to climb that slope. You'll notice this gear shifting mechanism is attached to the back wheel. And when the rider shifts on the handlebar gear shifter, the chain moves to the appropriate sprocket. And speaking of changing gears, let's look over here at our Tour de France exhibit.",
          "start_timestamp": 59930,
          "end_timestamp": 385985,
          "start_seconds": 59,
          "time_formatted": "0:59"
        },
        {
          "id": 2,
          "speaker_id": 0,
          "speaker_name": "Narrator",
          "role": "Narrator",
          "text": "That is the end of section 4. You now have 0.5 a minute to check your answers. That is the end of the listening test.",
          "start_timestamp": 388980,
          "end_timestamp": 424850,
          "start_seconds": 388,
          "time_formatted": "6:28"
        }
      ]
    }
  ],
  "questions": [
    {
      "id": 1175875,
      "question_number": 1,
      "section_number": 1,
      "question_type": 34,
      "prompt": "{{R242}}",
      "options": [],
      "user_answer": "R242",
      "correct_answer": "R242",
      "is_correct": true,
      "explanation_4_steps": "### Bước 1 — Kiểm tra giới hạn số từ\n_Bắt đầu bằng cách kiểm tra hướng dẫn để biết câu trả lời của bạn được phép có bao nhiêu từ._\n**Hướng dẫn:**\n> The answer must be **NO MORE THAN TWO WORDS AND/OR A NUMBER**.\n**Quy tắc giới hạn số lượng từ:**\n- ✅ Tối đa hai từ\n- ✅ Một số đứng riêng\n- ✅ Tối đa hai từ + một số\n- ❌ Ba từ trở lên\n- ❌ Cách diễn đạt lại hoặc từ đồng nghĩa\n⚠️ *Viết quá số từ cho phép hoặc viết sai chính tả sẽ khiến câu trả lời bị tính là sai, ngay cả khi ý nghĩa đúng.*\n### Bước 2 — Đọc câu hỏi và làm nổi bật các từ khóa\n_Đọc lần lượt các cột để biết mỗi trường cần điền thông tin gì, sau đó tìm ô có chỗ trống._\n→ *Tiêu đề biểu mẫu: Yêu cầu hoàn tiền cho nồi cơm điện*\n**Cấu trúc bảng:**\n- Số model: mã hoặc ký hiệu của sản phẩm\n- Giá sản phẩm: số tiền đã trả\n- Tên chi nhánh: cửa hàng nào đã bán sản phẩm\n- Vấn đề: sản phẩm đang gặp vấn đề gì — chỗ trống nằm ở đây\n**Ô trong bảng:**\n> Model Number:\n> ............\n→ *Chỗ trống này nằm trong trường Số model; hãy nghe xem nhân viên yêu cầu mã sản phẩm.*\n### Bước 3 — Dự đoán loại từ\n_Xem các từ xung quanh chỗ trống và quyết định trước khi nghe xem cần điền loại từ nào._\nℹ️ *SỐ hoặc MÃ CHỮ-SỐ — số model của sản phẩm thường là sự kết hợp giữa chữ cái và chữ số.*\n### Bước 4 — Nghe và viết câu trả lời\n_Theo dõi biểu mẫu theo từng dòng và viết chính xác từ hoặc số được nói, đúng chính tả và trong giới hạn số từ._\nĐược xác định ở **bản ghi âm**:\n> \"Sir, don't worry. I just need to ask you the **model number** of the cooker.\"\n> \"Where are my glasses? Ah, here. Let's see. Ah, it's **R242**.\"\n→ *Nhân viên nói 'I just need to ask you the model number' trước khi khách hàng đưa ra mã.*\n**Ô đã hoàn thành:**\n> Model Number:\n> **R242**\n✅ **Đáp án: R242** — Nhân viên hỏi về \"the model number of the cooker\" và khách hàng trả lời bằng mã này.\n**Kiểm tra lại:**\n- ✅ Chính tả: 'R242' được viết chính xác như cách nó được nói.\n- ✅ Số từ: 1 từ.",
      "evidence_text": "Sir, don't worry. I just need to ask you the model number of the cooker.",
      "evidence_source_id": "14",
      "keywords_mapping": [
        {
          "original_text": "model number",
          "paraphrased_text": "Model Number",
          "mapping_type": "exact_phrase"
        }
      ]
    },
    {
      "id": 1176319,
      "question_number": 2,
      "section_number": 1,
      "question_type": 34,
      "prompt": "{{89.99}}",
      "options": [],
      "user_answer": "89.99",
      "correct_answer": "89.99",
      "is_correct": true,
      "explanation_4_steps": "### Bước 1 — Kiểm tra giới hạn số từ\n_Bắt đầu bằng cách kiểm tra hướng dẫn để biết câu trả lời được phép có bao nhiêu từ._\n**Hướng dẫn:**\n> The answer must be **NO MORE THAN TWO WORDS AND/OR A NUMBER**.\n**Quy tắc giới hạn số lượng từ:**\n- ✅ Tối đa hai từ\n- ✅ Một số đứng riêng\n- ✅ Tối đa hai từ + một số\n- ❌ Ba từ trở lên\n- ❌ Cách diễn đạt lại hoặc từ đồng nghĩa\n⚠️ *Viết quá giới hạn số từ hoặc viết sai chính tả khiến đáp án bị tính là sai, ngay cả khi ý nghĩa đúng.*\n### Bước 2 — Đọc câu hỏi và làm nổi bật các từ khóa\n_Đọc lần lượt các cột để biết mỗi trường chứa thông tin gì, sau đó tìm ô có chỗ trống._\n→ *Tiêu đề biểu mẫu: Yêu cầu hoàn tiền cho nồi cơm điện*\n**Cấu trúc bảng:**\n- Số model: mã hoặc số nhận diện sản phẩm\n- Giá sản phẩm: số tiền đã trả — đây là chỗ trống cần điền\n- Tên chi nhánh: địa điểm cửa hàng đã bán sản phẩm\n- Vấn đề: sản phẩm bị lỗi gì\n**Ô trong bảng:**\n> Price of the Product:\n> £............\n→ *Chỗ trống này nằm ở trường Giá; hãy nghe xem nhân viên hỏi khách hàng đã trả bao nhiêu tiền.*\n### Bước 3 — Dự đoán loại từ\n_Nhìn vào những từ xung quanh chỗ trống và quyết định trước khi nghe xem cần điền loại từ nào._\nℹ️ *SỐ (giá tiền) — ký hiệu bảng Anh đã được in sẵn, vì vậy chỗ trống cần số tiền bằng chữ số.*\n### Bước 4 — Nghe và viết đáp án\n_Điền vào biểu mẫu theo từng dòng và viết chính xác từ hoặc số được nói, đúng chính tả và trong giới hạn số từ._\nĐược xác định ở **bản ghi âm**:\n> \"**£89.99**. It was on sale. I guess I should tell you.\"\n> \"And **how much did you pay** for the product?\"\n| Manh mối trong câu hỏi | Cụm từ trong bản ghi âm | Liên hệ & lập luận |\n|---|---|---|\n| Price of the Product | \"how much did you pay\" | **✅** — Nhân viên hỏi \"how much did you pay for the product\", có nghĩa tương đương với nhãn của trường thông tin. |\n| 89.99 | \"£\" | **✅** — Khách hàng nêu giá tiền, bao gồm cả ký hiệu bảng Anh. |\n→ *Nhân viên hỏi 'how much did you pay for the product' ngay trước khi khách hàng đưa ra mức giá.*\n⚠️ *Khách hàng nói nồi cơm điện đang được giảm giá, nhưng mức giá được đưa ra là số tiền thực tế đã trả.*\n**Ô đã điền:**\n> Price of the Product:\n> £**89.99**\n✅ **Đáp án: 89.99** — Nhân viên hỏi \"how much did you pay for the product\" và khách hàng trả lời bằng số tiền đó.\n**Kiểm tra lại:**\n- ✅ Chính tả: '89.99' được viết đúng hoàn toàn như cách nó được nói.\n- ✅ Số từ: 1 số.",
      "evidence_text": "And how much did you pay for the product?",
      "evidence_source_id": "16",
      "keywords_mapping": [
        {
          "original_text": "how much did you pay",
          "paraphrased_text": "Price of the Product",
          "mapping_type": "rephrasing"
        }
      ]
    },
    {
      "id": 1176320,
      "question_number": 3,
      "section_number": 1,
      "question_type": 34,
      "prompt": "{{City Centre//City Center}}",
      "options": [],
      "user_answer": "City Centre",
      "correct_answer": "City Centre / City Center",
      "is_correct": true,
      "explanation_4_steps": "### Bước 1 — Kiểm tra giới hạn số lượng từ\n_Bắt đầu bằng cách kiểm tra hướng dẫn để biết câu trả lời của bạn được phép có bao nhiêu từ._\n**Hướng dẫn:**\n> The answer must be **NO MORE THAN TWO WORDS AND/OR A NUMBER**.\n**Quy tắc giới hạn số lượng từ:**\n- ✅ Tối đa hai từ\n- ✅ Một số đứng riêng\n- ✅ Tối đa hai từ + một số\n- ❌ Ba từ trở lên\n- ❌ Cách diễn đạt lại hoặc từ đồng nghĩa\n⚠️ *Việc vượt quá giới hạn số lượng từ hoặc viết sai chính tả khiến đáp án bị tính là sai, ngay cả khi ý nghĩa đúng.*\n### Bước 2 — Đọc câu hỏi và làm nổi bật các từ khóa\n_Đọc theo chiều ngang các cột để biết mỗi mục chứa thông tin gì, sau đó tìm ô có chỗ trống._\n→ *Tiêu đề biểu mẫu: Yêu cầu hoàn tiền cho nồi cơm điện*\n**Cấu trúc bảng:**\n- Số model: mã sản phẩm hoặc mã định danh\n- Giá sản phẩm: số tiền đã trả\n- Tên chi nhánh: cửa hàng ở địa điểm nào đã bán sản phẩm — đây là chỗ trống cần điền\n- Vấn đề: sản phẩm bị hỏng hoặc gặp vấn đề gì\n**Ô trong bảng:**\n> Name of the Branch:\n> ............\n→ *Chỗ trống này nằm trong mục Chi nhánh; hãy nghe xem nhân viên hỏi cửa hàng ở địa điểm nào đã bán chiếc nồi cơm điện.*\n### Bước 3 — Dự đoán loại từ\n_Nhìn vào các từ xung quanh chỗ trống và quyết định trước khi nghe xem cần điền loại từ nào._\nℹ️ *DANH TỪ RIÊNG (tên địa điểm) — tên chi nhánh thường xác định một địa điểm hoặc khu vực.*\n### Bước 4 — Nghe và viết đáp án\n_Theo dõi biểu mẫu theo từng dòng và viết chính xác từ hoặc số được nói, đúng chính tả và trong giới hạn số lượng từ._\nĐược xác định trong **bản ghi âm**:\n> \"**That's the one**.\"\n> \"The **city center branch**\"\n| Manh mối trong câu hỏi | Cụm từ trong bản ghi âm | Liên hệ & lập luận |\n|---|---|---|\n| City Center | \"That's the one\" | **✅** — Khách hàng xác nhận \"That's the one\" khi nhân viên nêu địa điểm. |\n→ *Nhân viên hỏi 'which store and which branch' rồi gợi ý địa điểm để xác nhận.*\n⚠️ *Khách hàng ban đầu nói tên cửa hàng Electric Life, nhưng chỗ trống yêu cầu tên chi nhánh, tức là địa điểm.*\n- ❌ 'Electric Life' là tên cửa hàng, không phải tên chi nhánh.\n- ❌ 'downtown' mô tả khu vực chung, không phải tên cụ thể của chi nhánh.\n**Ô đã hoàn thành:**\n> Name of the Branch:\n> **City Center**\n✅ **Đáp án: City Center** (cũng được chấp nhận: City Centre) — Nhân viên hỏi chi nhánh nào và gợi ý một địa điểm; khách hàng xác nhận bằng cách nói \"That's the one\".\n**Kiểm tra lại:**\n- ✅ Chính tả: 'City Center' được viết chính xác như cách nó được nói.\n- ✅ Số từ: 2 từ.",
      "evidence_text": "The city center branch?",
      "evidence_source_id": "20",
      "keywords_mapping": [
        {
          "original_text": "branch",
          "paraphrased_text": "Branch",
          "mapping_type": "exact_phrase"
        },
        {
          "original_text": "city center",
          "paraphrased_text": "Name",
          "mapping_type": "supporting_fact"
        }
      ]
    },
    {
      "id": 1175879,
      "question_number": 4,
      "section_number": 1,
      "question_type": 34,
      "prompt": "{{escaping steam//steam escapes}}",
      "options": [],
      "user_answer": "escaping steam",
      "correct_answer": "escaping steam / steam escapes",
      "is_correct": true,
      "explanation_4_steps": "### Bước 1 — Kiểm tra giới hạn số từ\n_Bắt đầu bằng cách kiểm tra hướng dẫn để biết câu trả lời của bạn được phép có bao nhiêu từ._\n**Hướng dẫn:**\n> The answer must be **NO MORE THAN TWO WORDS AND/OR A NUMBER**.\n**Quy tắc giới hạn số lượng từ:**\n- ✅ Tối đa hai từ\n- ✅ Một số đứng riêng\n- ✅ Tối đa hai từ + một số\n- ❌ Ba từ trở lên\n- ❌ Một cách diễn đạt lại hoặc từ đồng nghĩa\n⚠️ *Viết quá giới hạn số từ hoặc viết sai chính tả khiến đáp án bị tính là sai, ngay cả khi ý nghĩa đúng.*\n### Bước 2 — Đọc câu hỏi và làm nổi bật các từ khóa\n_Đọc các cột theo chiều ngang để biết mỗi ô chứa thông tin gì, sau đó tìm ô có chỗ trống._\n→ *Tiêu đề biểu mẫu: Yêu cầu hoàn tiền cho nồi cơm điện*\n**Cấu trúc bảng:**\n- Số model: mã hoặc ký hiệu nhận dạng của sản phẩm\n- Giá sản phẩm: số tiền đã trả\n- Tên chi nhánh: cửa hàng nào đã bán sản phẩm\n- Vấn đề: sản phẩm bị lỗi gì — chỗ trống nằm ở đây\n**Ô trong bảng:**\n> Problem:\n> ............\n→ *Chỗ trống này nằm trong mục Vấn đề; hãy nghe xem nhân viên xác nhận nồi cơm điện bị lỗi gì.*\n### Bước 3 — Dự đoán loại từ\n_Nhìn vào các từ xung quanh chỗ trống và quyết định trước khi nghe xem cần điền loại từ nào._\nℹ️ *CỤM DANH TỪ — mục này yêu cầu mô tả khiếm khuyết hoặc lỗi.*\n### Bước 4 — Nghe và viết đáp án\n_Theo dõi biểu mẫu theo từng dòng và viết chính xác từ hoặc số được nói, đúng chính tả và trong giới hạn số từ._\nĐược xác định ở **bản ghi âm**:\n> \"Sir, sir, please calm down. As long as the **steam escapes** the cooker, it won't explode.\"\n> \"And you say the **problem** is that the **steam escapes**?\"\n> \"If there's **steam escaping**, clearly, the cooker is broken or defective.\"\n| Manh mối trong câu hỏi | Cụm từ trong bản ghi âm | Liên hệ & lập luận |\n|---|---|---|\n| escaping steam | \"steam escaping\" | **✅** — Nhân viên dùng một trật tự từ khác để mô tả cùng một lỗi. |\n→ *Nhân viên hỏi 'you say the problem is that' trước khi nêu tên lỗi.*\n⚠️ *Trước tiên, khách hàng mô tả vấn đề bằng lời của mình, nói rằng hơi nóng bắn ra khắp nơi, nhưng sau đó nhân viên tóm tắt vấn đề theo cách kỹ thuật hơn.*\n- ❌ 'hot steam' là một phần trong lời phàn nàn của khách hàng, nhưng không phải cách mô tả vấn đề kỹ thuật mà nhân viên sử dụng.\n- ❌ 'broken or defective' mô tả tình trạng của nồi cơm điện, chứ không phải vấn đề cụ thể.\n**Ô đã hoàn chỉnh:**\n> Problem:\n> **steam escapes**\n✅ **Đáp án: steam escapes** (cũng được chấp nhận: escaping steam) — Nhân viên xác nhận \"the problem is that the steam escapes\" và sau đó nói \"steam escaping\"; cả hai đều mô tả cùng một lỗi.\n**Kiểm tra lại:**\n- ✅ Chính tả: 'steam escapes' được viết đúng như cách nó được nói.\n- ✅ Số từ: 2 từ.",
      "evidence_text": "And you say the problem is that the steam escapes?",
      "evidence_source_id": "22",
      "keywords_mapping": [
        {
          "original_text": "problem",
          "paraphrased_text": "Problem",
          "mapping_type": "exact_phrase"
        },
        {
          "original_text": "steam escapes",
          "paraphrased_text": "steam escapes",
          "mapping_type": "exact_phrase"
        }
      ]
    },
    {
      "id": 1175880,
      "question_number": 5,
      "section_number": 1,
      "question_type": 34,
      "prompt": "{{84 Park Road}}",
      "options": [],
      "user_answer": "84 Park Road",
      "correct_answer": "84 Park Road",
      "is_correct": true,
      "explanation_4_steps": "### Step 1 — Check the word limit\n_Start by checking the instruction to see how many words your answer can have._\n**Instructions:**\n> The answer must be **NO MORE THAN THREE WORDS AND/OR A NUMBER**.\n**Word limit rules:**\n- ✅ Up to three words\n- ✅ A number on its own\n- ✅ Up to three words + a number\n- ❌ Four or more words\n- ❌ A paraphrase or synonym\n⚠️ *Going over the word limit or mis-spelling the word makes the answer wrong, even when the meaning is right.*\n### Step 2 — Read the question and highlight keywords\n_Read across the form fields to see what each one asks for, then find the field with the gap._\n→ *Form title: Customer refund request details*\n**Table structure:**\n- Personal details: customer name, address, and postcode\n- Payment information: method of payment and card expiry date\n- Compensation details: method of compensation and shopping frequency\n**Table cell:**\n> Address:\n> ............\n→ *This blank is in the Address field; listen for the customer giving his home address.*\n### Step 3 — Predict the word form\n_Look at the field label and decide what kind of information belongs there before listening._\nℹ️ *NUMBER + NOUN (street address) — the field asks for the customer's home address, which typically includes a house number and street name.*\n### Step 4 — Listen and write the answer\n_Follow the form field by field and write the exact words or numbers that are said, spelled correctly and within the word limit._\nLocated in **the recording**:\n> \"Oh, my name is Herbert Hewitt, and **my address is 84 Park Road**.\"\n| Clue in the question | Phrase in the recording | Link & reasoning |\n|---|---|---|\n| Address: | \"my address is\" | **✅** — The customer states \"my address is 84 Park Road\", giving the exact address that fills the field. |\n→ *The representative asks 'what's your name and address?' which prompts the customer to give both pieces of information.*\n**Completed cell:**\n> Address:\n> **84 Park Road**\n✅ **Answer: 84 Park Road** — When asked for his name and address, the customer says \"my address is 84 Park Road\", so the address field is filled with those exact words.\n**Verification:**\n- ✅ Spelling: '84 Park Road' is written exactly as it is said.\n- ✅ Word count: 3 words, one of them a number.",
      "evidence_text": "Oh, my name is Herbert Hewitt, and my address is 84 Park Road.",
      "evidence_source_id": "34",
      "keywords_mapping": [
        {
          "original_text": "my address is 84 Park Road",
          "paraphrased_text": "Address: 84 Park Road",
          "mapping_type": "exact_phrase"
        }
      ]
    },
    {
      "id": 1175881,
      "question_number": 6,
      "section_number": 1,
      "question_type": 34,
      "prompt": "{{B0241DJ}}",
      "options": [],
      "user_answer": "B0241DJ",
      "correct_answer": "B0241DJ",
      "is_correct": true,
      "explanation_4_steps": "### Step 1 — Check the word limit\n_Start by checking the instruction to see how many words your answer can have._\n**Instructions:**\n> The answer must be **NO MORE THAN THREE WORDS AND/OR A NUMBER**.\n**Word limit rules:**\n- ✅ Up to three words\n- ✅ A number on its own\n- ✅ Up to three words + a number\n- ❌ Four or more words\n- ❌ A paraphrase or synonym\n⚠️ *Going over the word limit or mis-spelling the word makes the answer wrong, even when the meaning is right.*\n### Step 2 — Read the question and highlight keywords\n_Read across the form fields to see what each one asks for, then find the field with the gap._\n→ *Form title: Customer refund request details*\n**Table structure:**\n- Personal details: customer name, address, and postcode\n- Payment information: method of payment and card expiry date\n- Compensation details: method of compensation and shopping frequency\n**Table cell:**\n> Postcode:\n> ............\n→ *This blank is in the Postcode field; listen for the postal code after the address is given.*\n### Step 3 — Predict the word form\n_Look at the field label and decide what kind of information belongs there before listening._\nℹ️ *ALPHANUMERIC CODE — the field asks for a postal code, which is a combination of letters and numbers in a specific format.*\n### Step 4 — Listen and write the answer\n_Follow the form field by field and write the exact words or numbers that are said, spelled correctly and within the word limit._\nLocated in **the recording**:\n> \"Yes. **The postal code is B0241DJ**, but I don't think sending things in the mail is very secure or very efficient.\"\n| Clue in the question | Phrase in the recording | Link & reasoning |\n|---|---|---|\n| Postcode: | \"The postal code is\" | **✅** — \"The postal code is B0241DJ\" gives the exact code that fills the postcode field. |\n→ *The customer volunteers the postcode immediately after confirming the city, saying 'The postal code is'.*\n⚠️ *The postcode is given as a continuous string of letters and numbers; write it exactly as spoken without spaces.*\n**Completed cell:**\n> Postcode:\n> **B0241DJ**\n✅ **Answer: B0241DJ** — The customer states \"The postal code is B0241DJ\", providing the exact alphanumeric code for the postcode field.\n**Verification:**\n- ✅ Spelling: 'B0241DJ' is written exactly as it is said.\n- ✅ Word count: 1 word.",
      "evidence_text": "Yes. The postal code is B0241DJ, but I don't think sending things in the mail is very secure or very efficient.",
      "evidence_source_id": "36",
      "keywords_mapping": [
        {
          "original_text": "The postal code is B0241DJ",
          "paraphrased_text": "Postcode: B0241DJ",
          "mapping_type": "exact_phrase"
        }
      ]
    },
    {
      "id": 1175882,
      "question_number": 7,
      "section_number": 1,
      "question_type": 34,
      "prompt": "{{credit card}}",
      "options": [],
      "user_answer": "credit card",
      "correct_answer": "credit card",
      "is_correct": true,
      "explanation_4_steps": "### Step 1 — Check the word limit\n_Start by checking the instruction to see how many words your answer can have._\n**Instructions:**\n> The answer must be **NO MORE THAN THREE WORDS AND/OR A NUMBER**.\n**Word limit rules:**\n- ✅ Up to three words\n- ✅ A number on its own\n- ✅ Up to three words + a number\n- ❌ Four or more words\n- ❌ A paraphrase or synonym\n⚠️ *Going over the word limit or mis-spelling the word makes the answer wrong, even when the meaning is right.*\n### Step 2 — Read the question and highlight keywords\n_Read across the form fields to see what each one asks for, then find the field with the gap._\n→ *Form title: Customer refund request details*\n**Table structure:**\n- Personal details: customer name, address, and postcode\n- Payment information: method of payment and card expiry date\n- Compensation details: method of compensation and shopping frequency\n**Table cell:**\n> Method of payment:\n> ............\n→ *This blank is in the Method of payment field; listen for how the customer originally paid for the rice cooker.*\n### Step 3 — Predict the word form\n_Look at the field label and decide what kind of information belongs there before listening._\nℹ️ *NOUN (payment type) — the field asks for the type of payment used, such as cash, card, or another payment method.*\n### Step 4 — Listen and write the answer\n_Follow the form field by field and write the exact words or numbers that are said, spelled correctly and within the word limit._\nLocated in **the recording**:\n> \"Don't worry, mister Hewitt. Don't worry. We can credit the money to **your credit card**. You do have 1, don't you?\"\n> \"Yes. That's **how we paid** for the cooker.\"\n| Clue in the question | Phrase in the recording | Link & reasoning |\n|---|---|---|\n| Method of payment: | \"your\" | **✅** — The representative mentions \"your credit card\" when discussing how to return the money. |\n→ *The representative asks 'You do have one, don't you?' referring to the card, and the customer confirms 'That's how we paid for the cooker'.*\n**Completed cell:**\n> Method of payment:\n> **credit card**\n✅ **Answer: credit card** — The representative mentions crediting money to \"your credit card\" and the customer confirms that is \"how we paid\" for the cooker, so the payment method is ______.\n**Verification:**\n- ✅ Spelling: 'credit card' is written exactly as it is said.\n- ✅ Word count: 2 words.",
      "evidence_text": "Don't worry, mister Hewitt. Don't worry. We can credit the money to your credit card. You do have 1, don't you?",
      "evidence_source_id": "37",
      "keywords_mapping": [
        {
          "original_text": "your credit card",
          "paraphrased_text": "Method of payment: credit card",
          "mapping_type": "rephrasing"
        }
      ]
    },
    {
      "id": 1175883,
      "question_number": 8,
      "section_number": 1,
      "question_type": 34,
      "prompt": "{{April 2008}}",
      "options": [],
      "user_answer": "April 2008",
      "correct_answer": "April 2008",
      "is_correct": true,
      "explanation_4_steps": "### Step 1 — Check the word limit\n_Start by checking the instruction to see how many words your answer can have._\n**Instructions:**\n> The answer must be **NO MORE THAN THREE WORDS AND/OR A NUMBER**.\n**Word limit rules:**\n- ✅ Up to three words\n- ✅ A number on its own\n- ✅ Up to three words + a number\n- ❌ Four or more words\n- ❌ A paraphrase or synonym\n⚠️ *Going over the word limit or mis-spelling the word makes the answer wrong, even when the meaning is right.*\n### Step 2 — Read the question and highlight keywords\n_Read across the form fields to see what each one asks for, then find the field with the gap._\n→ *Form title: Customer refund request details*\n**Table structure:**\n- Personal details: customer name, address, and postcode\n- Payment information: method of payment and card expiry date\n- Compensation details: method of compensation and shopping frequency\n**Table cell:**\n> Card’s Expiry Date:\n> ............\n→ *This blank is in the Card's Expiry Date field; listen for when the customer's card expires.*\n### Step 3 — Predict the word form\n_Look at the field label and decide what kind of information belongs there before listening._\nℹ️ *MONTH + YEAR — the field asks for a date in the format of a month name and a year number.*\n### Step 4 — Listen and write the answer\n_Follow the form field by field and write the exact words or numbers that are said, spelled correctly and within the word limit._\nLocated in **the recording**:\n> \"Let's see. **That will be April 2008**.\"\n| Clue in the question | Phrase in the recording | Link & reasoning |\n|---|---|---|\n| Card's Expiry Date: | \"That will be\" | **✅** — The customer states \"That will be April 2008\", giving the exact expiry date that fills the field. |\n→ *The representative asks 'I only need to ask your card's expiry date', which prompts the customer to provide the information.*\n**Completed cell:**\n> Card’s Expiry Date:\n> **April 2008**\n✅ **Answer: April 2008** — When asked for the card's expiry date, the customer responds \"That will be April 2008\", providing the exact month and year.\n**Verification:**\n- ✅ Spelling: 'April 2008' is written exactly as it is said.\n- ✅ Word count: 2 words, one of them a number.",
      "evidence_text": "Let's see. That will be April 2008.",
      "evidence_source_id": "42",
      "keywords_mapping": [
        {
          "original_text": "That will be April 2008",
          "paraphrased_text": "Card's Expiry Date: April 2008",
          "mapping_type": "rephrasing"
        }
      ]
    },
    {
      "id": 1175884,
      "question_number": 9,
      "section_number": 1,
      "question_type": 34,
      "prompt": "{{refund}}",
      "options": [],
      "user_answer": "ggfas",
      "correct_answer": "refund",
      "is_correct": false,
      "explanation_4_steps": "### Step 1 — Check the word limit\n_Start by checking the instruction to see how many words your answer can have._\n**Instructions:**\n> The answer must be **NO MORE THAN THREE WORDS AND/OR A NUMBER**.\n**Word limit rules:**\n- ✅ Up to three words\n- ✅ A number on its own\n- ✅ Up to three words + a number\n- ❌ Four or more words\n- ❌ A paraphrase or synonym\n⚠️ *Going over the word limit or mis-spelling the word makes the answer wrong, even when the meaning is right.*\n### Step 2 — Read the question and highlight keywords\n_Read across the form fields to see what each one asks for, then find the field with the gap._\n→ *Form title: Customer refund request details*\n**Table structure:**\n- Personal details: customer name, address, and postcode\n- Payment information: method of payment and card expiry date\n- Compensation details: method of compensation and shopping frequency\n**Table cell:**\n> Method of Compensation:\n> ............\n→ *This blank is in the Method of Compensation field; listen for how the company will compensate the customer for the faulty product.*\n### Step 3 — Predict the word form\n_Look at the field label and decide what kind of information belongs there before listening._\nℹ️ *NOUN (compensation type) — the field asks for the type of compensation being offered, such as replacement, repair, or money back.*\n### Step 4 — Listen and write the answer\n_Follow the form field by field and write the exact words or numbers that are said, spelled correctly and within the word limit._\nLocated in **the recording**:\n> \"We'll get **that refund** right to you probably by 05:00 this evening.\"\n| Clue in the question | Phrase in the recording | Link & reasoning |\n|---|---|---|\n| Method of Compensation: | \"that\" | **✅** — The representative promises \"that refund\" will be sent to the customer, naming the compensation type. |\n→ *The representative says 'We'll get that refund right to you', confirming the compensation method.*\n**Completed cell:**\n> Method of Compensation:\n> **refund**\n✅ **Answer: refund** — The representative states \"We'll get that refund right to you\", so the method of compensation is ______.\n**Verification:**\n- ✅ Spelling: 'refund' is written exactly as it is said.\n- ✅ Word count: 1 word.",
      "evidence_text": "We'll get that refund right to you probably by 05:00 this evening.",
      "evidence_source_id": "43",
      "keywords_mapping": [
        {
          "original_text": "that refund",
          "paraphrased_text": "Method of Compensation: refund",
          "mapping_type": "rephrasing"
        }
      ]
    },
    {
      "id": 1175885,
      "question_number": 10,
      "section_number": 1,
      "question_type": 34,
      "prompt": "{{once a month}}",
      "options": [],
      "user_answer": "ffasfsaf",
      "correct_answer": "once a month",
      "is_correct": false,
      "explanation_4_steps": "### Step 1 — Check the word limit\n_Start by checking the instruction to see how many words your answer can have._\n**Instructions:**\n> The answer must be **NO MORE THAN THREE WORDS AND/OR A NUMBER**.\n**Word limit rules:**\n- ✅ Up to three words\n- ✅ A number on its own\n- ✅ Up to three words + a number\n- ❌ Four or more words\n- ❌ A paraphrase or synonym\n⚠️ *Going over the word limit or mis-spelling the word makes the answer wrong, even when the meaning is right.*\n### Step 2 — Read the question and highlight keywords\n_Read across the form fields to see what each one asks for, then find the field with the gap._\n→ *Form title: Customer refund request details*\n**Table structure:**\n- Personal details: customer name, address, and postcode\n- Payment information: method of payment and card expiry date\n- Compensation details: method of compensation and shopping frequency\n**Table cell:**\n> Shopping Frequency:\n> ............\n→ *This blank is in the Shopping Frequency field; listen for how often the customer shops at the city center branch.*\n### Step 3 — Predict the word form\n_Look at the field label and decide what kind of information belongs there before listening._\nℹ️ *FREQUENCY PHRASE — the field asks for how often something happens, typically expressed as a number plus a time period.*\n### Step 4 — Listen and write the answer\n_Follow the form field by field and write the exact words or numbers that are said, spelled correctly and within the word limit._\nLocated in **the recording**:\n> \"Oh, well, it's hard to say. **I suppose maybe once a month**.\"\n| Clue in the question | Phrase in the recording | Link & reasoning |\n|---|---|---|\n| Shopping Frequency: | \"I suppose maybe\" | **✅** — The customer says \"I suppose maybe once a month\", giving the frequency that fills the field. |\n→ *The representative asks 'How often do you go shopping at the city center branch?', which prompts the customer to estimate the frequency.*\n⚠️ *The customer hesitates and says 'it's hard to say' before giving the frequency; listen for the actual answer after this uncertainty.*\n**Completed cell:**\n> Shopping Frequency:\n> **once a month**\n✅ **Answer: once a month** — When asked how often he shops at the city center branch, the customer replies \"I suppose maybe once a month\", providing the exact frequency.\n**Verification:**\n- ✅ Spelling: 'once a month' is written exactly as it is said.\n- ✅ Word count: 3 words.",
      "evidence_text": "Oh, well, it's hard to say. I suppose maybe once a month.",
      "evidence_source_id": "46",
      "keywords_mapping": [
        {
          "original_text": "I suppose maybe once a month",
          "paraphrased_text": "Shopping Frequency: once a month",
          "mapping_type": "rephrasing"
        }
      ]
    },
    {
      "id": 1175886,
      "question_number": 11,
      "section_number": 2,
      "question_type": 7,
      "prompt": "Student Centre",
      "options": [
        {
          "key": "A",
          "text": "A"
        },
        {
          "key": "B",
          "text": "B"
        },
        {
          "key": "C",
          "text": "C"
        },
        {
          "key": "D",
          "text": "D"
        },
        {
          "key": "E",
          "text": "E"
        }
      ],
      "user_answer": "A",
      "correct_answer": "E",
      "is_correct": false,
      "explanation_4_steps": "### Step 1 — Read the instruction and the letters\n_Read the instruction and note that the answer is a letter and that five places are marked on the map._\n**Instructions:**\n> Questions 11-15 Listen to the directions and match the places in questions 11-15 to the appropriate place among A-E on the map.\n**What the instruction tells you:**\n- ℹ️ The answer is a single LETTER (A to E), not a word\n- ℹ️ 5 places are marked on the plan (A to E)\n- ℹ️ Each letter is used only once.\n### Step 2 — Study the map\n_Find the main gate at the bottom of the map and identify the fixed landmarks — the Recreational Facilities, the Library, the Teaching Building, the Gym, and the Dormitories — so the directions can be followed._\n→ *University of New South Wales campus — the main gate is at the bottom, with the Recreational Facilities to the right, the Library and Dormitories on the left, the Teaching Building in the centre, and the Gym at the top along Garden Street.*\n**This question:**\n> Where is the **Student Centre**?\nℹ️ *Begin at the main gate and listen for directions that place the Student Centre opposite the Recreational Facilities.*\n### Step 3 — Listen and locate the place\n_Listen for the directions to the Student Centre, find the landmark that fixes its position, then choose the matching letter._\nLocated in **the recording**:\n> \"main gate\"\n> \"The recreational facilities are on my right hand and its **opposite is the student center**.\"\n| Place to find | Directions in the recording | Link & reasoning |\n|---|---|---|\n| Student Centre | \"opposite is the student center\" | **✅** — The speaker says \"its opposite is the student center\", referring to the Recreational Facilities on the right of the main gate. |\n✅ **Answer: E** — The counsellor explains that the Recreational Facilities are on the right hand from the main gate and \"its opposite is the student center\", which places the Student Centre at position E.",
      "evidence_text": "The recreational facilities are on my right hand and its opposite is the student center.",
      "evidence_source_id": "1",
      "keywords_mapping": [
        {
          "original_text": "The recreational facilities are on my right hand and its opposite is the student center",
          "paraphrased_text": "Student Centre",
          "mapping_type": "supporting_fact"
        },
        {
          "original_text": "the student center",
          "paraphrased_text": "Student Centre",
          "mapping_type": "exact_phrase"
        }
      ]
    },
    {
      "id": 1175887,
      "question_number": 12,
      "section_number": 2,
      "question_type": 7,
      "prompt": "Health Centre",
      "options": [
        {
          "key": "A",
          "text": "A"
        },
        {
          "key": "B",
          "text": "B"
        },
        {
          "key": "C",
          "text": "C"
        },
        {
          "key": "D",
          "text": "D"
        },
        {
          "key": "E",
          "text": "E"
        }
      ],
      "user_answer": "A",
      "correct_answer": "A",
      "is_correct": true,
      "explanation_4_steps": "### Step 1 — Read the instruction and the letters\n_Read the instruction and note that the answer is a letter and that five places are marked on the map._\n**Instructions:**\n> Questions 11-15 Listen to the directions and match the places in questions 11-15 to the appropriate place among A-E on the map.\n**What the instruction tells you:**\n- ℹ️ The answer is a single LETTER (A to E), not a word\n- ℹ️ 5 places are marked on the plan (A to E)\n- ℹ️ Each letter is used only once.\n### Step 2 — Study the map\n_Find the main gate at the bottom of the map and identify the fixed landmarks — the Recreational Facilities, the Library, the Teaching Building, the Gym, and the Dormitories — so the directions can be followed._\n→ *University of New South Wales campus — the main gate is at the bottom, with the Recreational Facilities to the right, the Library and Dormitories on the left, the Teaching Building in the centre, and the Gym at the top along Garden Street.*\n**This question:**\n> Where is the **Health Centre**?\nℹ️ *Begin at the main gate and listen for directions north along Ned Kelly Avenue to the third cross street, where the Health Centre will be on the left.*\n### Step 3 — Listen and locate the place\n_Listen for the directions to the Health Centre, find the landmark that fixes its position, then choose the matching letter._\nLocated in **the recording**:\n> \"The **Student Health Centre** is located about 0.5 a kilometre straight north of here.\"\n> \"Just follow that about 500 meters, and the health center will be on your left at the 3rd Cross Street.\"\n| Place to find | Directions in the recording | Link & reasoning |\n|---|---|---|\n| Health Centre | \"Student Health Centre\" | **✅** — The speaker names the place \"Student Health Centre\", which matches the question exactly. |\n✅ **Answer: A** — The counsellor directs students \"straight north\" from the main gate along Ned Kelly Avenue for 500 meters, and the Health Centre will be \"on your left at the 3rd Cross Street\", which is position A.",
      "evidence_text": "The Student Health Centre is located about 0.5 a kilometre straight north of here.",
      "evidence_source_id": "1",
      "keywords_mapping": [
        {
          "original_text": "located about 0.5 a kilometre straight north of here",
          "paraphrased_text": "Health Centre",
          "mapping_type": "supporting_fact"
        },
        {
          "original_text": "The Student Health Centre",
          "paraphrased_text": "Health Centre",
          "mapping_type": "exact_phrase"
        }
      ]
    },
    {
      "id": 1175888,
      "question_number": 13,
      "section_number": 2,
      "question_type": 7,
      "prompt": "Internet Unit",
      "options": [
        {
          "key": "A",
          "text": "A"
        },
        {
          "key": "B",
          "text": "B"
        },
        {
          "key": "C",
          "text": "C"
        },
        {
          "key": "D",
          "text": "D"
        },
        {
          "key": "E",
          "text": "E"
        }
      ],
      "user_answer": "A",
      "correct_answer": "B",
      "is_correct": false,
      "explanation_4_steps": "### Step 1 — Read the instruction and the letters\n_Read the instruction and note that the answer is a letter and that five places are marked on the map._\n**Instructions:**\n> Questions 11-15 Listen to the directions and match the places in questions 11-15 to the appropriate place among A-E on the map.\n**What the instruction tells you:**\n- ℹ️ The answer is a single LETTER (A to E), not a word\n- ℹ️ 5 places are marked on the plan (A to E)\n- ℹ️ Each letter is used only once.\n### Step 2 — Study the map\n_Find the main gate at the bottom of the map and identify the fixed landmarks — the Recreational Facilities, the Library, the Teaching Building, the Gym, and the Dormitories — so the directions can be followed._\n→ *University of New South Wales campus — the main gate is at the bottom, with the Recreational Facilities to the right, the Library and Dormitories on the left, the Teaching Building in the centre, and the Gym at the top along Garden Street.*\n**This question:**\n> Where is the **Internet Unit**?\nℹ️ *Begin at the main gate and listen for directions along Garden Street, where the Internet Unit will be on the left next to the Gym.*\n### Step 3 — Listen and locate the place\n_Listen for the directions to the Internet Unit, find the landmark that fixes its position, then choose the matching letter._\nLocated in **the recording**:\n> \"b\"\n> \"If you go straight out of its door and walk down the Garden Street, you'll see the **Internet unit** on your left side, just next to the gym.\"\n✅ **Answer: B** — The counsellor says to walk down Garden Street and \"you'll see the Internet unit on your left side, just next to the gym\", which places it at position B.",
      "evidence_text": "If you go straight out of its door and walk down the Garden Street, you'll see the Internet unit on your left side, just next to the gym.",
      "evidence_source_id": "1",
      "keywords_mapping": [
        {
          "original_text": "Internet unit",
          "paraphrased_text": "Internet Unit",
          "mapping_type": "exact_phrase"
        },
        {
          "original_text": "go straight out of its door and walk down the Garden Street",
          "paraphrased_text": "Internet Unit",
          "mapping_type": "supporting_fact"
        },
        {
          "original_text": "on your left side, just next to the gym",
          "paraphrased_text": "Internet Unit",
          "mapping_type": "supporting_fact"
        }
      ]
    },
    {
      "id": 1175889,
      "question_number": 14,
      "section_number": 2,
      "question_type": 7,
      "prompt": "Complaint Office",
      "options": [
        {
          "key": "A",
          "text": "A"
        },
        {
          "key": "B",
          "text": "B"
        },
        {
          "key": "C",
          "text": "C"
        },
        {
          "key": "D",
          "text": "D"
        },
        {
          "key": "E",
          "text": "E"
        }
      ],
      "user_answer": "E",
      "correct_answer": "D",
      "is_correct": false,
      "explanation_4_steps": "### Step 1 — Read the instruction and the letters\n_Read the instruction and note that the answer is a letter and that five places are marked on the map._\n**Instructions:**\n> Questions 11-15 Listen to the directions and match the places in questions 11-15 to the appropriate place among A-E on the map.\n**What the instruction tells you:**\n- ℹ️ The answer is a single LETTER (A to E), not a word\n- ℹ️ 5 places are marked on the plan (A to E)\n- ℹ️ Each letter is used only once.\n### Step 2 — Study the map\n_Find the main gate at the bottom of the map and identify the fixed landmarks — the Recreational Facilities, the Library, the Teaching Building, the Gym, and the Dormitories — so the directions can be followed._\n→ *University of New South Wales campus — the main gate is at the bottom, with the Recreational Facilities to the right, the Library and Dormitories on the left, the Teaching Building in the centre, and the Gym at the top along Garden Street.*\n**This question:**\n> Where is the **Complaint Office**?\nℹ️ *Begin at the main gate and listen for directions to the Teaching Building between Parker Street and Crammer Street, where the Complaint Office is beside it.*\n### Step 3 — Listen and locate the place\n_Listen for the directions to the Complaint Office, find the landmark that fixes its position, then choose the matching letter._\nLocated in **the recording**:\n> \"you can go to the **complaint office**, which is right beside the teaching building between the Parker Street and the Crammer Street.\"\n✅ **Answer: D** — The counsellor explains that the Complaint Office is \"right beside the teaching building between the Parker Street and the Crammer Street\", which is position D.",
      "evidence_text": "you can go to the complaint office, which is right beside the teaching building between the Parker Street and the Crammer Street.",
      "evidence_source_id": "1",
      "keywords_mapping": [
        {
          "original_text": "complaint office",
          "paraphrased_text": "Complaint Office",
          "mapping_type": "exact_phrase"
        },
        {
          "original_text": "right beside the teaching building between the Parker Street and the Crammer Street",
          "paraphrased_text": "Complaint Office",
          "mapping_type": "supporting_fact"
        }
      ]
    },
    {
      "id": 1175890,
      "question_number": 15,
      "section_number": 2,
      "question_type": 7,
      "prompt": "Cafe",
      "options": [
        {
          "key": "A",
          "text": "A"
        },
        {
          "key": "B",
          "text": "B"
        },
        {
          "key": "C",
          "text": "C"
        },
        {
          "key": "D",
          "text": "D"
        },
        {
          "key": "E",
          "text": "E"
        }
      ],
      "user_answer": "B",
      "correct_answer": "C",
      "is_correct": false,
      "explanation_4_steps": "### Step 1 — Read the instruction and the letters\n_Read the instruction and note that the answer is a letter and that five places are marked on the map._\n**Instructions:**\n> Questions 11-15 Listen to the directions and match the places in questions 11-15 to the appropriate place among A-E on the map.\n**What the instruction tells you:**\n- ℹ️ The answer is a single LETTER (A to E), not a word\n- ℹ️ 5 places are marked on the plan (A to E)\n- ℹ️ Each letter is used only once.\n### Step 2 — Study the map\n_Find the main gate at the bottom of the map and identify the fixed landmarks — the Recreational Facilities, the Library, the Teaching Building, the Gym, and the Dormitories — so the directions can be followed._\n→ *University of New South Wales campus — the main gate is at the bottom, with the Recreational Facilities to the right, the Library and Dormitories on the left, the Teaching Building in the centre, and the Gym at the top along Garden Street.*\n**This question:**\n> Where is the **Cafe**?\nℹ️ *Begin at the main gate and listen for directions past the women's dormitories, which are the two on the north side of the dormitory block.*\n### Step 3 — Listen and locate the place\n_Listen for the directions to the Cafe, find the landmark that fixes its position, then choose the matching letter._\nLocated in **the recording**:\n> \"The men's dorms are the 2 on the South, the women's the 2 on the North.\"\n> \"you definitely have to check out the little **cafe** just past the women's dormitories.\"\n⚠️ *The men's dormitories are mentioned as the two on the south, but the cafe is specifically past the women's dormitories on the north.*\n✅ **Answer: C** — The counsellor says the cafe is \"just past the women's dormitories\", and earlier explains that \"the women's the 2 on the North\", which places the cafe at position C.",
      "evidence_text": "you definitely have to check out the little cafe just past the women's dormitories.",
      "evidence_source_id": "1",
      "keywords_mapping": [
        {
          "original_text": "cafe",
          "paraphrased_text": "Cafe",
          "mapping_type": "exact_phrase"
        },
        {
          "original_text": "past the women's dormitories",
          "paraphrased_text": "Cafe",
          "mapping_type": "supporting_fact"
        }
      ]
    },
    {
      "id": 1175891,
      "question_number": 16,
      "section_number": 2,
      "question_type": 1,
      "prompt": "Question 16",
      "options": [],
      "user_answer": "faf",
      "correct_answer": "bathroom",
      "is_correct": false,
      "explanation_4_steps": "### Step 1 — Check the word limit\n_Start by checking the instruction to see how many words your answer can have._\n**Instructions:**\n> The answer must be **NO MORE THAN TWO WORDS AND/OR A NUMBER**.\n**Word limit rules:**\n- ✅ Up to two words\n- ✅ A number on its own\n- ✅ Up to two words + a number\n- ❌ Three or more words\n- ❌ A paraphrase or synonym\n⚠️ *Going over the word limit or mis-spelling the word makes the answer wrong, even when the meaning is right.*\n### Step 2 — Read the question and highlight keywords\n_Read the sentence carefully and pick out the clue words around the gap — names, numbers, and unusual words point to where the answer is said._\n**Sentence:**\n> 16. **Students in a room** don’t need to share a ............ **with ones in other rooms**.\n**Keywords:**\n- **students in a room**\n- **with ones in other rooms**\n→ *Listen for the speaker describing what students in a room do not need to share with students in other rooms.*\n### Step 3 — Predict the word form and possible paraphrases\n_Decide what kind of word the gap needs, then list a few words to be ready to hear in the recording._\nℹ️ *NOUN — the sentence asks what facility students in one room do not need to share with students in other rooms.*\n### Step 4 — Listen and write the answer\n_Listen for the clue words, then write the exact word that is said, spelled correctly and within the word limit._\nLocated in **the recording**:\n> \"The good news is that **each room has its own bathroom**.\"\n| Clue in the question | Phrase in the recording | Link & reasoning |\n|---|---|---|\n| don't need to share with ones in other rooms | \"each room has its own\" | **✅** — The recording says \"each room has its own bathroom\", which means students do not need to share it with other rooms. |\n→ *The speaker introduces this with 'The good news is'.*\n**Completed sentence:**\n> 16. Students in a room don’t need to share a **bathroom** with ones in other rooms.\n✅ **Answer: bathroom** — The speaker says \"each room has its own bathroom\", which means students do not need to share it with those in other rooms.\n**Verification:**\n- ✅ Spelling: 'bathroom' is written exactly as it is said.\n- ✅ Word count: 1 word.",
      "evidence_text": "The good news is that each room has its own bathroom.",
      "evidence_source_id": "3",
      "keywords_mapping": [
        {
          "original_text": "each room has its own bathroom",
          "paraphrased_text": "don't need to share a bathroom",
          "mapping_type": "rephrasing"
        }
      ]
    },
    {
      "id": 1175892,
      "question_number": 17,
      "section_number": 2,
      "question_type": 1,
      "prompt": "Question 17",
      "options": [],
      "user_answer": "fsdfasf",
      "correct_answer": "food containers",
      "is_correct": false,
      "explanation_4_steps": "### Step 1 — Check the word limit\n_Start by checking the instruction to see how many words your answer can have._\n**Instructions:**\n> The answer must be **NO MORE THAN TWO WORDS AND/OR A NUMBER**.\n**Word limit rules:**\n- ✅ Up to two words\n- ✅ A number on its own\n- ✅ Up to two words + a number\n- ❌ Three or more words\n- ❌ A paraphrase or synonym\n⚠️ *Going over the word limit or mis-spelling the word makes the answer wrong, even when the meaning is right.*\n### Step 2 — Read the question and highlight keywords\n_Read the sentence carefully and pick out the clue words around the gap — names, numbers, and unusual words point to where the answer is said._\n**Sentence:**\n> 17. **Everyone has to write down his name on the** ............\n**Keywords:**\n- **everyone has to write down his name on the**\n→ *Listen for the speaker explaining what students must write their names on.*\n### Step 3 — Predict the word form and possible paraphrases\n_Decide what kind of word the gap needs, then list a few words to be ready to hear in the recording._\nℹ️ *NOUN — the sentence asks what object students must write their names on.*\n### Step 4 — Listen and write the answer\n_Listen for the clue words, then write the exact word that is said, spelled correctly and within the word limit._\nLocated in **the recording**:\n> \"But a word of warning, you should definitely **write your name on your food containers**.\"\n| Clue in the question | Phrase in the recording | Link & reasoning |\n|---|---|---|\n| write down his name on the | \"write your name on your\" | **✅** — The recording says \"you should definitely write your name on\" the missing item, matching the sentence's instruction to write down names. |\n→ *The speaker says 'you should definitely' to emphasize this instruction.*\n⚠️ *The speaker mentions food thieves as the reason for writing names on items — listen for what specific items need labeling.*\n**Completed sentence:**\n> 17. Everyone has to write down his name on the **food containers**\n✅ **Answer: food containers** — The speaker warns students to \"write your name on your food containers\" because of food thieves, which fills the gap.\n**Verification:**\n- ✅ Spelling: 'food containers' is written exactly as it is said.\n- ✅ Word count: 2 words.",
      "evidence_text": "But a word of warning, you should definitely write your name on your food containers.",
      "evidence_source_id": "3",
      "keywords_mapping": [
        {
          "original_text": "write your name on your food containers",
          "paraphrased_text": "write down his name on the food containers",
          "mapping_type": "rephrasing"
        }
      ]
    },
    {
      "id": 1175893,
      "question_number": 18,
      "section_number": 2,
      "question_type": 1,
      "prompt": "Question 18",
      "options": [],
      "user_answer": "sdfasdfs",
      "correct_answer": "code",
      "is_correct": false,
      "explanation_4_steps": "### Step 1 — Check the word limit\n_Start by checking the instruction to see how many words your answer can have._\n**Instructions:**\n> The answer must be **NO MORE THAN TWO WORDS AND/OR A NUMBER**.\n**Word limit rules:**\n- ✅ Up to two words\n- ✅ A number on its own\n- ✅ Up to two words + a number\n- ❌ Three or more words\n- ❌ A paraphrase or synonym\n⚠️ *Going over the word limit or mis-spelling the word makes the answer wrong, even when the meaning is right.*\n### Step 2 — Read the question and highlight keywords\n_Read the sentence carefully and pick out the clue words around the gap — names, numbers, and unusual words point to where the answer is said._\n**Sentence:**\n> 18. **All the students use** a ............  to enter the dorm’s front door.\n**Keywords:**\n- **all the students use**\n→ *Listen for the speaker explaining what students use to enter the front door of the dormitory.*\n### Step 3 — Predict the word form and possible paraphrases\n_Decide what kind of word the gap needs, then list a few words to be ready to hear in the recording._\nℹ️ *NOUN — the sentence asks what method or item students use to enter the dorm's front door.*\n### Step 4 — Listen and write the answer\n_Listen for the clue words, then write the exact word that is said, spelled correctly and within the word limit._\nLocated in **the recording**:\n> \"To the right of each door, there's a keypad with numbers. When you move in, they will tell you **the code you use to enter the door**.\"\n| Clue in the question | Phrase in the recording | Link & reasoning |\n|---|---|---|\n| use to enter the dorm's front door | \"you use to enter the door\" | **✅** — The recording says students will be told \"the code you use to enter the door\", matching the sentence's phrase about using something to enter. |\n→ *The speaker says 'they will tell you' when introducing what students use.*\n⚠️ *The speaker mentions that individual room keys do not work for the front door — listen for what does work instead.*\n- ❌ 'key' is mentioned but the speaker clarifies that the room key does not work for the front door — a keypad with numbers is used instead.\n**Completed sentence:**\n> 18. All the students use a **code**  to enter the dorm’s front door.\n✅ **Answer: code** — The speaker explains that students will be told \"the code you use to enter the door\" of the dormitory, which is entered on a keypad.\n**Verification:**\n- ✅ Spelling: 'code' is written exactly as it is said.\n- ✅ Word count: 1 word.",
      "evidence_text": "To the right of each door, there's a keypad with numbers. When you move in, they will tell you the code you use to enter the door.",
      "evidence_source_id": "3",
      "keywords_mapping": [
        {
          "original_text": "the code you use to enter the door",
          "paraphrased_text": "use a code to enter the dorm's front door",
          "mapping_type": "rephrasing"
        }
      ]
    },
    {
      "id": 1175894,
      "question_number": 19,
      "section_number": 2,
      "question_type": 1,
      "prompt": "Question 19",
      "options": [],
      "user_answer": "sadfasfsa",
      "correct_answer": "basement",
      "is_correct": false,
      "explanation_4_steps": "### Step 1 — Check the word limit\n_Start by checking the instruction to see how many words your answer can have._\n**Instructions:**\n> The answer must be **NO MORE THAN TWO WORDS AND/OR A NUMBER**.\n**Word limit rules:**\n- ✅ Up to two words\n- ✅ A number on its own\n- ✅ Up to two words + a number\n- ❌ Three or more words\n- ❌ A paraphrase or synonym\n⚠️ *Going over the word limit or mis-spelling the word makes the answer wrong, even when the meaning is right.*\n### Step 2 — Read the question and highlight keywords\n_Read the sentence carefully and pick out the clue words around the gap — names, numbers, and unusual words point to where the answer is said._\n**Sentence:**\n> 19. If you want to **wash your clothes**, go to the **laundry room which is located in the** ............\n**Keywords:**\n- **wash your clothes**\n- **laundry room which is located in the**\n→ *Listen for the speaker describing where the laundry room is located in the dormitory.*\n### Step 3 — Predict the word form and possible paraphrases\n_Decide what kind of word the gap needs, then list a few words to be ready to hear in the recording._\nℹ️ *NOUN (place) — the sentence asks for the location within the building where the laundry room is found.*\n### Step 4 — Listen and write the answer\n_Listen for the clue words, then write the exact word that is said, spelled correctly and within the word limit._\nLocated in **the recording**:\n> \"**The laundry for each dorm is in the basement**.\"\n| Clue in the question | Phrase in the recording | Link & reasoning |\n|---|---|---|\n| laundry room which is located in the | \"The laundry for each dorm is in the\" | **✅** — The recording states \"The laundry for each dorm is in\" the missing location, matching the sentence's phrase about where it is located. |\n→ *The speaker says 'Oh, I almost forgot to tell you' before giving the location.*\n**Completed sentence:**\n> 19. If you want to wash your clothes, go to the laundry room which is located in the **basement**\n✅ **Answer: basement** — The speaker says \"The laundry for each dorm is in the basement\", which tells students where to find the laundry room.\n**Verification:**\n- ✅ Spelling: 'basement' is written exactly as it is said.\n- ✅ Word count: 1 word.",
      "evidence_text": "The laundry for each dorm is in the basement.",
      "evidence_source_id": "3",
      "keywords_mapping": [
        {
          "original_text": "The laundry for each dorm is in the basement",
          "paraphrased_text": "laundry room which is located in the basement",
          "mapping_type": "rephrasing"
        }
      ]
    },
    {
      "id": 1175895,
      "question_number": 20,
      "section_number": 2,
      "question_type": 1,
      "prompt": "Question 20",
      "options": [],
      "user_answer": "f",
      "correct_answer": "11.30 / 11:30 / 11.30 pm / 11:30 pm / 11.30 p.m. / 11:30 p.m.",
      "is_correct": false,
      "explanation_4_steps": "### Step 1 — Check the word limit\n_Start by checking the instruction to see how many words your answer can have._\n**Instructions:**\n> The answer must be **NO MORE THAN TWO WORDS AND/OR A NUMBER**.\n**Word limit rules:**\n- ✅ Up to two words\n- ✅ A number on its own\n- ✅ Up to two words + a number\n- ❌ Three or more words\n- ❌ A paraphrase or synonym\n⚠️ *Going over the word limit or mis-spelling the word makes the answer wrong, even when the meaning is right.*\n### Step 2 — Read the question and highlight keywords\n_Read the sentence carefully and pick out the clue words around the gap — names, numbers, and unusual words point to where the answer is said._\n**Sentence:**\n> 20. The **dormitory closes at** ............  **every night**.\n**Keywords:**\n- **dormitory closes at**\n- **every night**\n→ *Listen for the speaker stating what time the dormitory doors are locked each night.*\n### Step 3 — Predict the word form and possible paraphrases\n_Decide what kind of word the gap needs, then list a few words to be ready to hear in the recording._\nℹ️ *TIME — the sentence asks for the specific time when the dormitory closes at night.*\n### Step 4 — Listen and write the answer\n_Listen for the clue words, then write the exact word that is said, spelled correctly and within the word limit._\nLocated in **the recording**:\n> \"And now that I've mentioned **11:30**, please remember **the dorm doors are locked at 11:30PM**.\"\n| Clue in the question | Phrase in the recording | Link & reasoning |\n|---|---|---|\n| dormitory closes at | \"the dorm doors are locked at\" | **✅** — The recording says \"the dorm doors are locked at\" the missing time, which means the same as the dormitory closing. |\n→ *The speaker says 'please remember' to emphasize the closing time.*\n⚠️ *The speaker mentions the same time twice in quick succession — once for the laundry closing and once for the dorm doors locking.*\n**Completed sentence:**\n> 20. The dormitory closes at **11:30 p.m.**  every night.\n✅ **Answer: 11:30 p.m.** (also accepted: 11.30, 11:30, 11.30 pm, 11:30 pm, 11.30 p.m.) — The speaker says \"the dorm doors are locked at 11:30PM\", which gives the time when the dormitory closes every night.\n**Verification:**\n- ✅ Spelling: '11:30 p.m.' is written exactly as it is said.\n- ✅ Word count: 2 words.",
      "evidence_text": "And now that I've mentioned 11:30, please remember the dorm doors are locked at 11:30PM.",
      "evidence_source_id": "3",
      "keywords_mapping": [
        {
          "original_text": "the dorm doors are locked at 11:30PM",
          "paraphrased_text": "dormitory closes at 11:30",
          "mapping_type": "rephrasing"
        },
        {
          "original_text": "11:30",
          "paraphrased_text": "11.30",
          "mapping_type": "exact_phrase"
        }
      ]
    },
    {
      "id": 1175896,
      "question_number": 21,
      "section_number": 3,
      "question_type": 8,
      "prompt": "Questions 21-22 Choose the correct letters, A-C. According to Betty, which lines describe the sales of both cheese and oil in New Zealand and Colombia?",
      "options": [
        {
          "key": "A",
          "text": "A"
        },
        {
          "key": "B",
          "text": "B"
        },
        {
          "key": "C",
          "text": "C"
        }
      ],
      "user_answer": "B",
      "correct_answer": "B / C",
      "is_correct": true,
      "explanation_4_steps": "### Step 1 — Check how many answers are required\n_Check how many answers the instruction asks for and select exactly that many — no more and no fewer._\nℹ️ *Number of answers required: TWO  |  Option range: A-C*\n⚠️ *Choose exactly TWO options — no more and no fewer.*\n### Step 2 — Highlight the keywords in the question and options\n_Read the question and every option, then highlight the keywords in each — the words that carry the meaning._\n**Question:**\n> Questions 21-22 Choose the correct letters, A-C. According to Betty, which lines describe the **sales of both cheese and oil** in **New Zealand** and **Colombia**?\n**Options:**\n- **A** — A\n- **B** — B\n- **C** — C\n### Step 3 — Predict what you might hear\n_For each keyword, predict the synonyms or paraphrases you might hear in the recording._\n**Predict what you might hear:**\n- **A** — 'A': line A, the first line, option A\n- **B** — 'B': line B, the second line, option B\n- **C** — 'C': line C, the third line, option C\n### Step 4 — Listen and choose the answers\n_Listen carefully and choose the answers, watching for options that are mentioned and then dismissed._\nLocated in **the recording**:\n> \"Well, in New Zealand, **the sales of both oil and cheese have declined pretty steadily**.\"\n| Option | Decision | Evidence in the recording |\n|---|---|---|\n| **A** — A | **– Not mentioned** | Line A is never raised or described in Betty's discussion of the sales patterns. |\n| **B** — B | **✓ Correct** | Betty says 'the sales of both oil and cheese have declined pretty steadily' in New Zealand, which matches line B. |\n| **C** — C | **✓ Correct** | Betty says 'the volume of sales for both products has remained the same' in Colombia, which matches line C. |\n✅ **Answer: B and C** — Betty describes declining sales for both products in New Zealand and steady sales for both products in Colombia, which correspond to lines B and C.",
      "evidence_text": "Well, in New Zealand, the sales of both oil and cheese have declined pretty steadily.",
      "evidence_source_id": "8",
      "keywords_mapping": [
        {
          "original_text": "in New Zealand",
          "paraphrased_text": "New Zealand",
          "mapping_type": "exact_phrase"
        },
        {
          "original_text": "the sales of both oil and cheese",
          "paraphrased_text": "sales of both cheese and oil",
          "mapping_type": "rephrasing"
        },
        {
          "original_text": "declined pretty steadily",
          "paraphrased_text": "New Zealand",
          "mapping_type": "supporting_fact"
        }
      ]
    },
    {
      "id": 1175897,
      "question_number": 22,
      "section_number": 3,
      "question_type": 8,
      "prompt": "Questions 21-22 Choose the correct letters, A-C. According to Betty, which lines describe the sales of both cheese and oil in New Zealand and Colombia?",
      "options": [
        {
          "key": "A",
          "text": "A"
        },
        {
          "key": "B",
          "text": "B"
        },
        {
          "key": "C",
          "text": "C"
        }
      ],
      "user_answer": "C",
      "correct_answer": "B / C",
      "is_correct": true,
      "explanation_4_steps": "### Step 1 — Check how many answers are required\n_Check how many answers the instruction asks for and select exactly that many — no more and no fewer._\nℹ️ *Number of answers required: TWO  |  Option range: A-C*\n⚠️ *Choose exactly TWO options — no more and no fewer.*\n### Step 2 — Highlight the keywords in the question and options\n_Read the question and every option, then highlight the keywords in each — the words that carry the meaning._\n**Question:**\n> Questions 21-22 Choose the correct letters, A-C. According to Betty, which lines describe the **sales of both cheese and oil** in **New Zealand** and **Colombia**?\n**Options:**\n- **A** — A\n- **B** — B\n- **C** — C\n### Step 3 — Predict what you might hear\n_For each keyword, predict the synonyms or paraphrases you might hear in the recording._\n**Predict what you might hear:**\n- **A** — 'A': line A, the first line, option A\n- **B** — 'B': line B, the second line, option B\n- **C** — 'C': line C, the third line, option C\n### Step 4 — Listen and choose the answers\n_Listen carefully and choose the answers, watching for options that are mentioned and then dismissed._\nLocated in **the recording**:\n> \"On the other hand, in Colombia, **the volume of sales for both products has remained the same**.\"\n| Option | Decision | Evidence in the recording |\n|---|---|---|\n| **A** — A | **– Not mentioned** | Line A is never raised or described in Betty's discussion of the sales patterns. |\n| **B** — B | **✓ Correct** | Betty says 'the sales of both oil and cheese have declined pretty steadily' in New Zealand, which matches line B. |\n| **C** — C | **✓ Correct** | Betty says 'the volume of sales for both products has remained the same' in Colombia, which matches line C. |\n✅ **Answer: B and C** — Betty describes declining sales for both products in New Zealand and steady sales for both products in Colombia, which correspond to lines B and C.",
      "evidence_text": "On the other hand, in Colombia, the volume of sales for both products has remained the same.",
      "evidence_source_id": "8",
      "keywords_mapping": [
        {
          "original_text": "in Colombia",
          "paraphrased_text": "Colombia",
          "mapping_type": "exact_phrase"
        },
        {
          "original_text": "the volume of sales for both products",
          "paraphrased_text": "sales of both cheese and oil",
          "mapping_type": "rephrasing"
        },
        {
          "original_text": "remained the same",
          "paraphrased_text": "Colombia",
          "mapping_type": "supporting_fact"
        }
      ]
    },
    {
      "id": 1175898,
      "question_number": 23,
      "section_number": 3,
      "question_type": 8,
      "prompt": "Questions 23-24 Choose the correct letters, A-E. Which TWO of the following are sales strategies for chocolate in Italy and Germany?",
      "options": [
        {
          "key": "A",
          "text": "Locate near a children’s school"
        },
        {
          "key": "B",
          "text": "Change the location of the product on shelves"
        },
        {
          "key": "C",
          "text": "Give a free gift"
        },
        {
          "key": "D",
          "text": "Make it the cheapest brand"
        },
        {
          "key": "E",
          "text": "Make Schmutzig the second cheapest brand"
        }
      ],
      "user_answer": "Locate near a children’s school",
      "correct_answer": "Change the location of the product on shelves / Make Schmutzig the second cheapest brand",
      "is_correct": false,
      "explanation_4_steps": "### Step 1 — Check how many answers are required\n_Check how many answers the instruction asks for and select exactly that many — no more and no fewer._\nℹ️ *Number of answers required: TWO  |  Option range: A-E*\n⚠️ *Choose exactly TWO options — no more and no fewer.*\n### Step 2 — Highlight the keywords in the question and options\n_Read the question and every option, then highlight the keywords in each — the words that carry the meaning._\n**Question:**\n> Questions 23-24 Choose the correct letters, A-E. Which TWO of the following are **sales strategies** for **chocolate** in **Italy and Germany**?\n**Options:**\n- **A** — Locate near a children’s school\n- **B** — Change the location of the product on shelves\n- **C** — Give a free gift\n- **D** — Make it the cheapest brand\n- **E** — Make Schmutzig the second cheapest brand\n### Step 3 — Predict what you might hear\n_For each keyword, predict the synonyms or paraphrases you might hear in the recording._\n**Predict what you might hear:**\n- **A** — 'near a children's school': close to a school, next to where kids study, by an elementary school, around a primary school\n- **B** — 'Change the location of the product on shelves': put the candy at a different height, position it at eye level, place it where kids can see it, move it to a better spot\n- **C** — 'Give a free gift': offer something extra, include a bonus, provide a freebie, add a present\n- **D** — 'Make it the cheapest brand': lowest price, most affordable, least expensive, the bargain option\n- **E** — 'Make Schmutzig the second cheapest brand': not the lowest price but close, second most affordable, next to cheapest, almost the bargain option\n### Step 4 — Listen and choose the answers\n_Listen carefully and choose the answers, watching for options that are mentioned and then dismissed._\nLocated in **the recording**:\n> \"For example, in Italy, Kostig, the most expensive brand, pays shop owners to put the candy just about knee high for an adult.\"\n> \"That's about eye level.\"\n> \"Well, I mean, in Italy, if you **locate your product at the right location of shelves**, sales do great.\"\n> \"For a long time, the biggest selling brand was Schmutzig, mostly because **it was the 2nd cheapest** but didn't taste too bad.\"\n| Option | Decision | Evidence in the recording |\n|---|---|---|\n| **A** — Locate near a children’s school | **– Not mentioned** | Locating near a children's school is never raised in the recording. |\n| **B** — Change the location of the product on shelves | **✓ Correct** | Bruce says \"in Italy, if you locate your product at the right location of shelves, sales do great\", which matches changing the location of the product on shelves. |\n| **C** — Give a free gift | **– Not mentioned** | Giving a free gift is never raised in the recording. |\n| **D** — Make it the cheapest brand | **✗ Says the opposite** | Bruce says the biggest selling brand \"was the 2nd cheapest\", not the cheapest, so making it the cheapest is not the strategy. |\n| **E** — Make Schmutzig the second cheapest brand | **✓ Correct** | Bruce says \"the biggest selling brand was Schmutzig, mostly because it was the 2nd cheapest\", which matches making Schmutzig the second cheapest brand. |\n**Watch out for:**\n- ⚠️ D: The cheapest price IS mentioned, but Bruce says the successful brand was the \"2nd cheapest\", not the cheapest, so D is wrong.\n✅ **Answer: B and E** — Bruce describes two strategies: in Italy, placing products at the right shelf location drives sales, and in Germany, Schmutzig succeeded by being the second cheapest brand.",
      "evidence_text": "For example, in Italy, Kostig, the most expensive brand, pays shop owners to put the candy just about knee high for an adult.",
      "evidence_source_id": "11",
      "keywords_mapping": [
        {
          "original_text": "in Italy",
          "paraphrased_text": "Italy",
          "mapping_type": "exact_phrase"
        },
        {
          "original_text": "pays shop owners to put the candy just about knee high for an adult",
          "paraphrased_text": "Change the location of the product on shelves",
          "mapping_type": "rephrasing"
        }
      ]
    },
    {
      "id": 1175899,
      "question_number": 24,
      "section_number": 3,
      "question_type": 8,
      "prompt": "Questions 23-24 Choose the correct letters, A-E. Which TWO of the following are sales strategies for chocolate in Italy and Germany?",
      "options": [
        {
          "key": "A",
          "text": "Locate near a children’s school"
        },
        {
          "key": "B",
          "text": "Change the location of the product on shelves"
        },
        {
          "key": "C",
          "text": "Give a free gift"
        },
        {
          "key": "D",
          "text": "Make it the cheapest brand"
        },
        {
          "key": "E",
          "text": "Make Schmutzig the second cheapest brand"
        }
      ],
      "user_answer": "Give a free gift",
      "correct_answer": "Change the location of the product on shelves / Make Schmutzig the second cheapest brand",
      "is_correct": false,
      "explanation_4_steps": "### Step 1 — Check how many answers are required\n_Check how many answers the instruction asks for and select exactly that many — no more and no fewer._\nℹ️ *Number of answers required: TWO  |  Option range: A-E*\n⚠️ *Choose exactly TWO options — no more and no fewer.*\n### Step 2 — Highlight the keywords in the question and options\n_Read the question and every option, then highlight the keywords in each — the words that carry the meaning._\n**Question:**\n> Questions 23-24 Choose the correct letters, A-E. Which TWO of the following are **sales strategies** for **chocolate** in **Italy and Germany**?\n**Options:**\n- **A** — Locate near a children’s school\n- **B** — Change the location of the product on shelves\n- **C** — Give a free gift\n- **D** — Make it the cheapest brand\n- **E** — Make Schmutzig the second cheapest brand\n### Step 3 — Predict what you might hear\n_For each keyword, predict the synonyms or paraphrases you might hear in the recording._\n**Predict what you might hear:**\n- **A** — 'near a children's school': close to a school, next to where kids study, by an elementary school, around a primary school\n- **B** — 'Change the location of the product on shelves': put the candy at a different height, position it at eye level, place it where kids can see it, move it to a better spot\n- **C** — 'Give a free gift': offer something extra, include a bonus, provide a freebie, add a present\n- **D** — 'Make it the cheapest brand': lowest price, most affordable, least expensive, the bargain option\n- **E** — 'Make Schmutzig the second cheapest brand': not the lowest price but close, second most affordable, next to cheapest, almost the bargain option\n### Step 4 — Listen and choose the answers\n_Listen carefully and choose the answers, watching for options that are mentioned and then dismissed._\nLocated in **the recording**:\n> \"For example, in Italy, Kostig, the most expensive brand, pays shop owners to put the candy just about knee high for an adult.\"\n> \"That's about eye level.\"\n> \"Well, I mean, in Italy, if you **locate your product at the right location of shelves**, sales do great.\"\n> \"For a long time, the biggest selling brand was Schmutzig, mostly because **it was the 2nd cheapest** but didn't taste too bad.\"\n| Option | Decision | Evidence in the recording |\n|---|---|---|\n| **A** — Locate near a children’s school | **– Not mentioned** | Locating near a children's school is never raised in the recording. |\n| **B** — Change the location of the product on shelves | **✓ Correct** | Bruce says \"in Italy, if you locate your product at the right location of shelves, sales do great\", which matches changing the location of the product on shelves. |\n| **C** — Give a free gift | **– Not mentioned** | Giving a free gift is never raised in the recording. |\n| **D** — Make it the cheapest brand | **✗ Says the opposite** | Bruce says the biggest selling brand \"was the 2nd cheapest\", not the cheapest, so making it the cheapest is not the strategy. |\n| **E** — Make Schmutzig the second cheapest brand | **✓ Correct** | Bruce says \"the biggest selling brand was Schmutzig, mostly because it was the 2nd cheapest\", which matches making Schmutzig the second cheapest brand. |\n**Watch out for:**\n- ⚠️ D: The cheapest price IS mentioned, but Bruce says the successful brand was the \"2nd cheapest\", not the cheapest, so D is wrong.\n✅ **Answer: B and E** — Bruce describes two strategies: in Italy, placing products at the right shelf location drives sales, and in Germany, Schmutzig succeeded by being the second cheapest brand.",
      "evidence_text": "",
      "evidence_source_id": "",
      "keywords_mapping": []
    },
    {
      "id": 1175900,
      "question_number": 25,
      "section_number": 3,
      "question_type": 1,
      "prompt": "Question 25",
      "options": [],
      "user_answer": "dfaf",
      "correct_answer": "colour / color",
      "is_correct": false,
      "explanation_4_steps": "### Step 1 — Check the word limit\n_Start by checking the instruction to see how many words your answer can have._\n**Instructions:**\n> The answer must be **NO MORE THAN TWO WORDS**.\n**Word limit rules:**\n- ✅ Up to two words\n- ❌ Three or more words\n- ❌ A number on its own\n- ❌ A paraphrase or synonym\n⚠️ *Going over the word limit or mis-spelling the word makes the answer wrong, even when the meaning is right.*\n### Step 2 — Read the question and highlight keywords\n_Skim the headings in the notes so it is clear what each section is about and where this gap fits in._\n→ *Main topic: Students' future research plans*\n**Note:**\n>\n→ *This blank is in Betty's research section; listen for what Betty says affects sales of products.*\n### Step 3 — Predict the word and the vocabulary\n_Decide what kind of word the gap needs, then list a few words to be ready to hear in the recording._\nℹ️ *NOUN — the gap asks for the factor or element that affects sales, so it will be a thing or concept that influences purchasing.*\n### Step 4 — Listen and write the answer\n_Follow the speaker through the notes in order and write the exact word that is said, spelled correctly and within the word limit._\nLocated in **the recording**:\n> \"I'm especially interested in the **effects of color** on **sales of products**.\"\n| Clue in the question | Phrase in the recording | Link & reasoning |\n|---|---|---|\n| how affects | \"effects of\" | **✅** — The note asks how something affects sales; the recording says \"effects of\" color, which means the same thing. |\n| the sales | \"sales of products\" | **✅** — Both mention \"sales\", though the recording adds \"of products\" to be more specific. |\n✅ **Answer: color** (also accepted: colour) — Betty says she is interested in \"the effects of color on sales of products\", so the factor is colour.\n**Verification:**\n- ✅ Spelling: 'color' is written exactly as it is said.\n- ✅ Word count: 1 word.",
      "evidence_text": "I'm especially interested in the effects of color on sales of products.",
      "evidence_source_id": "14",
      "keywords_mapping": [
        {
          "original_text": "effects of color",
          "paraphrased_text": "how color affects",
          "mapping_type": "rephrasing"
        },
        {
          "original_text": "sales of products",
          "paraphrased_text": "the sales",
          "mapping_type": "rephrasing"
        }
      ]
    },
    {
      "id": 1175901,
      "question_number": 26,
      "section_number": 3,
      "question_type": 1,
      "prompt": "Question 26",
      "options": [],
      "user_answer": "afas",
      "correct_answer": "cleaning products",
      "is_correct": false,
      "explanation_4_steps": "### Step 1 — Check the word limit\n_Start by checking the instruction to see how many words your answer can have._\n**Instructions:**\n> The answer must be **NO MORE THAN TWO WORDS**.\n**Word limit rules:**\n- ✅ Up to two words\n- ❌ Three or more words\n- ❌ A number on its own\n- ❌ A paraphrase or synonym\n⚠️ *Going over the word limit or mis-spelling the word makes the answer wrong, even when the meaning is right.*\n### Step 2 — Read the question and highlight keywords\n_Skim the headings in the notes so it is clear what each section is about and where this gap fits in._\n→ *Main topic: Students' future research plans*\n**Note:**\n>\n→ *This blank is in Betty's research section; listen for the second type of product Betty will study alongside cosmetics.*\n### Step 3 — Predict the word and the vocabulary\n_Decide what kind of word the gap needs, then list a few words to be ready to hear in the recording._\nℹ️ *NOUN (product category) — the gap asks for a type of product that Betty will study, parallel to cosmetics.*\n### Step 4 — Listen and write the answer\n_Follow the speaker through the notes in order and write the exact word that is said, spelled correctly and within the word limit._\nLocated in **the recording**:\n> \"So I'll be looking at ads for **cosmetics** and **cleaning products** in the local market.\"\n✅ **Answer: cleaning products** — Betty says she will look at \"ads for cosmetics and cleaning products\", so the second category is cleaning products.\n**Verification:**\n- ✅ Spelling: 'cleaning products' is written exactly as it is said.\n- ✅ Word count: 2 words.",
      "evidence_text": "So I'll be looking at ads for cosmetics and cleaning products in the local market.",
      "evidence_source_id": "14",
      "keywords_mapping": [
        {
          "original_text": "cosmetics",
          "paraphrased_text": "cosmetics",
          "mapping_type": "exact_phrase"
        },
        {
          "original_text": "cleaning products",
          "paraphrased_text": "cleaning products",
          "mapping_type": "exact_phrase"
        }
      ]
    },
    {
      "id": 1175902,
      "question_number": 27,
      "section_number": 3,
      "question_type": 1,
      "prompt": "Question 27",
      "options": [],
      "user_answer": "afasfs",
      "correct_answer": "different containers / containers",
      "is_correct": false,
      "explanation_4_steps": "### Step 1 — Check the word limit\n_Start by checking the instruction to see how many words your answer can have._\n**Instructions:**\n> The answer must be **NO MORE THAN TWO WORDS**.\n**Word limit rules:**\n- ✅ Up to two words\n- ❌ Three or more words\n- ❌ A number on its own\n- ❌ A paraphrase or synonym\n⚠️ *Going over the word limit or mis-spelling the word makes the answer wrong, even when the meaning is right.*\n### Step 2 — Read the question and highlight keywords\n_Skim the headings in the notes so it is clear what each section is about and where this gap fits in._\n→ *Main topic: Students' future research plans*\n**Note:**\n>\n→ *This blank is in Bruce's research section; listen for what Bruce says may impact cookie sales.*\n### Step 3 — Predict the word and the vocabulary\n_Decide what kind of word the gap needs, then list a few words to be ready to hear in the recording._\nℹ️ *NOUN — the gap asks for the factor that may impact sales, so it will be a thing or element that influences cookie purchasing.*\n### Step 4 — Listen and write the answer\n_Follow the speaker through the notes in order and write the exact word that is said, spelled correctly and within the word limit._\nLocated in **the recording**:\n> \"I'm focusing on the **effects of different containers** on **sales of cookies**.\"\n| Clue in the question | Phrase in the recording | Link & reasoning |\n|---|---|---|\n| how may impact | \"effects of\" | **✅** — The note asks how something may impact sales; the recording says \"effects of\" containers, which means the same thing. |\n✅ **Answer: containers** (also accepted: different containers) — Bruce says he is focusing on \"the effects of different containers on sales of cookies\", so the factor is different containers.\n**Verification:**\n- ✅ Spelling: 'containers' is written exactly as it is said.\n- ✅ Word count: 1 word.",
      "evidence_text": "I'm focusing on the effects of different containers on sales of cookies.",
      "evidence_source_id": "15",
      "keywords_mapping": [
        {
          "original_text": "effects of different containers",
          "paraphrased_text": "how ............  may impact",
          "mapping_type": "rephrasing"
        },
        {
          "original_text": "on sales of cookies",
          "paraphrased_text": "on sales\nof cookies",
          "mapping_type": "exact_phrase"
        }
      ]
    },
    {
      "id": 1175903,
      "question_number": 28,
      "section_number": 3,
      "question_type": 1,
      "prompt": "Question 28",
      "options": [],
      "user_answer": "afasf",
      "correct_answer": "materials",
      "is_correct": false,
      "explanation_4_steps": "### Step 1 — Check the word limit\n_Start by checking the instruction to see how many words your answer can have._\n**Instructions:**\n> The answer must be **NO MORE THAN TWO WORDS**.\n**Word limit rules:**\n- ✅ Up to two words\n- ❌ Three or more words\n- ❌ A number on its own\n- ❌ A paraphrase or synonym\n⚠️ *Going over the word limit or mis-spelling the word makes the answer wrong, even when the meaning is right.*\n### Step 2 — Read the question and highlight keywords\n_Skim the headings in the notes so it is clear what each section is about and where this gap fits in._\n→ *Main topic: Students' future research plans*\n**Note:**\n>\n→ *This blank is in Bruce's research section; listen for the first specific factor Bruce will investigate about cookie packaging.*\n### Step 3 — Predict the word and the vocabulary\n_Decide what kind of word the gap needs, then list a few words to be ready to hear in the recording._\nℹ️ *NOUN — the gap asks for a specific aspect of packaging that Bruce will investigate, so it will be a feature or element of containers.*\n### Step 4 — Listen and write the answer\n_Follow the speaker through the notes in order and write the exact word that is said, spelled correctly and within the word limit._\nLocated in **the recording**:\n> \"So I'm going to look into **packaging for cookies** and how the **materials** they use will affect the image and in turn **sales**.\"\n| Clue in the question | Phrase in the recording | Link & reasoning |\n|---|---|---|\n| sales of cookies | \"packaging for cookies\" | **✅** — The note says sales of cookies while the recording says \"packaging for cookies\", both referring to the same product category. |\n✅ **Answer: materials** — Bruce says he will look into \"how the materials they use will affect the image\", so the first factor is materials.\n**Verification:**\n- ✅ Spelling: 'materials' is written exactly as it is said.\n- ✅ Word count: 1 word.",
      "evidence_text": "So I'm going to look into packaging for cookies and how the materials they use will affect the image and in turn sales.",
      "evidence_source_id": "15",
      "keywords_mapping": [
        {
          "original_text": "how the materials they use will affect the image and in turn sales",
          "paraphrased_text": "relationships among ............ , ............ , and sales",
          "mapping_type": "rephrasing"
        }
      ]
    },
    {
      "id": 1175904,
      "question_number": 29,
      "section_number": 3,
      "question_type": 1,
      "prompt": "Question 29",
      "options": [],
      "user_answer": "asfasf",
      "correct_answer": "image",
      "is_correct": false,
      "explanation_4_steps": "### Step 1 — Check the word limit\n_Start by checking the instruction to see how many words your answer can have._\n**Instructions:**\n> The answer must be **NO MORE THAN TWO WORDS**.\n**Word limit rules:**\n- ✅ Up to two words\n- ❌ Three or more words\n- ❌ A number on its own\n- ❌ A paraphrase or synonym\n⚠️ *Going over the word limit or mis-spelling the word makes the answer wrong, even when the meaning is right.*\n### Step 2 — Read the question and highlight keywords\n_Skim the headings in the notes so it is clear what each section is about and where this gap fits in._\n→ *Main topic: Students' future research plans*\n**Note:**\n>\n→ *This blank is in Bruce's research section; listen for the second specific factor Bruce will investigate about cookie packaging.*\n### Step 3 — Predict the word and the vocabulary\n_Decide what kind of word the gap needs, then list a few words to be ready to hear in the recording._\nℹ️ *NOUN — the gap asks for another aspect of packaging that Bruce will investigate, so it will be a concept or quality affected by materials.*\n### Step 4 — Listen and write the answer\n_Follow the speaker through the notes in order and write the exact word that is said, spelled correctly and within the word limit._\nLocated in **the recording**:\n> \"So I'm going to look into **packaging for cookies** and how the materials they use will affect the **image** and in turn **sales**.\"\n| Clue in the question | Phrase in the recording | Link & reasoning |\n|---|---|---|\n| sales of cookies | \"packaging for cookies\" | **✅** — The note says sales of cookies while the recording says \"packaging for cookies\", both referring to the same product category. |\n✅ **Answer: image** — Bruce says materials \"will affect the image and in turn sales\", so the second factor is image.\n**Verification:**\n- ✅ Spelling: 'image' is written exactly as it is said.\n- ✅ Word count: 1 word.",
      "evidence_text": "",
      "evidence_source_id": "",
      "keywords_mapping": []
    },
    {
      "id": 1175905,
      "question_number": 30,
      "section_number": 3,
      "question_type": 1,
      "prompt": "Question 30",
      "options": [],
      "user_answer": "dfasfasf",
      "correct_answer": "advertisement",
      "is_correct": false,
      "explanation_4_steps": "### Step 1 — Check the word limit\n_Start by checking the instruction to see how many words your answer can have._\n**Instructions:**\n> The answer must be **NO MORE THAN TWO WORDS**.\n**Word limit rules:**\n- ✅ Up to two words\n- ❌ Three or more words\n- ❌ A number on its own\n- ❌ A paraphrase or synonym\n⚠️ *Going over the word limit or mis-spelling the word makes the answer wrong, even when the meaning is right.*\n### Step 2 — Read the question and highlight keywords\n_Skim the headings in the notes so it is clear what each section is about and where this gap fits in._\n→ *Main topic: Students' future research plans*\n**Note:**\n>\n→ *This blank is in the Professor's advice section; listen for what the professor urges the students to pay attention to.*\n### Step 3 — Predict the word and the vocabulary\n_Decide what kind of word the gap needs, then list a few words to be ready to hear in the recording._\nℹ️ *NOUN — the gap asks for the thing whose extensions should be remembered, so it will be a concept or element related to marketing research.*\n### Step 4 — Listen and write the answer\n_Follow the speaker through the notes in order and write the exact word that is said, spelled correctly and within the word limit._\nLocated in **the recording**:\n> \"But as always in this course, I urge you both to **pay much more attention to** the **advertisement extensions**.\"\n| Clue in the question | Phrase in the recording | Link & reasoning |\n|---|---|---|\n| bear in mind | \"pay much more attention to\" | **✅** — The note says bear in mind while the recording says \"pay much more attention to\", both meaning to remember or focus on something. |\n| the extensions of | \"extensions\" | **✅** — The note says the extensions of advertisement; the recording says advertisement followed by \"extensions\", just in reverse order. |\n✅ **Answer: advertisement** — The professor urges them to \"pay much more attention to the advertisement extensions\", so the answer is advertisement.\n**Verification:**\n- ✅ Spelling: 'advertisement' is written exactly as it is said.\n- ✅ Word count: 1 word.",
      "evidence_text": "But as always in this course, I urge you both to pay much more attention to the advertisement extensions.",
      "evidence_source_id": "15",
      "keywords_mapping": [
        {
          "original_text": "pay much more attention to",
          "paraphrased_text": "bear in mind",
          "mapping_type": "rephrasing"
        },
        {
          "original_text": "advertisement extensions",
          "paraphrased_text": "the extensions of advertisement",
          "mapping_type": "rephrasing"
        }
      ]
    },
    {
      "id": 1175906,
      "question_number": 31,
      "section_number": 4,
      "question_type": 34,
      "prompt": "{{less effort}}",
      "options": [],
      "user_answer": "asdfs",
      "correct_answer": "less effort",
      "is_correct": false,
      "explanation_4_steps": "### Step 1 — Check the word limit\n_Start by checking the instruction to see how many words your answer can have._\n**Instructions:**\n> The answer must be **NO MORE THAN TWO WORDS AND/OR A NUMBER**.\n**Word limit rules:**\n- ✅ Up to two words\n- ✅ A number on its own\n- ✅ Up to two words + a number\n- ❌ Three or more words\n- ❌ A paraphrase or synonym\n⚠️ *Going over the word limit or mis-spelling the word makes the answer wrong, even when the meaning is right.*\n### Step 2 — Read the question and highlight keywords\n_Read across the columns to see what each one holds, then find the cell with the gap._\n→ *Table topic: Development of the bicycle across two centuries*\n**Table structure:**\n- Time period: the decade when each development occurred\n- Features / characteristics: what was notable about bikes in that period — this gap is here\n**Table cell:**\n> 1830s\n> need ............ than walking\n→ *This blank is in the Features column for the 1830s row; listen for what early bikes needed compared to walking.*\n### Step 3 — Predict the word form\n_Look at the words around the gap and decide what kind of word belongs there before listening._\nℹ️ *NOUN PHRASE (comparative quantity) — the phrase 'need ______ than walking' requires a comparative expression describing effort or energy.*\n### Step 4 — Listen and write the answer\n_Follow the table row by row and write the exact words that are said, spelled correctly and within the word limit._\nLocated in **the recording**:\n> \"The early bike let people **travel with less effort than walking**.\"\n| Clue in the question | Phrase in the recording | Link & reasoning |\n|---|---|---|\n| need than walking | \"travel with than walking\" | **✅** — The recording says early bikes let people \"travel with less effort than walking\", which matches the idea of needing a certain amount compared to walking. |\n→ *The speaker introduces the benefit of early bikes with 'The early bike let people'.*\n**Completed cell:**\n> 1830s\n> need **less effort** than walking\n✅ **Answer: less effort** — The speaker explains that early bikes let people \"travel with less effort than walking\", so the answer is 'less effort'.\n**Verification:**\n- ✅ Spelling: 'less effort' is written exactly as it is said.\n- ✅ Word count: 2 words.",
      "evidence_text": "The early bike let people travel with less effort than walking.",
      "evidence_source_id": "1",
      "keywords_mapping": [
        {
          "original_text": "travel with less effort than walking",
          "paraphrased_text": "need less effort than walking",
          "mapping_type": "rephrasing"
        }
      ]
    },
    {
      "id": 1175907,
      "question_number": 32,
      "section_number": 4,
      "question_type": 34,
      "prompt": "{{uncomfortable}}",
      "options": [],
      "user_answer": "asfasf",
      "correct_answer": "uncomfortable",
      "is_correct": false,
      "explanation_4_steps": "### Step 1 — Check the word limit\n_Start by checking the instruction to see how many words your answer can have._\n**Instructions:**\n> The answer must be **NO MORE THAN TWO WORDS AND/OR A NUMBER**.\n**Word limit rules:**\n- ✅ Up to two words\n- ✅ A number on its own\n- ✅ Up to two words + a number\n- ❌ Three or more words\n- ❌ A paraphrase or synonym\n⚠️ *Going over the word limit or mis-spelling the word makes the answer wrong, even when the meaning is right.*\n### Step 2 — Read the question and highlight keywords\n_Read across the columns to see what each one holds, then find the cell with the gap._\n→ *Table topic: Development of the bicycle across two centuries*\n**Table structure:**\n- Time period: the decade when each development occurred\n- Features / characteristics: what was notable about bikes in that period — this gap is here\n**Table cell:**\n> 1830s\n> quite ............\n→ *This blank is in the Features column for the 1830s row; listen for a description of the ride quality.*\n### Step 3 — Predict the word form\n_Look at the words around the gap and decide what kind of word belongs there before listening._\nℹ️ *ADJECTIVE — the word 'quite' modifies an adjective describing the ride experience.*\n### Step 4 — Listen and write the answer\n_Follow the table row by row and write the exact words that are said, spelled correctly and within the word limit._\nLocated in **the recording**:\n> \"So the downside was that **the ride was quite uncomfortable** on most roads.\"\n| Clue in the question | Phrase in the recording | Link & reasoning |\n|---|---|---|\n| quite | \"the ride was quite\" | **✅** — The recording states \"the ride was quite uncomfortable\", using the exact phrase from the table cell. |\n→ *The speaker introduces the downside with 'So the downside was that'.*\n**Completed cell:**\n> 1830s\n> quite **uncomfortable**\n✅ **Answer: uncomfortable** — The speaker says \"the ride was quite uncomfortable\" on most roads, giving the exact word needed.\n**Verification:**\n- ✅ Spelling: 'uncomfortable' is written exactly as it is said.\n- ✅ Word count: 1 word.",
      "evidence_text": "So the downside was that the ride was quite uncomfortable on most roads.",
      "evidence_source_id": "1",
      "keywords_mapping": [
        {
          "original_text": "the ride was quite uncomfortable",
          "paraphrased_text": "quite uncomfortable",
          "mapping_type": "exact_phrase"
        }
      ]
    },
    {
      "id": 1175908,
      "question_number": 33,
      "section_number": 4,
      "question_type": 34,
      "prompt": "{{1860s}}",
      "options": [],
      "user_answer": "afd",
      "correct_answer": "1860s",
      "is_correct": false,
      "explanation_4_steps": "### Step 1 — Check the word limit\n_Start by checking the instruction to see how many words your answer can have._\n**Instructions:**\n> The answer must be **NO MORE THAN TWO WORDS AND/OR A NUMBER**.\n**Word limit rules:**\n- ✅ Up to two words\n- ✅ A number on its own\n- ✅ Up to two words + a number\n- ❌ Three or more words\n- ❌ A paraphrase or synonym\n⚠️ *Going over the word limit or mis-spelling the word makes the answer wrong, even when the meaning is right.*\n### Step 2 — Read the question and highlight keywords\n_Read across the columns to see what each one holds, then find the cell with the gap._\n→ *Table topic: Development of the bicycle across two centuries*\n**Table structure:**\n- Time period: the decade when each development occurred — this gap is here\n- Features / characteristics: what was notable about bikes in that period\n**Table cell:**\n> ............\n→ *This blank is in the Time period column; listen for the decade when improvements like metal frames and chain systems appeared.*\n### Step 3 — Predict the word form\n_Look at the words around the gap and decide what kind of word belongs there before listening._\nℹ️ *NUMBER (decade) — the table shows decades in the format '1830s', '1880s', so this blank needs a similar decade marker.*\n### Step 4 — Listen and write the answer\n_Follow the table row by row and write the exact words that are said, spelled correctly and within the word limit._\nLocated in **the recording**:\n> \"By the **18 sixties** though, improvements were being made.\"\n| Clue in the question | Phrase in the recording | Link & reasoning |\n|---|---|---|\n| 1860s | \"18 sixties\" | **✅** — The speaker says \"By the 18 sixties\" improvements were being made, naming the decade for this row. |\n→ *The speaker signals the new time period with 'By the'.*\n**Completed cell:**\n> **1860s**\n✅ **Answer: 1860s** — The speaker says \"By the 18 sixties\" improvements were being made, so the decade is '1860s'.\n**Verification:**\n- ✅ Spelling: '1860s' is written exactly as it is said.\n- ✅ Word count: 1 word.",
      "evidence_text": "By the 18 sixties though, improvements were being made.",
      "evidence_source_id": "1",
      "keywords_mapping": [
        {
          "original_text": "18 sixties",
          "paraphrased_text": "1860s",
          "mapping_type": "exact_phrase"
        }
      ]
    },
    {
      "id": 1175909,
      "question_number": 34,
      "section_number": 4,
      "question_type": 34,
      "prompt": "{{connected}}",
      "options": [],
      "user_answer": "dfasf",
      "correct_answer": "connected",
      "is_correct": false,
      "explanation_4_steps": "### Step 1 — Check the word limit\n_Start by checking the instruction to see how many words your answer can have._\n**Instructions:**\n> The answer must be **NO MORE THAN TWO WORDS AND/OR A NUMBER**.\n**Word limit rules:**\n- ✅ Up to two words\n- ✅ A number on its own\n- ✅ Up to two words + a number\n- ❌ Three or more words\n- ❌ A paraphrase or synonym\n⚠️ *Going over the word limit or mis-spelling the word makes the answer wrong, even when the meaning is right.*\n### Step 2 — Read the question and highlight keywords\n_Read across the columns to see what each one holds, then find the cell with the gap._\n→ *Table topic: Development of the bicycle across two centuries*\n**Table structure:**\n- Time period: the decade when each development occurred\n- Features / characteristics: what was notable about bikes in that period — this gap is here\n**Table cell:**\n> ............\n> Chain and sprocket are ............\n→ *This blank is in the Features column for the 1860s row; listen for how the chain and sprocket relate to each other.*\n### Step 3 — Predict the word form\n_Look at the words around the gap and decide what kind of word belongs there before listening._\nℹ️ *ADJECTIVE or PAST PARTICIPLE — the phrase 'Chain and sprocket are ______' needs a word describing their relationship or state.*\n### Step 4 — Listen and write the answer\n_Follow the table row by row and write the exact words that are said, spelled correctly and within the word limit._\nLocated in **the recording**:\n> \"The biggest improvement, however, was the development of the **chain and sprocket system. They're connected**.\"\n| Clue in the question | Phrase in the recording | Link & reasoning |\n|---|---|---|\n| Chain and sprocket | \"chain and sprocket system\" | **✅** — The speaker mentions the \"chain and sprocket system\", naming the two parts. |\n| connected | \"They're\" | **✅** — The speaker then says \"They're connected\", describing the relationship between the two parts. |\n→ *The speaker clarifies the relationship immediately after mentioning the system with 'They're'.*\n**Completed cell:**\n> ............\n> Chain and sprocket are **connected**\n✅ **Answer: connected** — After mentioning the chain and sprocket system, the speaker says \"They're connected\", so the answer is 'connected'.\n**Verification:**\n- ✅ Spelling: 'connected' is written exactly as it is said.\n- ✅ Word count: 1 word.",
      "evidence_text": "The biggest improvement, however, was the development of the chain and sprocket system. They're connected.",
      "evidence_source_id": "1",
      "keywords_mapping": [
        {
          "original_text": "chain and sprocket system",
          "paraphrased_text": "Chain and sprocket",
          "mapping_type": "exact_phrase"
        },
        {
          "original_text": "They're connected",
          "paraphrased_text": "connected",
          "mapping_type": "exact_phrase"
        }
      ]
    },
    {
      "id": 1175910,
      "question_number": 35,
      "section_number": 4,
      "question_type": 34,
      "prompt": "{{more smoothly}}",
      "options": [],
      "user_answer": "asfasf",
      "correct_answer": "more smoothly",
      "is_correct": false,
      "explanation_4_steps": "### Step 1 — Check the word limit\n_Start by checking the instruction to see how many words your answer can have._\n**Instructions:**\n> The answer must be **NO MORE THAN TWO WORDS AND/OR A NUMBER**.\n**Word limit rules:**\n- ✅ Up to two words\n- ✅ A number on its own\n- ✅ Up to two words + a number\n- ❌ Three or more words\n- ❌ A paraphrase or synonym\n⚠️ *Going over the word limit or mis-spelling the word makes the answer wrong, even when the meaning is right.*\n### Step 2 — Read the question and highlight keywords\n_Read across the columns to see what each one holds, then find the cell with the gap._\n→ *Table topic: Development of the bicycle across two centuries*\n**Table structure:**\n- Time period: the decade when each development occurred\n- Features / characteristics: what was notable about bikes in that period — this gap is here\n**Table cell:**\n> ............\n> easier and ............ ride\n→ *This blank is in the Features column for the 1860s row; listen for a second quality of the ride alongside 'easier'.*\n### Step 3 — Predict the word form\n_Look at the words around the gap and decide what kind of word belongs there before listening._\nℹ️ *ADVERB (comparative) — the phrase 'easier and ______ ride' pairs two qualities, so the blank needs a comparative adverb describing how the ride felt.*\n### Step 4 — Listen and write the answer\n_Follow the table row by row and write the exact words that are said, spelled correctly and within the word limit._\nLocated in **the recording**:\n> \"As a result, the good thing was that you could **ride a lot more smoothly** and with very little effort.\"\n| Clue in the question | Phrase in the recording | Link & reasoning |\n|---|---|---|\n| ride | \"you could ride a lot\" | **✅** — The recording says \"you could ride a lot more smoothly\", describing the second quality of the ride experience. |\n→ *The speaker introduces the benefit with 'As a result, the good thing was that'.*\n**Completed cell:**\n> ............\n> easier and **more smoothly** ride\n✅ **Answer: more smoothly** — The speaker explains that \"you could ride a lot more smoothly\" and with very little effort, so the answer is 'more smoothly'.\n**Verification:**\n- ✅ Spelling: 'more smoothly' is written exactly as it is said.\n- ✅ Word count: 2 words.",
      "evidence_text": "As a result, the good thing was that you could ride a lot more smoothly and with very little effort.",
      "evidence_source_id": "1",
      "keywords_mapping": [
        {
          "original_text": "ride a lot more smoothly",
          "paraphrased_text": "more smoothly ride",
          "mapping_type": "rephrasing"
        }
      ]
    },
    {
      "id": 1175911,
      "question_number": 36,
      "section_number": 4,
      "question_type": 34,
      "prompt": "{{rubber wheels}}",
      "options": [],
      "user_answer": "afasdfsd",
      "correct_answer": "rubber wheels",
      "is_correct": false,
      "explanation_4_steps": "### Step 1 — Check the word limit\n_Start by checking the instruction to see how many words your answer can have._\n**Instructions:**\n> The answer must be **NO MORE THAN TWO WORDS AND/OR A NUMBER**.\n**Word limit rules:**\n- ✅ Up to two words\n- ✅ A number on its own\n- ✅ Up to two words + a number\n- ❌ Three or more words\n- ❌ A paraphrase or synonym\n⚠️ *Going over the word limit or mis-spelling the word makes the answer wrong, even when the meaning is right.*\n### Step 2 — Read the question and highlight keywords\n_Read across the columns to see what each one holds, then find the cell with the gap._\n→ *Table topic: Development of the bicycle across two centuries*\n**Table structure:**\n- Time period: the decade when each development occurred\n- Features / characteristics: what was notable about bikes in that period — this gap is here\n**Table cell:**\n> 1880s\n> use ............\n→ *This blank is in the Features column for the 1880s row; listen for what new component was used in this decade.*\n### Step 3 — Predict the word form\n_Look at the words around the gap and decide what kind of word belongs there before listening._\nℹ️ *NOUN PHRASE — the phrase 'use ______' needs a noun naming the component or material that was introduced.*\n### Step 4 — Listen and write the answer\n_Follow the table row by row and write the exact words that are said, spelled correctly and within the word limit._\nLocated in **the recording**:\n> \"By the 18 eighties, another big change was **the use of rubber wheels**.\"\n| Clue in the question | Phrase in the recording | Link & reasoning |\n|---|---|---|\n| use | \"the use of\" | **✅** — The recording states \"the use of rubber wheels\", naming the new component introduced in the 1880s. |\n→ *The speaker introduces the change with 'By the 18 eighties, another big change was'.*\n**Completed cell:**\n> 1880s\n> use **rubber wheels**\n✅ **Answer: rubber wheels** — The speaker says another big change was \"the use of rubber wheels\", so the answer is 'rubber wheels'.\n**Verification:**\n- ✅ Spelling: 'rubber wheels' is written exactly as it is said.\n- ✅ Word count: 2 words.",
      "evidence_text": "By the 18 eighties, another big change was the use of rubber wheels.",
      "evidence_source_id": "1",
      "keywords_mapping": [
        {
          "original_text": "the use of rubber wheels",
          "paraphrased_text": "use rubber wheels",
          "mapping_type": "exact_phrase"
        }
      ]
    },
    {
      "id": 1176321,
      "question_number": 37,
      "section_number": 4,
      "question_type": 34,
      "prompt": "{{safer}}",
      "options": [],
      "user_answer": "afs",
      "correct_answer": "safer",
      "is_correct": false,
      "explanation_4_steps": "### Step 1 — Check the word limit\n_Start by checking the instruction to see how many words your answer can have._\n**Instructions:**\n> The answer must be **NO MORE THAN TWO WORDS AND/OR A NUMBER**.\n**Word limit rules:**\n- ✅ Up to two words\n- ✅ A number on its own\n- ✅ Up to two words + a number\n- ❌ Three or more words\n- ❌ A paraphrase or synonym\n⚠️ *Going over the word limit or mis-spelling the word makes the answer wrong, even when the meaning is right.*\n### Step 2 — Read the question and highlight keywords\n_Read across the columns to see what each one holds, then find the cell with the gap._\n→ *Table topic: Development of the bicycle across two centuries*\n**Table structure:**\n- Time period: the decade when each development occurred\n- Features / characteristics: what was notable about bikes in that period — this gap is here\n**Table cell:**\n> 1890s\n> ............\n→ *This blank is in the Features column for the 1890s row; listen for the main improvement or characteristic of bikes in this decade.*\n### Step 3 — Predict the word form\n_Look at the words around the gap and decide what kind of word belongs there before listening._\nℹ️ *ADJECTIVE (comparative) — based on the pattern of other rows, this blank likely needs a word describing an improvement in bike quality or performance.*\n### Step 4 — Listen and write the answer\n_Follow the table row by row and write the exact words that are said, spelled correctly and within the word limit._\nLocated in **the recording**:\n> \"This meant that **bikes became a great deal safer**.\"\n| Clue in the question | Phrase in the recording | Link & reasoning |\n|---|---|---|\n| safer | \"bikes became a great deal\" | **✅** — The recording says \"bikes became a great deal safer\", describing the key improvement in this period. |\n→ *The speaker concludes the discussion of brakes with 'This meant that'.*\n⚠️ *The speaker discusses brakes and stopping mechanisms before stating the overall result; listen for the final conclusion about what bikes became.*\n**Completed cell:**\n> 1890s\n> **safer**\n✅ **Answer: safer** — After explaining the development of brakes, the speaker says \"bikes became a great deal safer\", so the answer is 'safer'.\n**Verification:**\n- ✅ Spelling: 'safer' is written exactly as it is said.\n- ✅ Word count: 1 word.",
      "evidence_text": "This meant that bikes became a great deal safer.",
      "evidence_source_id": "1",
      "keywords_mapping": [
        {
          "original_text": "bikes became a great deal safer",
          "paraphrased_text": "safer",
          "mapping_type": "exact_phrase"
        }
      ]
    },
    {
      "id": 1175912,
      "question_number": 38,
      "section_number": 4,
      "question_type": 8,
      "prompt": "Questions 38-40 Choose THREE letters, A-F. The invention of different gears on a bicycle affected which THREE of the following?",
      "options": [
        {
          "key": "A",
          "text": "Wheel size"
        },
        {
          "key": "B",
          "text": "Balance"
        },
        {
          "key": "C",
          "text": "Rate of speed"
        },
        {
          "key": "D",
          "text": "The back wheel"
        },
        {
          "key": "E",
          "text": "Safety"
        },
        {
          "key": "F",
          "text": "Downhill travel"
        }
      ],
      "user_answer": "Wheel size",
      "correct_answer": "Rate of speed / The back wheel / Downhill travel",
      "is_correct": false,
      "explanation_4_steps": "### Step 1 — Check how many answers are required\n_Check how many answers the instruction asks for and select exactly that many — no more and no fewer._\nℹ️ *Number of answers required: THREE  |  Option range: A-F*\n⚠️ *Choose exactly THREE options — no more and no fewer.*\n### Step 2 — Highlight the keywords in the question and options\n_Read the question and every option, then highlight the keywords in each — the words that carry the meaning._\n**Question:**\n> Questions 38-40 Choose THREE letters, A-F. The **invention of different gears** on a bicycle **affected** which THREE of the following?\n**Options:**\n- **A** — Wheel size\n- **B** — Balance\n- **C** — Rate of speed\n- **D** — The **back wheel**\n- **E** — Safety\n- **F** — Downhill travel\n### Step 3 — Predict what you might hear\n_For each keyword, predict the synonyms or paraphrases you might hear in the recording._\n**Predict what you might hear:**\n- **A** — 'Wheel size': how big the wheels are, diameter of the wheels, the size of the tires\n- **B** — 'Balance': stability, staying upright, keeping steady\n- **C** — 'Rate of speed': fast speeds, how quickly you go, velocity\n- **D** — 'back wheel': rear wheel, the wheel at the back, back tire\n- **E** — 'Safety': being safe, protection, avoiding danger\n- **F** — 'Downhill travel': for downhill, going down slopes, riding down hills\n### Step 4 — Listen and choose the answers\n_Listen carefully and choose the answers, watching for options that are mentioned and then dismissed._\nLocated in **the recording**:\n> \"**Changing gears is what makes those fast speeds possible**.\"\n> \"If you look closely here at the back wheel, you'll see a number of gears.\"\n> \"You'll notice this gear shifting mechanism is **attached to the back wheel**.\"\n> \"So you can put it on a **higher gear for downhill** and a lower gear for uphill travel to make it easier to climb that slope.\"\n| Option | Decision | Evidence in the recording |\n|---|---|---|\n| **A** — Wheel size | **– Not mentioned** | The recording never says that the invention of gears changed or affected wheel size. |\n| **B** — Balance | **– Not mentioned** | Balance is never raised in connection with the invention of gears. |\n| **C** — Rate of speed | **✓ Correct** | 'Changing gears is what makes those fast speeds possible' shows that gears affected the rate of speed. |\n| **D** — The back wheel | **✓ Correct** | 'this gear shifting mechanism is attached to the back wheel' shows that gears affected the back wheel. |\n| **E** — Safety | **– Not mentioned** | Safety is discussed earlier in the recording but never linked to the invention of gears. |\n| **F** — Downhill travel | **✓ Correct** | 'you can put it on a higher gear for downhill' shows that gears affected downhill travel. |\n✅ **Answer: C, D and F** — The speaker says \"Changing gears is what makes those fast speeds possible\", that the mechanism is \"attached to the back wheel\", and that riders can use \"a higher gear for downhill\", which match C, D, and F.",
      "evidence_text": "Changing gears is what makes those fast speeds possible.",
      "evidence_source_id": "1",
      "keywords_mapping": [
        {
          "original_text": "Changing gears",
          "paraphrased_text": "invention of different gears",
          "mapping_type": "rephrasing"
        },
        {
          "original_text": "makes those fast speeds possible",
          "paraphrased_text": "affected",
          "mapping_type": "rephrasing"
        },
        {
          "original_text": "fast speeds",
          "paraphrased_text": "Rate of speed",
          "mapping_type": "rephrasing"
        }
      ]
    },
    {
      "id": 1175913,
      "question_number": 39,
      "section_number": 4,
      "question_type": 8,
      "prompt": "Questions 38-40 Choose THREE letters, A-F. The invention of different gears on a bicycle affected which THREE of the following?",
      "options": [
        {
          "key": "A",
          "text": "Wheel size"
        },
        {
          "key": "B",
          "text": "Balance"
        },
        {
          "key": "C",
          "text": "Rate of speed"
        },
        {
          "key": "D",
          "text": "The back wheel"
        },
        {
          "key": "E",
          "text": "Safety"
        },
        {
          "key": "F",
          "text": "Downhill travel"
        }
      ],
      "user_answer": "Rate of speed",
      "correct_answer": "Rate of speed / The back wheel / Downhill travel",
      "is_correct": true,
      "explanation_4_steps": "### Step 1 — Check how many answers are required\n_Check how many answers the instruction asks for and select exactly that many — no more and no fewer._\nℹ️ *Number of answers required: THREE  |  Option range: A-F*\n⚠️ *Choose exactly THREE options — no more and no fewer.*\n### Step 2 — Highlight the keywords in the question and options\n_Read the question and every option, then highlight the keywords in each — the words that carry the meaning._\n**Question:**\n> Questions 38-40 Choose THREE letters, A-F. The **invention of different gears** on a bicycle **affected** which THREE of the following?\n**Options:**\n- **A** — Wheel size\n- **B** — Balance\n- **C** — Rate of speed\n- **D** — The **back wheel**\n- **E** — Safety\n- **F** — Downhill travel\n### Step 3 — Predict what you might hear\n_For each keyword, predict the synonyms or paraphrases you might hear in the recording._\n**Predict what you might hear:**\n- **A** — 'Wheel size': how big the wheels are, diameter of the wheels, the size of the tires\n- **B** — 'Balance': stability, staying upright, keeping steady\n- **C** — 'Rate of speed': fast speeds, how quickly you go, velocity\n- **D** — 'back wheel': rear wheel, the wheel at the back, back tire\n- **E** — 'Safety': being safe, protection, avoiding danger\n- **F** — 'Downhill travel': for downhill, going down slopes, riding down hills\n### Step 4 — Listen and choose the answers\n_Listen carefully and choose the answers, watching for options that are mentioned and then dismissed._\nLocated in **the recording**:\n> \"**Changing gears is what makes those fast speeds possible**.\"\n> \"If you look closely here at the back wheel, you'll see a number of gears.\"\n> \"You'll notice this gear shifting mechanism is **attached to the back wheel**.\"\n> \"So you can put it on a **higher gear for downhill** and a lower gear for uphill travel to make it easier to climb that slope.\"\n| Option | Decision | Evidence in the recording |\n|---|---|---|\n| **A** — Wheel size | **– Not mentioned** | The recording never says that the invention of gears changed or affected wheel size. |\n| **B** — Balance | **– Not mentioned** | Balance is never raised in connection with the invention of gears. |\n| **C** — Rate of speed | **✓ Correct** | 'Changing gears is what makes those fast speeds possible' shows that gears affected the rate of speed. |\n| **D** — The back wheel | **✓ Correct** | 'this gear shifting mechanism is attached to the back wheel' shows that gears affected the back wheel. |\n| **E** — Safety | **– Not mentioned** | Safety is discussed earlier in the recording but never linked to the invention of gears. |\n| **F** — Downhill travel | **✓ Correct** | 'you can put it on a higher gear for downhill' shows that gears affected downhill travel. |\n✅ **Answer: C, D and F** — The speaker says \"Changing gears is what makes those fast speeds possible\", that the mechanism is \"attached to the back wheel\", and that riders can use \"a higher gear for downhill\", which match C, D, and F.",
      "evidence_text": "",
      "evidence_source_id": "",
      "keywords_mapping": []
    },
    {
      "id": 1175914,
      "question_number": 40,
      "section_number": 4,
      "question_type": 8,
      "prompt": "Questions 38-40 Choose THREE letters, A-F. The invention of different gears on a bicycle affected which THREE of the following?",
      "options": [
        {
          "key": "A",
          "text": "Wheel size"
        },
        {
          "key": "B",
          "text": "Balance"
        },
        {
          "key": "C",
          "text": "Rate of speed"
        },
        {
          "key": "D",
          "text": "The back wheel"
        },
        {
          "key": "E",
          "text": "Safety"
        },
        {
          "key": "F",
          "text": "Downhill travel"
        }
      ],
      "user_answer": "Downhill travel",
      "correct_answer": "Rate of speed / The back wheel / Downhill travel",
      "is_correct": true,
      "explanation_4_steps": "### Step 1 — Check how many answers are required\n_Check how many answers the instruction asks for and select exactly that many — no more and no fewer._\nℹ️ *Number of answers required: THREE  |  Option range: A-F*\n⚠️ *Choose exactly THREE options — no more and no fewer.*\n### Step 2 — Highlight the keywords in the question and options\n_Read the question and every option, then highlight the keywords in each — the words that carry the meaning._\n**Question:**\n> Questions 38-40 Choose THREE letters, A-F. The **invention of different gears** on a bicycle **affected** which THREE of the following?\n**Options:**\n- **A** — Wheel size\n- **B** — Balance\n- **C** — Rate of speed\n- **D** — The **back wheel**\n- **E** — Safety\n- **F** — Downhill travel\n### Step 3 — Predict what you might hear\n_For each keyword, predict the synonyms or paraphrases you might hear in the recording._\n**Predict what you might hear:**\n- **A** — 'Wheel size': how big the wheels are, diameter of the wheels, the size of the tires\n- **B** — 'Balance': stability, staying upright, keeping steady\n- **C** — 'Rate of speed': fast speeds, how quickly you go, velocity\n- **D** — 'back wheel': rear wheel, the wheel at the back, back tire\n- **E** — 'Safety': being safe, protection, avoiding danger\n- **F** — 'Downhill travel': for downhill, going down slopes, riding down hills\n### Step 4 — Listen and choose the answers\n_Listen carefully and choose the answers, watching for options that are mentioned and then dismissed._\nLocated in **the recording**:\n> \"**Changing gears is what makes those fast speeds possible**.\"\n> \"If you look closely here at the back wheel, you'll see a number of gears.\"\n> \"You'll notice this gear shifting mechanism is **attached to the back wheel**.\"\n> \"So you can put it on a **higher gear for downhill** and a lower gear for uphill travel to make it easier to climb that slope.\"\n| Option | Decision | Evidence in the recording |\n|---|---|---|\n| **A** — Wheel size | **– Not mentioned** | The recording never says that the invention of gears changed or affected wheel size. |\n| **B** — Balance | **– Not mentioned** | Balance is never raised in connection with the invention of gears. |\n| **C** — Rate of speed | **✓ Correct** | 'Changing gears is what makes those fast speeds possible' shows that gears affected the rate of speed. |\n| **D** — The back wheel | **✓ Correct** | 'this gear shifting mechanism is attached to the back wheel' shows that gears affected the back wheel. |\n| **E** — Safety | **– Not mentioned** | Safety is discussed earlier in the recording but never linked to the invention of gears. |\n| **F** — Downhill travel | **✓ Correct** | 'you can put it on a higher gear for downhill' shows that gears affected downhill travel. |\n✅ **Answer: C, D and F** — The speaker says \"Changing gears is what makes those fast speeds possible\", that the mechanism is \"attached to the back wheel\", and that riders can use \"a higher gear for downhill\", which match C, D, and F.",
      "evidence_text": "",
      "evidence_source_id": "",
      "keywords_mapping": []
    }
  ]
};
