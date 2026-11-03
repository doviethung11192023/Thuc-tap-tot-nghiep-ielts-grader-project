-- =====================================================================
-- BASELINE — schema duy nhất của hệ thống (docs/source-of-truth.md §7)
-- ---------------------------------------------------------------------
-- 33 bảng + 3 view theo thiết kế, 16 ràng buộc nghiệp vụ, trigger, RLS chỉ đọc,
-- cộng các cột/bảng ngoài sơ đồ đã ghi trong source-of-truth (§7, §12).
-- Dựng môi trường mới (NFR-10): psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -1 -f <file này>
-- Project hiện tại đã có schema này (cutover 2026-11-03), KHÔNG chạy lại.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;   -- EXCLUDE trên band_conversions

-- 1. KIỂU DỮ LIỆU ---------------------------------------------------------
CREATE DOMAIN public.band AS numeric(2,1)
  CHECK (VALUE BETWEEN 0 AND 9 AND VALUE * 2 = trunc(VALUE * 2));            -- BR-01

CREATE TYPE public.user_role         AS ENUM ('learner', 'expert', 'admin');
CREATE TYPE public.skill             AS ENUM ('listening', 'reading', 'writing', 'speaking');
CREATE TYPE public.test_mode         AS ENUM ('practice', 'mock');
CREATE TYPE public.allowed_mode      AS ENUM ('practice', 'mock', 'both');
CREATE TYPE public.content_status    AS ENUM ('draft', 'published', 'archived');
CREATE TYPE public.source_type       AS ENUM ('original', 'open_licence', 'public_domain');
CREATE TYPE public.section_kind      AS ENUM ('lr', 'writing', 'speaking');
CREATE TYPE public.writing_task_type AS ENUM ('task1', 'task2');
CREATE TYPE public.question_type     AS ENUM ('multiple_choice', 'true_false_not_given', 'matching',
                                          'completion', 'short_answer');
CREATE TYPE public.attempt_status    AS ENUM ('in_progress', 'submitted', 'grading', 'grading_failed',
                                          'no_speech', 'waiting_expert', 'scored', 'abandoned');
CREATE TYPE public.session_status    AS ENUM ('in_progress', 'completed', 'abandoned');
CREATE TYPE public.evaluator_type    AS ENUM ('ai', 'expert');
CREATE TYPE public.evaluation_status AS ENUM ('pending', 'draft', 'done', 'failed');
CREATE TYPE public.run_status        AS ENUM ('running', 'done', 'failed');
CREATE TYPE public.review_status     AS ENUM ('waiting', 'assigned', 'completed', 'cancelled');
CREATE TYPE public.assignment_end    AS ENUM ('completed', 'expired', 'reassigned');
CREATE TYPE public.annotation_type   AS ENUM ('error', 'upgrade', 'logic_issue', 'strength');
CREATE TYPE public.actor_type        AS ENUM ('admin', 'system');

-- BR-02: làm tròn band IELTS (.25 → .5, .75 → lên band kế tiếp)
CREATE FUNCTION public.ielts_round(x numeric) RETURNS numeric
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT CASE
           WHEN x IS NULL THEN NULL
           WHEN x - floor(x) < 0.25 THEN floor(x)
           WHEN x - floor(x) < 0.75 THEN floor(x) + 0.5
           ELSE floor(x) + 1
         END::numeric(2,1)
$$;

-- 2. NGƯỜI DÙNG VÀ HỆ THỐNG (6) ----------------------------------------------
CREATE TABLE public.profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      text NOT NULL UNIQUE,
  full_name  text NOT NULL,
  avatar_key text,
  role       public.user_role NOT NULL DEFAULT 'learner',
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, role)                                   -- đích của FK ghép (id, role)
);

CREATE TABLE public.learner_profiles (
  user_id          uuid PRIMARY KEY,
  role             public.user_role NOT NULL DEFAULT 'learner' CHECK (role = 'learner'),
  target_overall   public.band,
  target_listening public.band,
  target_reading   public.band,
  target_writing   public.band,
  target_speaking  public.band,
  test_date        date,
  voice_consent_at timestamptz,
  FOREIGN KEY (user_id, role) REFERENCES public.profiles (id, role) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE public.expert_profiles (
  user_id            uuid PRIMARY KEY,
  role               public.user_role NOT NULL DEFAULT 'expert' CHECK (role = 'expert'),
  is_available       boolean NOT NULL DEFAULT false,
  max_active_reviews smallint NOT NULL DEFAULT 5 CHECK (max_active_reviews > 0),
  bio                text,
  ielts_band         public.band,
  FOREIGN KEY (user_id, role) REFERENCES public.profiles (id, role) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE public.audit_logs (                          -- ràng buộc 16
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_type public.actor_type NOT NULL DEFAULT 'admin',
  admin_id   uuid,
  admin_role public.user_role CHECK (admin_role = 'admin'),
  action     text NOT NULL,
  entity     text NOT NULL,
  entity_id  text,
  before     jsonb,
  after      jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((actor_type = 'system') = (admin_id IS NULL)),
  CHECK ((admin_id IS NULL) = (admin_role IS NULL)),
  FOREIGN KEY (admin_id, admin_role) REFERENCES public.profiles (id, role)
);
CREATE INDEX idx_audit_entity ON public.audit_logs (entity, entity_id, created_at DESC);

CREATE TABLE public.system_settings (
  key        text PRIMARY KEY,
  value      jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  admin_role public.user_role CHECK (admin_role = 'admin'),
  CHECK ((updated_by IS NULL) = (admin_role IS NULL)),
  FOREIGN KEY (updated_by, admin_role) REFERENCES public.profiles (id, role)
);

CREATE TABLE public.band_conversions (                    -- BR-03, ràng buộc 15
  skill      text NOT NULL CHECK (skill IN ('listening', 'reading')),   -- text để dùng được trong EXCLUDE gist
  raw_min    smallint NOT NULL CHECK (raw_min BETWEEN 0 AND 40),
  raw_max    smallint NOT NULL CHECK (raw_max BETWEEN 0 AND 40),
  band       public.band NOT NULL,
  updated_by uuid,
  admin_role public.user_role CHECK (admin_role = 'admin'),
  PRIMARY KEY (skill, raw_min),
  CHECK (raw_min <= raw_max),
  CHECK ((updated_by IS NULL) = (admin_role IS NULL)),
  FOREIGN KEY (updated_by, admin_role) REFERENCES public.profiles (id, role),
  EXCLUDE USING gist (skill WITH =, int4range(raw_min, raw_max, '[]') WITH &&)
);

-- 3. NỘI DUNG ĐỀ (14) ------------------------------------------------------------
CREATE TABLE public.test_sets (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  description text,
  status      public.content_status NOT NULL DEFAULT 'draft',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.tests (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title               text NOT NULL,
  skill               public.skill NOT NULL,
  allowed_mode        public.allowed_mode NOT NULL DEFAULT 'both',
  status              public.content_status NOT NULL DEFAULT 'draft',
  version             integer NOT NULL DEFAULT 1 CHECK (version >= 1),
  previous_version_id uuid REFERENCES public.tests(id),
  duration_minutes    smallint CHECK (duration_minutes > 0),
  source_type         public.source_type NOT NULL DEFAULT 'original',
  source_name         text,
  license             text,
  test_set_id         uuid REFERENCES public.test_sets(id),
  author_id           uuid,
  author_role         public.user_role CHECK (author_role = 'admin'),
  reviewer_id         uuid,
  reviewer_role       public.user_role CHECK (reviewer_role = 'admin'),
  reviewed_at         timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, skill),
  UNIQUE (test_set_id, skill),                        -- mỗi bộ đề Mock: 1 đề/kỹ năng
  CHECK ((author_id IS NULL) = (author_role IS NULL)),
  CHECK ((reviewer_id IS NULL) = (reviewer_role IS NULL)),
  CHECK (status = 'draft' OR (reviewer_id IS NOT NULL AND reviewed_at IS NOT NULL)),   -- BR-18
  CHECK (source_type = 'original' OR license IS NOT NULL),
  FOREIGN KEY (author_id, author_role)     REFERENCES public.profiles (id, role),
  FOREIGN KEY (reviewer_id, reviewer_role) REFERENCES public.profiles (id, role)
);

CREATE TABLE public.sections (                            -- ràng buộc 1
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id  uuid NOT NULL,
  skill    public.skill NOT NULL,
  kind     public.section_kind NOT NULL,
  order_no smallint NOT NULL CHECK (order_no >= 1),
  title    text,
  UNIQUE (test_id, order_no),
  UNIQUE (id, kind),
  UNIQUE (id, test_id),
  CHECK (kind = CASE skill WHEN 'writing' THEN 'writing'::public.section_kind
                           WHEN 'speaking' THEN 'speaking'::public.section_kind
                           ELSE 'lr'::public.section_kind END),
  FOREIGN KEY (test_id, skill) REFERENCES public.tests (id, skill) ON DELETE CASCADE
);

CREATE TABLE public.lr_sections (
  section_id uuid PRIMARY KEY,
  kind       public.section_kind NOT NULL DEFAULT 'lr' CHECK (kind = 'lr'),
  passage    text,                                    -- Reading
  audio_key  text,                                    -- Listening (R2)
  transcript text,                                    -- Listening, chỉ trả về sau khi nộp
  FOREIGN KEY (section_id, kind) REFERENCES public.sections (id, kind) ON DELETE CASCADE
);

CREATE TABLE public.writing_tasks (
  section_id        uuid PRIMARY KEY,
  kind              public.section_kind NOT NULL DEFAULT 'writing' CHECK (kind = 'writing'),
  task_type         public.writing_task_type NOT NULL,
  prompt_category   text,                             -- dạng biểu đồ (Task 1) / dạng đề (Task 2)
  task_prompt       text NOT NULL,
  chart_image_key   text,                             -- Task 1 (R2)
  chart_description text,                             -- mô tả số liệu Task 1 gửi cho AI
  min_words         smallint NOT NULL CHECK (min_words > 0),
  FOREIGN KEY (section_id, kind) REFERENCES public.sections (id, kind) ON DELETE CASCADE
);

CREATE TABLE public.speaking_parts (
  section_id     uuid PRIMARY KEY,
  kind           public.section_kind NOT NULL DEFAULT 'speaking' CHECK (kind = 'speaking'),
  topic          text,
  prep_seconds   smallint NOT NULL DEFAULT 0  CHECK (prep_seconds >= 0),
  answer_seconds smallint NOT NULL DEFAULT 45 CHECK (answer_seconds > 0),   -- BR-13
  FOREIGN KEY (section_id, kind) REFERENCES public.sections (id, kind) ON DELETE CASCADE
);

CREATE TABLE public.question_groups (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lr_section_id uuid NOT NULL REFERENCES public.lr_sections(section_id) ON DELETE CASCADE,
  order_no      smallint NOT NULL,
  question_type public.question_type NOT NULL,
  subtype       text,                                 -- biến thể giao diện: summary/table_completion, matching_headings...
  instructions  text,
  template      text,                                 -- đoạn văn/bảng có chỗ trống {{n}} cho dạng completion
  image_key     text,
  select_count  smallint CHECK (select_count > 0),    -- "Choose N letters"
  allow_reuse   boolean NOT NULL DEFAULT false,       -- matching: lựa chọn dùng lại được
  max_words     smallint CHECK (max_words > 0),
  UNIQUE (lr_section_id, order_no),
  UNIQUE (id, lr_section_id)
);

CREATE TABLE public.group_options (
  group_id uuid NOT NULL REFERENCES public.question_groups(id) ON DELETE CASCADE,
  label    text NOT NULL,
  text     text NOT NULL,
  PRIMARY KEY (group_id, label)
);

CREATE TABLE public.questions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id      uuid NOT NULL,
  lr_section_id uuid NOT NULL,                        -- điền bởi trigger fill_question_section
  number        smallint NOT NULL CHECK (number BETWEEN 1 AND 40),
  prompt        text,
  UNIQUE (lr_section_id, number),
  UNIQUE (id, lr_section_id),
  FOREIGN KEY (group_id, lr_section_id) REFERENCES public.question_groups (id, lr_section_id) ON DELETE CASCADE
);

CREATE TABLE public.question_options (
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  label       text NOT NULL,
  text        text NOT NULL,
  PRIMARY KEY (question_id, label)
);

CREATE TABLE public.question_keys (                       -- ràng buộc 8: Learner không đọc được
  question_id      uuid PRIMARY KEY REFERENCES public.questions(id) ON DELETE CASCADE,
  accepted_answers text[] NOT NULL CHECK (cardinality(accepted_answers) > 0),
  explanation      text,
  evidence         text                               -- dẫn chứng trong bài đọc (giữ từ dữ liệu cũ)
);

CREATE TABLE public.speaking_questions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  speaking_part_id uuid NOT NULL REFERENCES public.speaking_parts(section_id) ON DELETE CASCADE,
  order_no         smallint NOT NULL,
  prompt           text NOT NULL,
  audio_key        text,                              -- TTS sinh lúc soạn đề (R2)
  UNIQUE (speaking_part_id, order_no),
  UNIQUE (id, speaking_part_id)
);

CREATE TABLE public.criteria (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code      text NOT NULL,                            -- TA, TR, CC, LR, GRA, FC, P
  name      text NOT NULL,
  skill     public.skill NOT NULL CHECK (skill IN ('writing', 'speaking')),
  task_type public.writing_task_type,                     -- TA → task1, TR → task2, còn lại NULL
  UNIQUE (skill, code),
  UNIQUE (id, skill),
  CHECK (task_type IS NULL OR skill = 'writing')
);

CREATE TABLE public.criterion_descriptors (
  criterion_id uuid NOT NULL REFERENCES public.criteria(id) ON DELETE CASCADE,
  band         smallint NOT NULL CHECK (band BETWEEN 0 AND 9),
  descriptor   text NOT NULL,
  PRIMARY KEY (criterion_id, band)
);

-- 4. LÀM BÀI (7) ------------------------------------------------------------------
CREATE TABLE public.mock_sessions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id  uuid NOT NULL REFERENCES public.learner_profiles(user_id),
  test_set_id uuid NOT NULL REFERENCES public.test_sets(id),
  status      public.session_status NOT NULL DEFAULT 'in_progress',
  started_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, learner_id)
);

CREATE TABLE public.attempts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id      uuid NOT NULL REFERENCES public.learner_profiles(user_id),
  test_id         uuid NOT NULL,
  skill           public.skill NOT NULL,
  mode            public.test_mode NOT NULL,
  status          public.attempt_status NOT NULL DEFAULT 'in_progress',
  mock_session_id uuid,
  started_at      timestamptz NOT NULL DEFAULT now(),
  deadline_at     timestamptz,
  submitted_at    timestamptz,
  raw_score       smallint CHECK (raw_score BETWEEN 0 AND 40),
  question_count  smallint CHECK (question_count BETWEEN 0 AND 40),
  lr_band         public.band,
  FOREIGN KEY (test_id, skill) REFERENCES public.tests (id, skill),
  FOREIGN KEY (mock_session_id, learner_id) REFERENCES public.mock_sessions (id, learner_id),
  UNIQUE (mock_session_id, skill),                    -- ràng buộc 3
  UNIQUE (id, test_id),
  UNIQUE (id, skill),
  UNIQUE (id, learner_id, skill),
  CHECK (mode = 'practice' OR deadline_at IS NOT NULL),
  CHECK (mock_session_id IS NULL OR mode = 'mock'),
  CHECK (status <> 'waiting_expert' OR mode = 'mock'),
  CHECK (status <> 'no_speech' OR skill = 'speaking'),
  CHECK (skill IN ('listening', 'reading') OR (raw_score IS NULL AND question_count IS NULL AND lr_band IS NULL)),
  CHECK (lr_band IS NULL OR question_count = 40),     -- BR-03 / ADR-19
  CHECK (raw_score IS NULL OR question_count IS NULL OR raw_score <= question_count),
  CHECK (deadline_at IS NULL OR deadline_at > started_at),
  CHECK (submitted_at IS NULL OR submitted_at >= started_at)
);
CREATE INDEX idx_attempts_history ON public.attempts (learner_id, started_at DESC);
CREATE INDEX idx_attempts_overdue ON public.attempts (deadline_at) WHERE status = 'in_progress';
CREATE UNIQUE INDEX uq_open_attempt ON public.attempts (learner_id, test_id) WHERE status = 'in_progress';

CREATE TABLE public.attempt_sections (                    -- ràng buộc 2
  attempt_id      uuid NOT NULL,
  section_id      uuid NOT NULL,
  test_id         uuid NOT NULL,
  started_at      timestamptz,
  audio_played_at timestamptz,                        -- Listening Mock phát 1 lần
  finished_at     timestamptz,
  PRIMARY KEY (attempt_id, section_id),
  FOREIGN KEY (attempt_id, test_id) REFERENCES public.attempts (id, test_id) ON DELETE CASCADE,
  FOREIGN KEY (section_id, test_id) REFERENCES public.sections (id, test_id)
);

CREATE TABLE public.answers (
  attempt_id  uuid NOT NULL,
  question_id uuid NOT NULL,
  section_id  uuid NOT NULL,
  answer      text,
  is_correct  boolean,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (attempt_id, question_id),
  FOREIGN KEY (attempt_id, section_id)  REFERENCES public.attempt_sections (attempt_id, section_id) ON DELETE CASCADE,
  FOREIGN KEY (question_id, section_id) REFERENCES public.questions (id, lr_section_id)
);

CREATE TABLE public.essays (                              -- ràng buộc 14
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL,
  section_id uuid NOT NULL REFERENCES public.writing_tasks(section_id),
  content    text NOT NULL DEFAULT '',
  word_count integer GENERATED ALWAYS AS (
               CASE WHEN btrim(content) = '' THEN 0
                    ELSE cardinality(regexp_split_to_array(btrim(content), '\s+')) END) STORED,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (attempt_id, section_id),
  UNIQUE (id, attempt_id),
  FOREIGN KEY (attempt_id, section_id) REFERENCES public.attempt_sections (attempt_id, section_id) ON DELETE CASCADE
);

CREATE TABLE public.speaking_responses (                  -- ràng buộc 14
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id           uuid NOT NULL,
  speaking_question_id uuid NOT NULL,
  section_id           uuid NOT NULL,
  audio_key            text,
  duration_ms          integer CHECK (duration_ms >= 0),
  transcript           text,
  confirmed_at         timestamptz,
  audio_deleted_at     timestamptz,
  UNIQUE (attempt_id, speaking_question_id),
  FOREIGN KEY (attempt_id, section_id) REFERENCES public.attempt_sections (attempt_id, section_id) ON DELETE CASCADE,
  FOREIGN KEY (speaking_question_id, section_id) REFERENCES public.speaking_questions (id, speaking_part_id)
);
CREATE INDEX idx_responses_retention ON public.speaking_responses (confirmed_at) WHERE audio_deleted_at IS NULL;

CREATE TABLE public.speech_metrics (
  response_id uuid NOT NULL REFERENCES public.speaking_responses(id) ON DELETE CASCADE,
  name        text NOT NULL,                          -- wpm, pause_ratio, phoneme_accuracy...
  value       numeric NOT NULL,
  PRIMARY KEY (response_id, name)
);

-- 5. CHẤM ĐIỂM (4) ------------------------------------------------------------------
CREATE TABLE public.evaluations (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id     uuid NOT NULL,
  skill          public.skill NOT NULL CHECK (skill IN ('writing', 'speaking')),   -- ràng buộc 4
  evaluator_type public.evaluator_type NOT NULL,
  status         public.evaluation_status NOT NULL,
  overall_band   public.band,
  feedback       text,
  is_official    boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now(),
  agrees_with_ai boolean,
  submitted_at   timestamptz,
  FOREIGN KEY (attempt_id, skill) REFERENCES public.attempts (id, skill),
  UNIQUE (id, skill),
  UNIQUE (id, evaluator_type),
  UNIQUE (id, attempt_id),
  UNIQUE (id, attempt_id, evaluator_type),
  CHECK (status NOT IN ('pending', 'failed') OR evaluator_type = 'ai'),
  CHECK (status <> 'draft' OR evaluator_type = 'expert'),
  CHECK (status <> 'done' OR overall_band IS NOT NULL),
  CHECK (NOT is_official OR status = 'done'),
  CHECK (agrees_with_ai IS NULL OR evaluator_type = 'expert')
);
CREATE UNIQUE INDEX uq_official_evaluation ON public.evaluations (attempt_id) WHERE is_official;   -- ràng buộc 5
CREATE INDEX idx_evaluations_attempt ON public.evaluations (attempt_id, created_at DESC);

CREATE TABLE public.grading_runs (                        -- NFR-05
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id   uuid NOT NULL,
  evaluator_type  public.evaluator_type NOT NULL DEFAULT 'ai' CHECK (evaluator_type = 'ai'),
  task_no         smallint CHECK (task_no IN (1, 2)), -- NULL với Speaking
  status          public.run_status NOT NULL DEFAULT 'running',
  model           text,
  prompt_versions jsonb,
  trace_id        text,
  error           text,
  input_tokens    integer,
  output_tokens   integer,
  latency_ms      integer,
  started_at      timestamptz NOT NULL DEFAULT now(),
  finished_at     timestamptz,
  output          jsonb,                              -- JSON AI engine trả về (bài sửa, feedback...)
  FOREIGN KEY (evaluation_id, evaluator_type) REFERENCES public.evaluations (id, evaluator_type) ON DELETE CASCADE
);
CREATE INDEX idx_runs_monitor ON public.grading_runs (status, started_at) WHERE status <> 'done';
CREATE INDEX idx_runs_evaluation ON public.grading_runs (evaluation_id);

CREATE TABLE public.criterion_scores (                    -- ràng buộc 6
  evaluation_id uuid NOT NULL,
  criterion_id  uuid NOT NULL,
  task_no       smallint NOT NULL DEFAULT 0,          -- Writing: 1/2; Speaking: 0
  skill         public.skill NOT NULL,
  band          public.band NOT NULL,
  comment       text,
  PRIMARY KEY (evaluation_id, criterion_id, task_no),
  CHECK ((skill = 'writing' AND task_no IN (1, 2)) OR (skill = 'speaking' AND task_no = 0)),
  FOREIGN KEY (evaluation_id, skill) REFERENCES public.evaluations (id, skill) ON DELETE CASCADE,
  FOREIGN KEY (criterion_id, skill)  REFERENCES public.criteria (id, skill)
);

CREATE TABLE public.annotations (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id  uuid NOT NULL,
  attempt_id     uuid NOT NULL,
  essay_id       uuid NOT NULL,
  type           public.annotation_type NOT NULL,
  category       text NOT NULL CHECK (category IN ('TA', 'TR', 'CC', 'LR', 'GRA')),
  title          text,
  original_text  text NOT NULL,
  corrected_text text,
  explanation    text NOT NULL,
  start_pos      integer NOT NULL CHECK (start_pos >= 0),
  end_pos        integer NOT NULL,
  CHECK (end_pos >= start_pos),
  FOREIGN KEY (evaluation_id, attempt_id) REFERENCES public.evaluations (id, attempt_id) ON DELETE CASCADE,
  FOREIGN KEY (essay_id, attempt_id)      REFERENCES public.essays (id, attempt_id) ON DELETE CASCADE
);
CREATE INDEX idx_annotations_evaluation ON public.annotations (evaluation_id, essay_id);

-- 6. EXPERT CHẤM (2) ------------------------------------------------------------------
CREATE TABLE public.review_requests (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id   uuid NOT NULL,
  learner_id   uuid NOT NULL,
  skill        public.skill NOT NULL CHECK (skill IN ('writing', 'speaking')),     -- ràng buộc 4
  status       public.review_status NOT NULL DEFAULT 'waiting',
  requested_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, attempt_id),
  FOREIGN KEY (attempt_id, learner_id, skill) REFERENCES public.attempts (id, learner_id, skill)
);
CREATE UNIQUE INDEX uq_open_request ON public.review_requests (attempt_id) WHERE status IN ('waiting', 'assigned');   -- ràng buộc 11
CREATE INDEX idx_request_queue  ON public.review_requests (status, requested_at);
CREATE INDEX idx_requests_quota ON public.review_requests (learner_id, requested_at);

CREATE TABLE public.review_assignments (                  -- ADR-18
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id     uuid NOT NULL,
  attempt_id     uuid NOT NULL,
  expert_id      uuid NOT NULL REFERENCES public.expert_profiles(user_id),
  assigned_at    timestamptz NOT NULL DEFAULT now(),
  started_at     timestamptz,
  due_at         timestamptz NOT NULL,
  ended_at       timestamptz,
  end_reason     public.assignment_end,
  note           text,
  reassigned_by  uuid,
  admin_role     public.user_role CHECK (admin_role = 'admin'),
  evaluation_id  uuid UNIQUE,
  evaluator_type public.evaluator_type NOT NULL DEFAULT 'expert' CHECK (evaluator_type = 'expert'),
  CHECK ((ended_at IS NULL) = (end_reason IS NULL)),
  CHECK (due_at > assigned_at),
  CHECK ((reassigned_by IS NULL) = (admin_role IS NULL)),
  FOREIGN KEY (request_id, attempt_id) REFERENCES public.review_requests (id, attempt_id),
  FOREIGN KEY (evaluation_id, attempt_id, evaluator_type)                    -- ràng buộc 9
    REFERENCES public.evaluations (id, attempt_id, evaluator_type),
  FOREIGN KEY (reassigned_by, admin_role) REFERENCES public.profiles (id, role)
);
CREATE UNIQUE INDEX uq_open_assignment ON public.review_assignments (request_id) WHERE ended_at IS NULL;   -- ràng buộc 10
CREATE INDEX idx_expert_workload  ON public.review_assignments (expert_id) WHERE ended_at IS NULL;
CREATE INDEX idx_assignments_due  ON public.review_assignments (due_at) WHERE ended_at IS NULL;

-- 7. TRIGGER ---------------------------------------------------------------------------
-- check_attempt_start: đề đã publish, mode được phép, đề thuộc bộ của mock session (rb 3, 12)
CREATE FUNCTION public.check_attempt_start() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  t record;
BEGIN
  SELECT status, allowed_mode, test_set_id INTO t FROM public.tests WHERE id = NEW.test_id;
  IF t.status <> 'published' THEN
    RAISE EXCEPTION 'Test % is not published', NEW.test_id USING ERRCODE = 'check_violation';
  END IF;
  IF t.allowed_mode <> 'both' AND t.allowed_mode::text <> NEW.mode::text THEN
    RAISE EXCEPTION 'Test % does not allow % mode', NEW.test_id, NEW.mode USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.mock_session_id IS NOT NULL AND t.test_set_id IS DISTINCT FROM
     (SELECT test_set_id FROM public.mock_sessions WHERE id = NEW.mock_session_id) THEN
    RAISE EXCEPTION 'Test % is not in the test set of mock session %', NEW.test_id, NEW.mock_session_id
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER check_attempt_start BEFORE INSERT ON public.attempts
  FOR EACH ROW EXECUTE FUNCTION public.check_attempt_start();

-- fill_question_section: lr_section_id lấy từ nhóm câu hỏi
CREATE FUNCTION public.fill_question_section() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  SELECT lr_section_id INTO NEW.lr_section_id FROM public.question_groups WHERE id = NEW.group_id;
  RETURN NEW;
END $$;
CREATE TRIGGER fill_question_section BEFORE INSERT OR UPDATE OF group_id ON public.questions
  FOR EACH ROW EXECUTE FUNCTION public.fill_question_section();

-- check_criterion_task: TA chỉ cho Task 1, TR chỉ cho Task 2 (rb 6)
CREATE FUNCTION public.check_criterion_task() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  tt public.writing_task_type;
BEGIN
  SELECT task_type INTO tt FROM public.criteria WHERE id = NEW.criterion_id;
  IF tt IS NOT NULL AND tt::text <> 'task' || NEW.task_no THEN
    RAISE EXCEPTION 'Criterion % is only for %', NEW.criterion_id, tt USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER check_criterion_task BEFORE INSERT OR UPDATE ON public.criterion_scores
  FOR EACH ROW EXECUTE FUNCTION public.check_criterion_task();

-- check_official_priority: AI không thành chính thức khi đã có Expert chính thức (rb 5, BR-08)
CREATE FUNCTION public.check_official_priority() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF NEW.is_official AND NEW.evaluator_type = 'ai' AND EXISTS (
       SELECT 1 FROM public.evaluations
       WHERE attempt_id = NEW.attempt_id AND evaluator_type = 'expert' AND is_official AND id <> NEW.id) THEN
    RAISE EXCEPTION 'Attempt % already has an official Expert evaluation', NEW.attempt_id
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER check_official_priority BEFORE INSERT OR UPDATE OF is_official ON public.evaluations
  FOR EACH ROW EXECUTE FUNCTION public.check_official_priority();

-- check_expert_capacity: không giao vượt max_active_reviews
CREATE FUNCTION public.check_expert_capacity() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  cap smallint;
  open_count integer;
BEGIN
  SELECT max_active_reviews INTO cap FROM public.expert_profiles WHERE user_id = NEW.expert_id FOR UPDATE;
  SELECT count(*) INTO open_count FROM public.review_assignments
  WHERE expert_id = NEW.expert_id AND ended_at IS NULL;
  IF open_count >= cap THEN
    RAISE EXCEPTION 'Expert % is at maximum load (%)', NEW.expert_id, cap USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER check_expert_capacity BEFORE INSERT ON public.review_assignments
  FOR EACH ROW EXECUTE FUNCTION public.check_expert_capacity();

-- block_published_edit: nội dung đề published/archived không sửa được (BR-10)
CREATE FUNCTION public.content_test_id(tbl text, r jsonb) RETURNS uuid
LANGUAGE plpgsql STABLE SET search_path = '' AS $$
BEGIN
  RETURN CASE tbl
    WHEN 'sections' THEN (r ->> 'test_id')::uuid
    WHEN 'lr_sections'    THEN (SELECT test_id FROM public.sections WHERE id = (r ->> 'section_id')::uuid)
    WHEN 'writing_tasks'  THEN (SELECT test_id FROM public.sections WHERE id = (r ->> 'section_id')::uuid)
    WHEN 'speaking_parts' THEN (SELECT test_id FROM public.sections WHERE id = (r ->> 'section_id')::uuid)
    WHEN 'question_groups' THEN (SELECT test_id FROM public.sections WHERE id = (r ->> 'lr_section_id')::uuid)
    -- questions: theo group_id vì trigger này chạy TRƯỚC fill_question_section (thứ tự tên)
    WHEN 'questions' THEN (SELECT s.test_id FROM public.question_groups g JOIN public.sections s ON s.id = g.lr_section_id
                           WHERE g.id = (r ->> 'group_id')::uuid)
    WHEN 'speaking_questions' THEN (SELECT test_id FROM public.sections WHERE id = (r ->> 'speaking_part_id')::uuid)
    WHEN 'group_options' THEN (SELECT s.test_id FROM public.question_groups g JOIN public.sections s ON s.id = g.lr_section_id
                               WHERE g.id = (r ->> 'group_id')::uuid)
    ELSE (SELECT s.test_id FROM public.questions q JOIN public.sections s ON s.id = q.lr_section_id
          WHERE q.id = (r ->> 'question_id')::uuid)          -- question_options, question_keys
  END;
END $$;

CREATE FUNCTION public.block_published_edit() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  st public.content_status;
BEGIN
  IF TG_TABLE_NAME = 'tests' THEN
    IF OLD.status = 'draft' THEN
      RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
    END IF;
    -- Đề published chỉ được chuyển sang archived (hoặc gắn/bỏ khỏi bộ đề Mock)
    IF TG_OP = 'UPDATE' AND OLD.status = 'published'
       AND (to_jsonb(NEW) - 'status' - 'test_set_id') = (to_jsonb(OLD) - 'status' - 'test_set_id')
       AND NEW.status IN ('published', 'archived') THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Test % is %; copy it to a new version to edit (BR-10)', OLD.id, OLD.status
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT status INTO st FROM public.tests
  WHERE id = public.content_test_id(TG_TABLE_NAME, to_jsonb(CASE WHEN TG_OP = 'INSERT' THEN NEW ELSE OLD END));
  IF st IN ('published', 'archived') THEN
    RAISE EXCEPTION 'Content of a % test cannot be changed (BR-10)', st USING ERRCODE = 'check_violation';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END $$;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['tests', 'sections', 'lr_sections', 'writing_tasks', 'speaking_parts',
                           'question_groups', 'group_options', 'questions', 'question_options',
                           'question_keys', 'speaking_questions'] LOOP
    EXECUTE format('CREATE TRIGGER block_published_edit BEFORE %s ON public.%I
                    FOR EACH ROW EXECUTE FUNCTION public.block_published_edit()',
                   CASE WHEN t = 'tests' THEN 'UPDATE OR DELETE' ELSE 'INSERT OR UPDATE OR DELETE' END, t);
  END LOOP;
END $$;

-- handle_new_user: tạo profile + hồ sơ kiểu con khi Supabase Auth tạo tài khoản.
-- Role CHỈ đọc từ app_metadata (server ghi), không bao giờ từ user_metadata (STRIDE: E).
CREATE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  r public.user_role;
BEGIN
  r := CASE NEW.raw_app_meta_data ->> 'role'
         WHEN 'admin' THEN 'admin'::public.user_role
         WHEN 'expert' THEN 'expert'::public.user_role
         ELSE 'learner'::public.user_role END;
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (NEW.id, NEW.email,
          COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''), split_part(NEW.email, '@', 1)), r)
  ON CONFLICT (id) DO NOTHING;
  IF r = 'learner' THEN
    INSERT INTO public.learner_profiles (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  ELSIF r = 'expert' THEN
    INSERT INTO public.expert_profiles (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8. VIEW (3) -----------------------------------------------------------------------------
-- Band của attempt luôn lấy từ kết quả chính thức (L/R: lr_band; W/S: evaluation chính thức).
-- Bài Mock đang chờ Expert: band chính thức = NULL, preliminary_band = điểm AI mới nhất (BR-08).
CREATE VIEW public.attempt_results WITH (security_invoker = true) AS
SELECT a.id AS attempt_id, a.learner_id, a.test_id, a.skill, a.mode, a.status, a.mock_session_id,
       a.started_at, a.submitted_at, a.raw_score, a.question_count,
       oe.id AS official_evaluation_id, oe.evaluator_type AS official_evaluator,
       CASE WHEN a.skill IN ('listening', 'reading') THEN a.lr_band ELSE oe.overall_band END AS band,
       CASE WHEN a.status = 'waiting_expert' THEN ai.overall_band END AS preliminary_band
FROM public.attempts a
LEFT JOIN public.evaluations oe ON oe.attempt_id = a.id AND oe.is_official
LEFT JOIN LATERAL (
  SELECT e.overall_band FROM public.evaluations e
  WHERE e.attempt_id = a.id AND e.evaluator_type = 'ai' AND e.status = 'done'
  ORDER BY e.created_at DESC LIMIT 1) ai ON true;

-- Overall của mock session: chỉ khi đủ 4 kỹ năng có điểm chính thức (BR-02)
CREATE VIEW public.mock_session_results WITH (security_invoker = true) AS
SELECT s.id AS mock_session_id, s.learner_id, s.test_set_id, s.status, s.started_at,
       max(r.band) FILTER (WHERE r.skill = 'listening') AS listening_band,
       max(r.band) FILTER (WHERE r.skill = 'reading')   AS reading_band,
       max(r.band) FILTER (WHERE r.skill = 'writing')   AS writing_band,
       max(r.band) FILTER (WHERE r.skill = 'speaking')  AS speaking_band,
       CASE WHEN count(r.band) = 4 THEN public.ielts_round(avg(r.band)) END AS overall_band
FROM public.mock_sessions s
LEFT JOIN public.attempt_results r ON r.mock_session_id = s.id
GROUP BY s.id;

CREATE VIEW public.review_request_details WITH (security_invoker = true) AS
SELECT q.id AS request_id, q.attempt_id, q.learner_id, q.skill, q.status, q.requested_at,
       a.mode AS source,                                -- mock → BR-15, practice → BR-16
       cur.expert_id AS current_expert_id, cur.due_at AS current_due_at,
       done.ended_at AS completed_at, done.evaluation_id AS expert_evaluation_id
FROM public.review_requests q
JOIN public.attempts a ON a.id = q.attempt_id
LEFT JOIN public.review_assignments cur  ON cur.request_id = q.id AND cur.ended_at IS NULL
LEFT JOIN public.review_assignments done ON done.request_id = q.id AND done.end_reason = 'completed';

-- 9. RLS: CHỈ CHO ĐỌC; mọi thao tác ghi đi qua Core API (service_role) ------------------------
CREATE FUNCTION public.current_user_role() RETURNS public.user_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() AND is_active
$$;
CREATE FUNCTION public.is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT coalesce(public.current_user_role() = 'admin', false)
$$;
CREATE FUNCTION public.owns_attempt(p_attempt uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.attempts WHERE id = p_attempt AND learner_id = auth.uid())
$$;
CREATE FUNCTION public.test_is_published(p_test uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.tests WHERE id = p_test AND status = 'published')
$$;
CREATE FUNCTION public.section_is_published(p_section uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.sections s JOIN public.tests t ON t.id = s.test_id
                 WHERE s.id = p_section AND t.status = 'published')
$$;
-- Learner thấy evaluation chính thức đã xong của attempt của mình
CREATE FUNCTION public.can_read_evaluation(p_eval uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.evaluations e JOIN public.attempts a ON a.id = e.attempt_id
    WHERE e.id = p_eval AND (
      (a.learner_id = auth.uid() AND e.is_official AND e.status = 'done')
      OR EXISTS (SELECT 1 FROM public.review_assignments ra                       -- Expert: bản của mình
                 WHERE ra.evaluation_id = e.id AND ra.expert_id = auth.uid())
      OR (e.evaluator_type = 'ai' AND EXISTS (                                  -- rb 13: AI sau khi nộp
                 SELECT 1 FROM public.review_assignments ra JOIN public.evaluations x ON x.id = ra.evaluation_id
                 WHERE ra.attempt_id = e.attempt_id AND ra.expert_id = auth.uid()
                   AND x.submitted_at IS NOT NULL))))
$$;
REVOKE EXECUTE ON FUNCTION public.current_user_role(), public.is_admin(), public.owns_attempt(uuid),
  public.test_is_published(uuid), public.section_is_published(uuid), public.can_read_evaluation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_role(), public.is_admin(), public.owns_attempt(uuid),
  public.test_is_published(uuid), public.section_is_published(uuid), public.can_read_evaluation(uuid) TO authenticated;

DO $$
DECLARE
  t text;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY admin_read ON public.%I FOR SELECT TO authenticated USING (public.is_admin())', t);
  END LOOP;
END $$;

-- Nội dung đã publish + danh mục tiêu chí: mọi người đã đăng nhập (KHÔNG có question_keys)
CREATE POLICY published_read ON public.test_sets        FOR SELECT TO authenticated USING (status = 'published');
CREATE POLICY published_read ON public.tests            FOR SELECT TO authenticated USING (status = 'published');
CREATE POLICY published_read ON public.sections         FOR SELECT TO authenticated USING (public.test_is_published(test_id));
CREATE POLICY published_read ON public.lr_sections      FOR SELECT TO authenticated USING (public.section_is_published(section_id));
CREATE POLICY published_read ON public.writing_tasks    FOR SELECT TO authenticated USING (public.section_is_published(section_id));
CREATE POLICY published_read ON public.speaking_parts   FOR SELECT TO authenticated USING (public.section_is_published(section_id));
CREATE POLICY published_read ON public.question_groups  FOR SELECT TO authenticated USING (public.section_is_published(lr_section_id));
CREATE POLICY published_read ON public.questions        FOR SELECT TO authenticated USING (public.section_is_published(lr_section_id));
CREATE POLICY published_read ON public.speaking_questions FOR SELECT TO authenticated USING (public.section_is_published(speaking_part_id));
CREATE POLICY published_read ON public.group_options    FOR SELECT TO authenticated USING (
  public.section_is_published((SELECT lr_section_id FROM public.question_groups g WHERE g.id = group_id)));
CREATE POLICY published_read ON public.question_options FOR SELECT TO authenticated USING (
  public.section_is_published((SELECT lr_section_id FROM public.questions q WHERE q.id = question_id)));
CREATE POLICY catalogue_read ON public.criteria              FOR SELECT TO authenticated USING (true);
CREATE POLICY catalogue_read ON public.criterion_descriptors FOR SELECT TO authenticated USING (true);
CREATE POLICY catalogue_read ON public.band_conversions      FOR SELECT TO authenticated USING (true);

-- Dữ liệu của chính mình
CREATE POLICY own_read ON public.profiles         FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY own_read ON public.learner_profiles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY own_read ON public.expert_profiles  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY own_read ON public.mock_sessions    FOR SELECT TO authenticated USING (learner_id = auth.uid());
CREATE POLICY own_read ON public.attempts         FOR SELECT TO authenticated USING (learner_id = auth.uid());
CREATE POLICY own_read ON public.attempt_sections FOR SELECT TO authenticated USING (public.owns_attempt(attempt_id));
CREATE POLICY own_read ON public.answers          FOR SELECT TO authenticated USING (public.owns_attempt(attempt_id));
CREATE POLICY own_read ON public.essays           FOR SELECT TO authenticated USING (public.owns_attempt(attempt_id));
CREATE POLICY own_read ON public.speaking_responses FOR SELECT TO authenticated USING (public.owns_attempt(attempt_id));
CREATE POLICY own_read ON public.speech_metrics   FOR SELECT TO authenticated USING (
  public.owns_attempt((SELECT attempt_id FROM public.speaking_responses r WHERE r.id = response_id)));
CREATE POLICY own_read ON public.review_requests  FOR SELECT TO authenticated USING (learner_id = auth.uid());
CREATE POLICY own_read ON public.review_assignments FOR SELECT TO authenticated USING (expert_id = auth.uid());

-- Kết quả chấm (Learner: bản chính thức; Expert: bản của mình + bản AI sau khi nộp: expert_eval_read)
CREATE POLICY expert_eval_read ON public.evaluations      FOR SELECT TO authenticated USING (public.can_read_evaluation(id));
CREATE POLICY expert_eval_read ON public.criterion_scores FOR SELECT TO authenticated USING (public.can_read_evaluation(evaluation_id));
CREATE POLICY expert_eval_read ON public.annotations      FOR SELECT TO authenticated USING (public.can_read_evaluation(evaluation_id));

-- 10. QUYỀN --------------------------------------------------------------------------------
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;                 -- RLS lọc dòng
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;
GRANT EXECUTE ON FUNCTION public.ielts_round(numeric) TO authenticated;
-- anon: không có quyền gì (NFR-11), xem mục 16

-- 11. DỮ LIỆU THAM CHIẾU -----------------------------------------------------------------------
INSERT INTO public.criteria (code, name, skill, task_type) VALUES
  ('TA',  'Task Achievement',                 'writing',  'task1'),
  ('TR',  'Task Response',                    'writing',  'task2'),
  ('CC',  'Coherence and Cohesion',           'writing',  NULL),
  ('LR',  'Lexical Resource',                 'writing',  NULL),
  ('GRA', 'Grammatical Range and Accuracy',   'writing',  NULL),
  ('FC',  'Fluency and Coherence',            'speaking', NULL),
  ('LR',  'Lexical Resource',                 'speaking', NULL),
  ('GRA', 'Grammatical Range and Accuracy',   'speaking', NULL),
  ('P',   'Pronunciation',                    'speaking', NULL);

INSERT INTO public.system_settings (key, value) VALUES
  ('mock_expert_weekly_quota',     '2'),            -- BR-15
  ('practice_review_weekly_quota', '3'),            -- BR-16
  ('review_due_hours',             '48'),           -- BR-11
  ('assignment_retry_minutes',     '10'),
  ('audio_retention_days',         '180'),          -- NFR-07
  ('late_answer_grace_seconds',    '30'),           -- BR-07
  ('mock_duration_minutes',        '{"listening": 30, "reading": 60, "writing": 60, "speaking": 14}'),
  ('speaking_time_limits',         '{"part1_answer": 45, "part2_prep": 60, "part2_answer": 120, "part3_answer": 90}'),  -- BR-13
  ('min_words',                    '{"task1": 150, "task2": 250}');                                                      -- BR-06


-- 12. Cột thêm ngoài sơ đồ ---------------------------------------------------------------
-- tests.difficulty: độ khó cho catalog/bộ lọc (giữ từ hệ thống cũ)
-- 20261103100000 — public.tests.difficulty (độ khó hiển thị ở catalog/bộ lọc)
-- ---------------------------------------------------------------------
-- Không có trong sơ đồ 33 bảng; giữ từ public.tests.difficulty (20261026) vì
-- giao diện đang lọc theo độ khó. Ghi nhận là độ lệch có chủ đích (source-of-truth §7).
-- =====================================================================
ALTER TABLE public.tests
  ADD COLUMN difficulty text NOT NULL DEFAULT 'medium'
  CHECK (difficulty IN ('easy', 'medium', 'hard'));

-- questions.diagram_coordinate: vị trí ô trống dạng Diagram labelling
-- 20261103110000 — questions.diagram_coordinate (vị trí ô trống trên sơ đồ, dạng Diagram labelling)
-- Không có trong sơ đồ 33 bảng; giữ từ dữ liệu cũ vì giao diện vẽ ô trống theo toạ độ {x, y} (%).
-- =====================================================================
ALTER TABLE public.questions ADD COLUMN diagram_coordinate jsonb
  CHECK (diagram_coordinate IS NULL OR (diagram_coordinate ? 'x' AND diagram_coordinate ? 'y'));


-- 13. Tính năng "Chấm bài tự do" (NGOÀI thiết kế, chờ nhóm quyết định giữ/bỏ) ------------
-- 20261103120000 — Bảng của tính năng "Chấm bài tự do" (/exam, admin/topics)
-- ---------------------------------------------------------------------
-- NGOÀI thiết kế 33 bảng (trong thiết kế mọi bài viết thuộc một attempt). Nhóm chưa quyết
-- giữ hay bỏ, nên giữ nguyên cấu trúc cũ; chỉ đổi essays → free_essays để không trùng tên
-- với bảng essays của thiết kế, và khoá ngoại người dùng trỏ sang profiles.
-- Bỏ tính năng = DROP 5 bảng này.
-- =====================================================================
CREATE TABLE public.topics (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by         uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  title              text NOT NULL,
  description        text,
  prompt_content     text NOT NULL,
  task_type          text NOT NULL CHECK (task_type IN ('task1', 'task2')),
  difficulty         text NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  category           text,
  is_active          boolean NOT NULL DEFAULT true,
  image_key          text,
  visual_description text,
  origin             text NOT NULL DEFAULT 'manual',
  source_name        text,
  license            text,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.free_essays (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  topic_id     uuid REFERENCES public.topics(id) ON DELETE SET NULL,
  content      text NOT NULL,
  word_count   integer NOT NULL,
  status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'evaluating', 'completed', 'failed', 'rejected')),
  task_id      text UNIQUE,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  evaluated_at timestamptz
);
CREATE INDEX idx_free_essays_user ON public.free_essays (user_id, submitted_at DESC);

CREATE TABLE public.evaluation_results (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  essay_id                 uuid NOT NULL UNIQUE REFERENCES public.free_essays(id) ON DELETE CASCADE,
  overall_band             double precision CHECK (overall_band BETWEEN 0 AND 9),
  task_response_score      double precision CHECK (task_response_score BETWEEN 0 AND 9),
  coherence_cohesion_score double precision CHECK (coherence_cohesion_score BETWEEN 0 AND 9),
  lexical_resource_score   double precision CHECK (lexical_resource_score BETWEEN 0 AND 9),
  grammar_accuracy_score   double precision CHECK (grammar_accuracy_score BETWEEN 0 AND 9),
  overall_upgraded_essay   text,
  criteria_analysis        jsonb NOT NULL,
  is_score_overridden      boolean NOT NULL DEFAULT false,
  raw_ai_response          jsonb NOT NULL,
  model                    text,
  prompt_versions          jsonb,
  trace_id                 text,
  created_at               timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.essay_annotations (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  essay_id       uuid NOT NULL REFERENCES public.free_essays(id) ON DELETE CASCADE,
  type           text NOT NULL,
  category       text NOT NULL,
  title          text NOT NULL,
  original_text  text NOT NULL,
  corrected_text text,
  explanation    text NOT NULL,
  recommendation text,
  position_start integer NOT NULL,
  position_end   integer NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.evaluation_logs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  essay_id         uuid REFERENCES public.free_essays(id) ON DELETE CASCADE,
  agent_name       text NOT NULL,
  status           text NOT NULL CHECK (status IN ('started', 'success', 'failed', 'retried')),
  phoenix_trace_id text,
  error_message    text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- RLS: chỉ đọc, ghi qua Core API (ADR-10)
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.free_essays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.essay_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_read ON public.topics             FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY admin_read ON public.free_essays        FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY admin_read ON public.evaluation_results FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY admin_read ON public.essay_annotations  FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY admin_read ON public.evaluation_logs    FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY active_read ON public.topics FOR SELECT TO authenticated USING (is_active);
CREATE POLICY own_read ON public.free_essays FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY own_read ON public.evaluation_results FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.free_essays e WHERE e.id = essay_id AND e.user_id = auth.uid()));
CREATE POLICY own_read ON public.essay_annotations FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.free_essays e WHERE e.id = essay_id AND e.user_id = auth.uid()));
GRANT SELECT ON public.topics, public.free_essays, public.evaluation_results, public.essay_annotations, public.evaluation_logs TO authenticated;
GRANT ALL ON public.topics, public.free_essays, public.evaluation_results, public.essay_annotations, public.evaluation_logs TO service_role;


-- 14. Bảng quy đổi band Academic (BR-03) -------------------------------------------------
INSERT INTO public.band_conversions (skill, raw_min, raw_max, band) VALUES
  ('listening', 0, 0, 0.0),
  ('listening', 1, 1, 1.0),
  ('listening', 2, 3, 2.0),
  ('listening', 4, 5, 2.5),
  ('listening', 6, 7, 3.0),
  ('listening', 8, 9, 3.5),
  ('listening', 10, 12, 4.0),
  ('listening', 13, 15, 4.5),
  ('listening', 16, 17, 5.0),
  ('listening', 18, 22, 5.5),
  ('listening', 23, 25, 6.0),
  ('listening', 26, 29, 6.5),
  ('listening', 30, 31, 7.0),
  ('listening', 32, 34, 7.5),
  ('listening', 35, 36, 8.0),
  ('listening', 37, 38, 8.5),
  ('listening', 39, 40, 9.0),
  ('reading', 0, 0, 0.0),
  ('reading', 1, 1, 1.0),
  ('reading', 2, 3, 2.0),
  ('reading', 4, 5, 2.5),
  ('reading', 6, 7, 3.0),
  ('reading', 8, 9, 3.5),
  ('reading', 10, 12, 4.0),
  ('reading', 13, 14, 4.5),
  ('reading', 15, 18, 5.0),
  ('reading', 19, 22, 5.5),
  ('reading', 23, 26, 6.0),
  ('reading', 27, 29, 6.5),
  ('reading', 30, 32, 7.0),
  ('reading', 33, 34, 7.5),
  ('reading', 35, 36, 8.0),
  ('reading', 37, 38, 8.5),
  ('reading', 39, 40, 9.0);


-- 15. Realtime (FR-19, UC-29) --------------------------------------------------------------
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.attempts, public.review_requests, public.free_essays;
  END IF;
END $$;

-- 16. Chặn ghi từ anon/authenticated (ADR-10, NFR-11): Supabase mặc định cấp ALL cho bảng mới ở public
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public FROM authenticated;
