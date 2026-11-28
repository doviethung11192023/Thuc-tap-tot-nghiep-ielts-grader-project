// Kịch bản k6: một Learner làm bài Writing Task 2 (Practice) từ lúc vào danh mục tới lúc nộp.
//
// Vì sao chọn Writing: nộp bài Writing tạo grading_run, đẩy vào hàng đợi ARQ và worker gọi AI engine (ở đây là stub),
// nên đo được cả đường API -> DB -> Redis -> worker, không chỉ API đồng bộ như Reading/Listening (chấm ngay tại Core).
//
// Mỗi vòng lặp của một VU:
//   1. GET  /test-practice/tests?skill=writing            danh sách đề (cache Redis)
//   2. GET  /test-practice/tests/{id}/content             chi tiết đề (cache Redis)
//   3. POST /test-practice/attempts/start                 bắt đầu bài làm
//   4. PUT  /test-practice/attempts/{id}/work             tự lưu mỗi 12-18 s trong WORK_SECONDS giây
//   5. POST /test-practice/attempts/start (lần 2)         [mẫu VU] đọc lại bản đã lưu trên server, so với lần lưu cuối
//   6. POST /test-practice/attempts/{id}/submit-writing   nộp, tạo job chấm
//   7. GET  /test-practice/attempts/{id}/summary          [mẫu VU] nội dung bài đã lưu sau khi nộp phải bằng bản đã nộp
//
// Chạy:  STAGES=smoke k6 run loadtest/k6/exam-flow.js   (biến môi trường xem loadtest/README.md)
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';

const BASE_URL = (__ENV.BASE_URL || 'http://localhost:8000').replace(/\/$/, '') + '/api/v1/test-practice';
const WORK_SECONDS = Number(__ENV.WORK_SECONDS || 45);       // thời gian "làm bài" trước khi nộp
const SAMPLE_RATE = Number(__ENV.DATALOSS_SAMPLE || 0.2);    // tỉ lệ VU kiểm mất dữ liệu (smoke: dùng 1 để kiểm hết)
const TEST_ID = __ENV.TEST_ID || '';                         // trống: lấy đề Writing đầu tiên của danh mục
const STAGES = __ENV.STAGES || 'smoke';
const HOLD = __ENV.HOLD;                                     // ghi đè thời gian giữ tải, ví dụ "10m"

const tokens = JSON.parse(open(__ENV.TOKENS_FILE || '../.tokens.json')).users;

const dataLossChecks = new Counter('dataloss_checks');
const dataLossFailures = new Counter('dataloss_failures');

// Bậc tải: [thời lượng, số VU đích]. gracefulStop đủ dài để vòng lặp đang chạy kịp nộp bài.
const PRESETS = {
  smoke: { executor: 'constant-vus', vus: 5, duration: '1m' },
  s50: ramp([['30s', 50], [HOLD || '3m', 50], ['30s', 0]]),
  s300: ramp([['1m', 300], [HOLD || '5m', 300], ['30s', 0]]),
  s1000: ramp([['2m', 1000], [HOLD || '5m', 1000], ['30s', 0]]),
};

function ramp(stages) {
  return { executor: 'ramping-vus', startVUs: 0, gracefulRampDown: '90s',
           stages: stages.map(([duration, target]) => ({ duration, target })) };
}

const scenario = PRESETS[STAGES];
if (!scenario) throw new Error(`STAGES phải là một trong: ${Object.keys(PRESETS).join(', ')}`);
scenario.gracefulStop = '120s';
const maxVus = scenario.vus || Math.max(...scenario.stages.map((s) => s.target));
const canCheckDataLoss = tokens.length >= maxVus;  // dùng chung tài khoản thì hai VU ghi đè bài của nhau, không kiểm được

export const options = {
  scenarios: { exam: scenario },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],   // p99 cho bảng báo cáo
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1000'],
    // Ngưỡng riêng từng loại request (cũng để k6 đưa p50/p95/p99 từng loại vào --summary-export)
    'http_req_duration{name:list_tests}': ['p(95)<1000'],
    'http_req_duration{name:test_content}': ['p(95)<1000'],
    'http_req_duration{name:start_attempt}': ['p(95)<1000'],
    'http_req_duration{name:autosave}': ['p(95)<1000'],
    'http_req_duration{name:submit_writing}': ['p(95)<1000'],
    'http_req_duration{name:summary}': ['p(95)<1000'],
    checks: ['rate>0.99'],
    dataloss_failures: ['count==0'],
  },
};

const SENTENCES = [
  'Many people argue that technology has made modern life considerably easier for ordinary families.',
  'However, others claim that the same tools have weakened face to face communication in local communities.',
  'In my opinion, the benefits are real, but they depend on how responsibly each person uses them.',
  'For instance, online classes allow students in remote areas to reach teachers they would never meet otherwise.',
  'On the other hand, long hours in front of a screen can harm both physical health and concentration.',
  'Governments should therefore invest in digital education so that people learn to balance these effects.',
];

function jsonHeaders(token) {
  return { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } };
}

function api(method, path, body, token, name) {
  const params = { ...(token ? jsonHeaders(token) : {}), tags: { name } };
  const url = `${BASE_URL}${path}`;
  return method === 'GET' ? http.get(url, params) : http.request(method, url, JSON.stringify(body), params);
}

// Chạy một lần trước khi bắt đầu: chọn đề Writing mà mọi VU cùng làm.
export function setup() {
  if (tokens.length === 0) throw new Error('Không có token: chạy loadtest/scripts/seed_accounts.py trước');
  if (!canCheckDataLoss) {
    console.warn(`Chỉ có ${tokens.length} tài khoản cho ${maxVus} VU: VU dùng chung tài khoản, tắt kiểm mất dữ liệu`);
  }
  if (TEST_ID) return { testId: TEST_ID };
  const res = http.get(`${BASE_URL}/tests?skill=writing&limit=12`);
  const items = (res.json('data.items') || []);
  if (res.status !== 200 || items.length === 0) {
    throw new Error(`Không lấy được đề Writing đã publish (HTTP ${res.status}); đặt TEST_ID thủ công`);
  }
  return { testId: items[0].id };
}

export default function (data) {
  const token = tokens[(__VU - 1) % tokens.length].access_token;
  const sampled = canCheckDataLoss && Math.random() < SAMPLE_RATE;

  // 1-2. Vào danh mục rồi mở đề
  const list = api('GET', '/tests?skill=writing&limit=12', null, null, 'list_tests');
  check(list, { 'list tests 200': (r) => r.status === 200 });
  sleep(1 + Math.random() * 2);
  const content = api('GET', `/tests/${data.testId}/content?skill=writing`, null, null, 'test_content');
  check(content, { 'test content 200': (r) => r.status === 200 });

  // 3. Bắt đầu bài làm
  const start = api('POST', '/attempts/start', { test_id: data.testId, mode: 'practice', skill: 'writing' }, token, 'start_attempt');
  const started = check(start, { 'start attempt 201': (r) => r.status === 201 });
  if (!started) { sleep(5); return; }
  const attemptId = start.json('data.attempt_id');

  // 4. Làm bài: mỗi lần tự lưu bản dài hơn; chữ đầu bài là duy nhất để job chấm không trúng cache kết quả của Core
  let text = `[loadtest vu${__VU} iter${__ITER} ${Date.now()}] ${SENTENCES[0]}`;
  const workStart = Date.now();
  let saves = 0;
  do {
    sleep(12 + Math.random() * 6);
    text += ' ' + SENTENCES[(saves + 1) % SENTENCES.length];
    const save = api('PUT', `/attempts/${attemptId}/work`, { task2_text: text, parts: '2' }, token, 'autosave');
    check(save, { 'autosave 200': (r) => r.status === 200 });
    saves += 1;
  } while (Date.now() - workStart < WORK_SECONDS * 1000);

  // 5. [mẫu] mở lại bài (như đổi máy / tải lại trang): bản server giữ phải bằng bản lưu cuối
  if (sampled) {
    const resume = api('POST', '/attempts/start', { test_id: data.testId, mode: 'practice', skill: 'writing' }, token, 'resume_attempt');
    const saved = resume.json('data.saved_work.essays.2');
    dataLossChecks.add(1);
    const same = check(resume, {
      'resume returns same attempt': (r) => r.json('data.attempt_id') === attemptId,
      'saved work equals last autosave': () => saved === text,
    });
    if (!same) dataLossFailures.add(1);
  }

  // 6. Nộp bài: tạo grading_run và đẩy vào hàng đợi
  const submit = api('POST', `/attempts/${attemptId}/submit-writing`,
    { task2_text: text, parts: '2', time_spent_sec: Math.round((Date.now() - workStart) / 1000) }, token, 'submit_writing');
  check(submit, { 'submit writing 200': (r) => r.status === 200 });

  // 7. [mẫu] bài đã nộp phải còn nguyên nội dung
  if (sampled && submit.status === 200) {
    const summary = api('GET', `/attempts/${attemptId}/summary`, null, token, 'summary');
    const tasks = summary.json('data.writing.tasks') || [];
    const stored = (tasks.find((t) => t.task_no === 2) || {}).content;
    dataLossChecks.add(1);
    const intact = check(summary, { 'submitted content equals last autosave': () => stored === text });
    if (!intact) dataLossFailures.add(1);
  }
  sleep(2 + Math.random() * 3);
}
