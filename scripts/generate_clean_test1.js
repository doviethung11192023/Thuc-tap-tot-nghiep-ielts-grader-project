const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '../frontend/src/mocks/clean-dataset');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Helper: Convert table_data into an HTML table with {{qNum}} input slots
function tableDataToHtml(td, qIdToGlobalNum) {
  if (!td || !td.cells) return '';
  let html = '<div class="overflow-x-auto my-4"><table class="w-full border-collapse border border-zinc-200 text-sm">';
  const numRows = td.number_of_row || 0;
  const numCols = td.number_of_column || 0;
  let cellIdx = 0;
  for (let r = 0; r < numRows; r++) {
    html += '<tr>';
    for (let c = 0; c < numCols; c++) {
      const cell = td.cells[cellIdx++];
      if (!cell) continue;
      const tag = cell.is_header ? 'th' : 'td';
      const bg = cell.is_header ? 'bg-zinc-100 font-bold text-zinc-900' : 'bg-white text-zinc-800';
      html += `<${tag} class="border border-zinc-200 p-2.5 ${bg}">`;
      cell.data.forEach(item => {
        if (item.is_input) {
          const qNum = qIdToGlobalNum[item.question_id] || item.question_number;
          html += ` {{${qNum}}} `;
        } else {
          html += item.value || '';
        }
      });
      html += `</${tag}>`;
    }
    html += '</tr>';
  }
  html += '</table></div>';
  return html;
}

// Format milliseconds to MM:SS
function formatMs(ms) {
  if (!ms && ms !== 0) return '00:00';
  const totalSec = Math.floor(ms / 1000);
  const mm = Math.floor(totalSec / 60).toString().padStart(2, '0');
  const ss = (totalSec % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
}

// ==========================================
// 1. PROCESS READING TEST 1
// ==========================================
const rDeBai = JSON.parse(fs.readFileSync('D:/ielts-dataset/prep_crawled_dataset/de_bai_clean/listening_reading/445_Recent_Actual_Test/test_25863_Test_1/reading_de_bai.json', 'utf8')).data;
const rBaiLam = JSON.parse(fs.readFileSync('D:/ielts-dataset/prep_crawled_dataset/dap_an_loi_giai_clean/listening_reading/445_Recent_Actual_Test/test_25863_Test_1/reading_bai_lam_hoc_vien.json', 'utf8')).data;
const rLoiGiai = JSON.parse(fs.readFileSync('D:/ielts-dataset/prep_crawled_dataset/dap_an_loi_giai_clean/listening_reading/445_Recent_Actual_Test/test_25863_Test_1/reading_loi_giai_chi_tiet_4_buoc.json', 'utf8')).evidences;

const rLoiGiaiMap = {};
rLoiGiai.forEach(ev => {
  rLoiGiaiMap[ev.question_id] = ev.detail_explanation;
});

// Map questions from bailam by question ID to get correct_answers, user_answers, options
const rBailamQMap = {};
rBaiLam.test.sections.forEach(sec => {
  sec.exercises.forEach(ex => {
    ex.questions.forEach(q => {
      rBailamQMap[q.id] = q;
    });
  });
});

let rGlobalNum = 0;
const rQIdToGlobalNum = {};
const rUserAnswers = {};
const rQuestionDetails = {};

const cleanReadingTestData = {
  test_id: 'test-1',
  title: 'Recent Actual Test - Academic Reading Test 1',
  passages: rDeBai.sections.map((sec, secIdx) => {
    return {
      passage: {
        id: 'p' + (secIdx + 1),
        title: sec.title + ': ' + (sec.element?.evidence_extract?.passage_meta?.title || ''),
        content: sec.element?.content || '',
        paragraphs: (sec.element?.evidence_extract?.paragraphs || []).map(p => ({
          id: p.id,
          text: p.text
        }))
      },
      question_groups: sec.exercises.map((ex, exIdx) => {
        let qType = 'sentence_completion';
        if (ex.type === 21) qType = 'true_false_not_given';
        else if (ex.type === 22) qType = 'yes_no_not_given';
        else if (ex.type === 7) qType = 'matching_headings';
        else if (ex.type === 2) qType = 'multiple_choice';

        const questionsList = ex.questions.map(q => {
          rGlobalNum++;
          const qNum = rGlobalNum;
          rQIdToGlobalNum[q.id] = qNum;

          const blQ = rBailamQMap[q.id] || {};
          const cAns = blQ.correct_answer !== undefined ? blQ.correct_answer : q.correct_answer;
          const uAns = blQ.user_answer ? (typeof blQ.user_answer.answer === 'string' ? blQ.user_answer.answer : JSON.stringify(blQ.user_answer.answer)) : '';
          const isCor = blQ.user_answer ? !!blQ.user_answer.is_correct : false;
          const exp = rLoiGiaiMap[q.id] || q.explanation || blQ.explanation || '';

          const correctAnswersArray = Array.isArray(cAns) 
            ? cAns.map(String) 
            : (cAns !== undefined && cAns !== null ? [String(cAns)] : []);

          rUserAnswers[qNum] = uAns;
          rQuestionDetails[qNum] = {
            question_id: q.id,
            question_number: qNum,
            prompt: q.title || blQ.title || '',
            user_answer: uAns,
            correct_answers: correctAnswersArray,
            is_correct: isCor,
            explanation: exp
          };

          const options = (blQ.answers && blQ.answers.length > 0) ? blQ.answers : (q.answers || []);
          const optionsPool = options.map(a => ({ key: a.value, text: a.label }));

          return {
            question_number: qNum,
            prompt: q.title || blQ.title || undefined,
            correct_answers: correctAnswersArray,
            explanation: exp,
            options_pool: optionsPool.length > 0 ? optionsPool : undefined
          };
        });

        // Convert template placeholders if body exists
        let template = ex.body || undefined;
        if (template) {
          let replacedCount = 0;
          template = template.replace(/{{[^}]+}}/g, () => {
            const targetQ = questionsList[replacedCount++];
            return targetQ ? `{{${targetQ.question_number}}}` : '';
          });
        }

        // Group-level options pool for matching or single choice
        let groupOptionsPool = null;
        if (ex.questions[0]) {
          const sampleBlQ = rBailamQMap[ex.questions[0].id] || {};
          const sampleOpts = (sampleBlQ.answers && sampleBlQ.answers.length > 0) ? sampleBlQ.answers : (ex.questions[0].answers || []);
          if (sampleOpts && sampleOpts.length > 0) {
            groupOptionsPool = sampleOpts.map(a => ({ key: a.value, text: a.label }));
          }
        }

        return {
          group_id: `g${exIdx + 1}_p${secIdx + 1}`,
          question_type: qType,
          instruction: ex.content || 'Answer the questions.',
          template: template,
          options_pool: groupOptionsPool,
          questions: questionsList
        };
      })
    };
  })
};

const cleanReadingSubmission = {
  test_id: 'test-1',
  raw_id: 25863,
  title: 'Recent Actual Test - Reading Test 1',
  band_score: 4.0,
  correct_count: rBaiLam.correct_answer || 10,
  total_questions: 40,
  time_spent: rBaiLam.time_spent || 95,
  submitted_at: '15:43 12/10/2026',
  task_formats_result: rBaiLam.task_formats_result,
  user_answers: rUserAnswers,
  questions: rQuestionDetails
};

const readingFileContent = `import { ReadingTestData } from '@/types/exam';

export const cleanReadingTest1Data: ReadingTestData = ${JSON.stringify(cleanReadingTestData, null, 2)};

export const cleanReadingTest1Submission = ${JSON.stringify(cleanReadingSubmission, null, 2)};
`;

fs.writeFileSync(path.join(outDir, 'reading-test-1-clean.ts'), readingFileContent);
console.log('Successfully written reading-test-1-clean.ts. Total questions:', rGlobalNum);

// ==========================================
// 2. PROCESS LISTENING TEST 1
// ==========================================
const lDeBai = JSON.parse(fs.readFileSync('D:/ielts-dataset/prep_crawled_dataset/de_bai_clean/listening_reading/445_Recent_Actual_Test/test_25863_Test_1/listening_de_bai.json', 'utf8')).data;
const lBaiLam = JSON.parse(fs.readFileSync('D:/ielts-dataset/prep_crawled_dataset/dap_an_loi_giai_clean/listening_reading/445_Recent_Actual_Test/test_25863_Test_1/listening_bai_lam_hoc_vien.json', 'utf8')).data;
const lLoiGiai = JSON.parse(fs.readFileSync('D:/ielts-dataset/prep_crawled_dataset/dap_an_loi_giai_clean/listening_reading/445_Recent_Actual_Test/test_25863_Test_1/listening_loi_giai_chi_tiet_4_buoc.json', 'utf8')).evidences;

const lLoiGiaiMap = {};
lLoiGiai.forEach(ev => {
  lLoiGiaiMap[ev.question_id] = ev.detail_explanation;
});

const lBailamQMap = {};
lBaiLam.test.sections.forEach(sec => {
  sec.exercises.forEach(ex => {
    ex.questions.forEach(q => {
      lBailamQMap[q.id] = q;
    });
  });
});

let lGlobalNum = 0;
const lQIdToGlobalNum = {};
const lUserAnswers = {};
const lQuestionDetails = {};

const cleanListeningTestData = {
  test_id: 'test-1',
  title: 'Recent Actual Test - Academic Listening Test 1',
  total_duration_minutes: 30,
  sections: lDeBai.sections.map((sec, secIdx) => {
    const utterances = sec.element?.evidence_extract?.utterances || [];
    const transcripts = utterances.map((u, uIdx) => ({
      id: `u_${secIdx + 1}_${uIdx + 1}`,
      timestamp: formatMs(u.start_timestamp),
      speaker: u.name || 'Speaker',
      text: u.text
    }));

    return {
      section_number: secIdx + 1,
      title: sec.title,
      audio_url: sec.element?.media_path || 'https://storage.googleapis.com/prep-storage-service/lms/elements/IELTS-Recent-Actual-Test-With-Answers-Pr-2b2150e2.mp3',
      duration_seconds: secIdx === 0 ? 435 : 450,
      transcripts: transcripts.length > 0 ? transcripts : [
        {
          id: 't1',
          timestamp: '00:15',
          speaker: 'Speaker',
          text: `Section ${secIdx + 1}. Listen carefully and answer the questions.`
        }
      ],
      question_groups: sec.exercises.map((ex, exIdx) => {
        let qType = 'sentence_completion';
        if (ex.type === 7) qType = 'matching_features';
        else if (ex.type === 8) qType = 'multiple_choice';
        else if (ex.type === 34) qType = 'table_completion';
        else if (ex.type === 1) qType = 'sentence_completion';

        const questionsList = ex.questions.map(q => {
          lGlobalNum++;
          const qNum = lGlobalNum;
          lQIdToGlobalNum[q.id] = qNum;

          const blQ = lBailamQMap[q.id] || {};
          const cAns = blQ.correct_answer !== undefined ? blQ.correct_answer : q.correct_answer;
          const uAns = blQ.user_answer ? (typeof blQ.user_answer.answer === 'string' ? blQ.user_answer.answer : JSON.stringify(blQ.user_answer.answer)) : '';
          const isCor = blQ.user_answer ? !!blQ.user_answer.is_correct : false;
          const exp = lLoiGiaiMap[q.id] || q.explanation || blQ.explanation || '';

          const correctAnswersArray = Array.isArray(cAns) 
            ? cAns.map(String) 
            : (cAns !== undefined && cAns !== null ? [String(cAns)] : []);

          lUserAnswers[qNum] = uAns;
          lQuestionDetails[qNum] = {
            question_id: q.id,
            question_number: qNum,
            prompt: q.title || blQ.title || '',
            user_answer: uAns,
            correct_answers: correctAnswersArray,
            is_correct: isCor,
            explanation: exp
          };

          const options = (blQ.answers && blQ.answers.length > 0) ? blQ.answers : (q.answers || []);
          const optionsPool = options.map(a => ({ key: a.value, text: a.label }));

          return {
            question_number: qNum,
            prompt: q.title || blQ.title || undefined,
            correct_answers: correctAnswersArray,
            explanation: exp,
            options_pool: optionsPool.length > 0 ? optionsPool : undefined
          };
        });

        // Determine template: table_data or body
        let template = undefined;
        if (ex.table_data) {
          template = tableDataToHtml(ex.table_data, lQIdToGlobalNum);
        } else if (ex.body) {
          let replacedCount = 0;
          template = ex.body.replace(/{{[^}]+}}/g, () => {
            const targetQ = questionsList[replacedCount++];
            return targetQ ? `{{${targetQ.question_number}}}` : '';
          });
        }

        // Group options pool
        let groupOptionsPool = null;
        if (ex.questions[0]) {
          const sampleBlQ = lBailamQMap[ex.questions[0].id] || {};
          const sampleOpts = (sampleBlQ.answers && sampleBlQ.answers.length > 0) ? sampleBlQ.answers : (ex.questions[0].answers || []);
          if (sampleOpts && sampleOpts.length > 0) {
            groupOptionsPool = sampleOpts.map(a => ({ key: a.value, text: a.label }));
          }
        }

        return {
          group_id: `g${exIdx + 1}_s${secIdx + 1}`,
          question_type: qType,
          instruction: ex.title || ex.content || 'Answer the questions.',
          template: template,
          options_pool: groupOptionsPool,
          questions: questionsList
        };
      })
    };
  })
};

const cleanListeningSubmission = {
  test_id: 'test-1',
  raw_id: 25863,
  title: 'Recent Actual Test - Listening Test 1',
  band_score: 4.5,
  correct_count: lBaiLam.correct_answer || 13,
  total_questions: 40,
  time_spent: lBaiLam.time_spent || 515,
  submitted_at: '21:31 12/10/2026',
  task_formats_result: lBaiLam.task_formats_result,
  user_answers: lUserAnswers,
  questions: lQuestionDetails
};

const listeningFileContent = `import { ListeningTestData } from '@/mocks/exam-listening';

export const cleanListeningTest1Data: ListeningTestData = ${JSON.stringify(cleanListeningTestData, null, 2)};

export const cleanListeningTest1Submission = ${JSON.stringify(cleanListeningSubmission, null, 2)};
`;

fs.writeFileSync(path.join(outDir, 'listening-test-1-clean.ts'), listeningFileContent);
console.log('Successfully written listening-test-1-clean.ts. Total questions:', lGlobalNum);
