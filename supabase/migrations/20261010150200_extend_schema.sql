-- =====================================================================
-- 20261010150200 — MỞ RỘNG SCHEMA cho đồ án tốt nghiệp
-- ---------------------------------------------------------------------
-- Chỉ THÊM: 12 enum, 22 bảng, một số cột (cho phép NULL hoặc có DEFAULT),
-- index và cấu hình mặc định. Không xóa, không đổi tên bảng hay cột nào,
-- nên Core API, worker và frontend hiện tại vẫn chạy bình thường.
-- Chạy lại nhiều lần an toàn (IF NOT EXISTS ở mọi chỗ).
-- =====================================================================

-- 0. KIỂM TRA TRƯỚC: project phải có schema của dự án thực tập -----------
DO $$
DECLARE
  v_missing TEXT;
BEGIN
  SELECT string_agg(t, ', ') INTO v_missing
  FROM unnest(ARRAY['users', 'topics', 'essays', 'evaluation_results',
                    'essay_annotations', 'evaluation_logs', 'user_progress']) AS t
  WHERE to_regclass('public.' || t) IS NULL;
  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'Thiếu bảng của schema cũ: %. Hãy chạy file baseline trước.', v_missing;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
                 WHERE t.typname = 'user_role' AND e.enumlabel = 'expert') THEN
    RAISE EXCEPTION 'Enum user_role chưa có giá trị expert. Hãy chạy file 20261010150100 trước.';
  END IF;
END
$$;

-- 1. ENUM MỚI (cùng phong cách chữ thường với enum hiện có) ---------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
                 WHERE n.nspname = 'public' AND t.typname = 'skill_type') THEN
    CREATE TYPE public.skill_type AS ENUM ('listening', 'reading', 'writing', 'speaking');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
                 WHERE n.nspname = 'public' AND t.typname = 'practice_mode') THEN
    CREATE TYPE public.practice_mode AS ENUM ('practice', 'mock');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
                 WHERE n.nspname = 'public' AND t.typname = 'allowed_mode') THEN
    CREATE TYPE public.allowed_mode AS ENUM ('practice', 'mock', 'both');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
                 WHERE n.nspname = 'public' AND t.typname = 'content_status') THEN
    CREATE TYPE public.content_status AS ENUM ('draft', 'pending_review', 'published', 'archived');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
                 WHERE n.nspname = 'public' AND t.typname = 'content_origin') THEN
    CREATE TYPE public.content_origin AS ENUM ('manual', 'ai_generated', 'open_license');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
                 WHERE n.nspname = 'public' AND t.typname = 'attempt_status') THEN
    CREATE TYPE public.attempt_status AS ENUM ('in_progress', 'submitted', 'scoring', 'pending_expert', 'scored', 'scoring_failed', 'abandoned');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
                 WHERE n.nspname = 'public' AND t.typname = 'band_source') THEN
    CREATE TYPE public.band_source AS ENUM ('auto', 'ai', 'expert');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
                 WHERE n.nspname = 'public' AND t.typname = 'question_type') THEN
    CREATE TYPE public.question_type AS ENUM ('multiple_choice', 'true_false_not_given', 'matching', 'completion', 'short_answer', 'writing_task1', 'writing_task2', 'speaking_part1', 'speaking_part2', 'speaking_part3');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
                 WHERE n.nspname = 'public' AND t.typname = 'review_source') THEN
    CREATE TYPE public.review_source AS ENUM ('mock_auto', 'learner_request');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
                 WHERE n.nspname = 'public' AND t.typname = 'review_status') THEN
    CREATE TYPE public.review_status AS ENUM ('requested', 'assigned', 'in_review', 'completed', 'cancelled');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
                 WHERE n.nspname = 'public' AND t.typname = 'assigner_type') THEN
    CREATE TYPE public.assigner_type AS ENUM ('system', 'admin');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
                 WHERE n.nspname = 'public' AND t.typname = 'criterion_code') THEN
    CREATE TYPE public.criterion_code AS ENUM ('TA', 'TR', 'CC', 'LR', 'GRA', 'FC', 'P');
  END IF;
END
$$;

-- 2. CỘT THÊM VÀO BẢNG HIỆN CÓ (chỉ ADD COLUMN, đều cho phép NULL hoặc có DEFAULT)
-- --------------------------------------------------------------------
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS voice_consent_at TIMESTAMPTZ;

ALTER TABLE public.topics
  ADD COLUMN IF NOT EXISTS image_key          TEXT,          -- ảnh biểu đồ Task 1 trên R2
  ADD COLUMN IF NOT EXISTS visual_description TEXT,          -- mô tả số liệu Task 1 gửi cho AI
  ADD COLUMN IF NOT EXISTS origin             content_origin NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS source_name        VARCHAR(200),
  ADD COLUMN IF NOT EXISTS license            VARCHAR(100);

ALTER TABLE public.evaluation_results
  ADD COLUMN IF NOT EXISTS model           VARCHAR(60),
  ADD COLUMN IF NOT EXISTS prompt_versions JSONB,           -- phiên bản 5 prompt Langfuse đã dùng
  ADD COLUMN IF NOT EXISTS trace_id        VARCHAR(64);     -- trace id Langfuse

ALTER TABLE public.user_progress
  ADD COLUMN IF NOT EXISTS band_listening NUMERIC(2,1),
  ADD COLUMN IF NOT EXISTS band_reading   NUMERIC(2,1),
  ADD COLUMN IF NOT EXISTS band_writing   NUMERIC(2,1),
  ADD COLUMN IF NOT EXISTS band_speaking  NUMERIC(2,1),
  ADD COLUMN IF NOT EXISTS band_overall   NUMERIC(2,1);

-- --------------------------------------------------------------------
-- 3. NGƯỜI DÙNG
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.learner_goals (
  user_id          UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  target_overall   NUMERIC(2,1) CHECK (target_overall   BETWEEN 0 AND 9 AND target_overall   * 2 = trunc(target_overall   * 2)),
  target_listening NUMERIC(2,1) CHECK (target_listening BETWEEN 0 AND 9 AND target_listening * 2 = trunc(target_listening * 2)),
  target_reading   NUMERIC(2,1) CHECK (target_reading   BETWEEN 0 AND 9 AND target_reading   * 2 = trunc(target_reading   * 2)),
  target_writing   NUMERIC(2,1) CHECK (target_writing   BETWEEN 0 AND 9 AND target_writing   * 2 = trunc(target_writing   * 2)),
  target_speaking  NUMERIC(2,1) CHECK (target_speaking  BETWEEN 0 AND 9 AND target_speaking  * 2 = trunc(target_speaking  * 2)),
  test_date        DATE,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.expert_profiles (
  user_id            UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE RESTRICT,
  is_available       BOOLEAN  NOT NULL DEFAULT false,
  max_active_reviews SMALLINT NOT NULL DEFAULT 5 CHECK (max_active_reviews > 0),
  bio                TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------------------
-- 4. NỘI DUNG ĐỀ (Reading, Listening, Speaking; Writing dùng lại bảng topics)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.test_sets (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(200) NOT NULL,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tests (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_set_id    UUID REFERENCES public.test_sets(id) ON DELETE RESTRICT,
  parent_test_id UUID REFERENCES public.tests(id) ON DELETE RESTRICT,
  title          VARCHAR(300) NOT NULL,
  skill          skill_type NOT NULL,
  allowed_mode   allowed_mode NOT NULL DEFAULT 'both',
  status         content_status NOT NULL DEFAULT 'draft',
  version        INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  duration_min   SMALLINT CHECK (duration_min > 0),
  origin         content_origin NOT NULL DEFAULT 'manual',
  source_name    VARCHAR(200),
  source_url     TEXT,
  license        VARCHAR(100),
  created_by     UUID REFERENCES public.users(id),
  reviewed_by    UUID REFERENCES public.users(id),
  reviewed_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_tests_id_skill UNIQUE (id, skill),
  CHECK (status <> 'published' OR (reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)),
  CHECK (origin <> 'open_license' OR license IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS public.test_sections (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id      UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  order_no     SMALLINT NOT NULL,
  title        VARCHAR(300),
  passage_text TEXT,                                          -- Reading
  audio_key    TEXT,                                          -- Listening, trên R2
  audio_script JSONB,                                         -- kịch bản nhiều giọng cho TTS
  transcript   TEXT,                                          -- Listening, chỉ trả về sau khi nộp
  topic_id     UUID REFERENCES public.topics(id) ON DELETE RESTRICT,  -- Writing: trỏ tới đề trong topics
  UNIQUE (test_id, order_no)
);

CREATE TABLE IF NOT EXISTS public.question_groups (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id       UUID NOT NULL REFERENCES public.test_sections(id) ON DELETE CASCADE,
  order_no         SMALLINT NOT NULL,
  question_type    question_type NOT NULL,
  question_subtype VARCHAR(30),
  instructions     TEXT,
  image_key        TEXT,
  content          JSONB,
  UNIQUE (section_id, order_no)
);

CREATE TABLE IF NOT EXISTS public.questions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id         UUID NOT NULL REFERENCES public.question_groups(id) ON DELETE CASCADE,
  number           SMALLINT NOT NULL,
  prompt           TEXT,
  options          JSONB,
  max_words        SMALLINT CHECK (max_words > 0),
  prompt_audio_key TEXT,                                      -- Speaking: audio TTS đọc câu hỏi
  prep_time_sec    SMALLINT CHECK (prep_time_sec >= 0),
  answer_time_sec  SMALLINT CHECK (answer_time_sec > 0),
  UNIQUE (group_id, number)
);

CREATE TABLE IF NOT EXISTS public.question_answer_keys (
  question_id      UUID PRIMARY KEY REFERENCES public.questions(id) ON DELETE CASCADE,
  accepted_answers JSONB NOT NULL CHECK (jsonb_typeof(accepted_answers) = 'array'
                                         AND jsonb_array_length(accepted_answers) > 0),
  explanation      TEXT,
  evidence         TEXT
);

CREATE TABLE IF NOT EXISTS public.band_conversions (
  id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill   skill_type NOT NULL CHECK (skill IN ('listening', 'reading')),
  raw_min SMALLINT NOT NULL CHECK (raw_min BETWEEN 0 AND 40),
  raw_max SMALLINT NOT NULL CHECK (raw_max BETWEEN 0 AND 40),
  band    NUMERIC(2,1) NOT NULL CHECK (band BETWEEN 0 AND 9 AND band * 2 = trunc(band * 2)),
  UNIQUE (skill, raw_min),
  CHECK (raw_min <= raw_max)
);

CREATE TABLE IF NOT EXISTS public.content_generation_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id         UUID REFERENCES public.tests(id) ON DELETE SET NULL,
  topic_id        UUID REFERENCES public.topics(id) ON DELETE SET NULL,
  model           VARCHAR(60),
  langfuse_prompt VARCHAR(120),
  request_params  JSONB NOT NULL,
  raw_output      JSONB,
  trace_id        VARCHAR(64),
  created_by      UUID REFERENCES public.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------------------
-- 5. BÀI LÀM
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mock_sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  test_set_id  UUID NOT NULL REFERENCES public.test_sets(id) ON DELETE RESTRICT,
  status       attempt_status NOT NULL DEFAULT 'in_progress',
  started_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  overall_band NUMERIC(2,1) CHECK (overall_band BETWEEN 0 AND 9 AND overall_band * 2 = trunc(overall_band * 2))
);

CREATE TABLE IF NOT EXISTS public.test_attempts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  test_id         UUID NOT NULL,
  skill           skill_type NOT NULL,
  mock_session_id UUID REFERENCES public.mock_sessions(id) ON DELETE RESTRICT,
  mode            practice_mode NOT NULL,
  status          attempt_status NOT NULL DEFAULT 'in_progress',
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deadline_at     TIMESTAMPTZ,
  submitted_at    TIMESTAMPTZ,
  scored_at       TIMESTAMPTZ,
  raw_score       SMALLINT CHECK (raw_score BETWEEN 0 AND 40),
  band            NUMERIC(2,1) CHECK (band BETWEEN 0 AND 9 AND band * 2 = trunc(band * 2)),
  band_source     band_source,
  FOREIGN KEY (test_id, skill) REFERENCES public.tests (id, skill) ON DELETE RESTRICT,
  UNIQUE (mock_session_id, skill),
  CHECK (mode = 'practice' OR deadline_at IS NOT NULL),
  CHECK (mock_session_id IS NULL OR mode = 'mock'),
  CHECK (status <> 'pending_expert' OR mode = 'mock'),
  CHECK (deadline_at IS NULL OR deadline_at > started_at),
  CHECK (submitted_at IS NULL OR submitted_at >= started_at)
);
CREATE INDEX IF NOT EXISTS idx_attempts_user_skill ON public.test_attempts (user_id, skill, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_attempts_expiring   ON public.test_attempts (deadline_at) WHERE status = 'in_progress';

-- Bài Writing trong Mock: mỗi task là một dòng essays, gắn vào test_attempts.
-- Bài Writing luyện tập lẻ vẫn dùng essays như hiện nay (attempt_id = NULL).
ALTER TABLE public.essays
  ADD COLUMN IF NOT EXISTS attempt_id UUID REFERENCES public.test_attempts(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_essays_attempt ON public.essays (attempt_id);
CREATE INDEX IF NOT EXISTS idx_essays_user_submitted ON public.essays (user_id, submitted_at DESC);

ALTER TABLE public.evaluation_logs
  ADD COLUMN IF NOT EXISTS attempt_id UUID REFERENCES public.test_attempts(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS public.attempt_answers (
  attempt_id  UUID NOT NULL REFERENCES public.test_attempts(id) ON DELETE RESTRICT,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE RESTRICT,
  answer      JSONB,
  is_correct  BOOLEAN,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (attempt_id, question_id)
);

CREATE TABLE IF NOT EXISTS public.speaking_responses (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id       UUID NOT NULL REFERENCES public.test_attempts(id) ON DELETE RESTRICT,
  question_id      UUID NOT NULL REFERENCES public.questions(id) ON DELETE RESTRICT,
  audio_key        TEXT NOT NULL,
  duration_sec     INTEGER CHECK (duration_sec >= 0),
  transcript       TEXT,
  confirmed_at     TIMESTAMPTZ,
  audio_deleted_at TIMESTAMPTZ,
  UNIQUE (attempt_id, question_id)
);

CREATE TABLE IF NOT EXISTS public.speech_analyses (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  speaking_response_id UUID NOT NULL REFERENCES public.speaking_responses(id) ON DELETE CASCADE,
  analyzer             VARCHAR(30) NOT NULL,                  -- stt, vad, phoneme
  model                VARCHAR(100),
  output               JSONB,
  metrics              JSONB,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (speaking_response_id, analyzer)
);

-- --------------------------------------------------------------------
-- 6. CHẤM ĐIỂM
-- --------------------------------------------------------------------
-- Kết quả chấm Speaking: cùng cấu trúc với evaluation_results có sẵn của Writing.
CREATE TABLE IF NOT EXISTS public.speaking_evaluation_results (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id               UUID NOT NULL UNIQUE REFERENCES public.test_attempts(id) ON DELETE RESTRICT,
  overall_band             NUMERIC(2,1) CHECK (overall_band BETWEEN 0 AND 9 AND overall_band * 2 = trunc(overall_band * 2)),
  fluency_coherence_score  NUMERIC(2,1) CHECK (fluency_coherence_score BETWEEN 0 AND 9),
  lexical_resource_score   NUMERIC(2,1) CHECK (lexical_resource_score  BETWEEN 0 AND 9),
  grammar_accuracy_score   NUMERIC(2,1) CHECK (grammar_accuracy_score  BETWEEN 0 AND 9),
  pronunciation_score      NUMERIC(2,1) CHECK (pronunciation_score     BETWEEN 0 AND 9),
  criteria_analysis        JSONB NOT NULL,
  raw_ai_response          JSONB NOT NULL,
  is_score_overridden      BOOLEAN NOT NULL DEFAULT false,
  model                    VARCHAR(60),
  prompt_versions          JSONB,
  trace_id                 VARCHAR(64),
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- evaluation_results có UNIQUE(essay_id) nên chấm lại phải ghi đè.
-- Trước khi ghi đè, bản cũ được chép vào đây để không mất dấu vết.
CREATE TABLE IF NOT EXISTS public.evaluation_result_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  essay_id    UUID REFERENCES public.essays(id) ON DELETE RESTRICT,
  attempt_id  UUID REFERENCES public.test_attempts(id) ON DELETE RESTRICT,
  snapshot    JSONB NOT NULL,                                 -- toàn bộ dòng kết quả cũ và annotations
  reason      TEXT,
  archived_by UUID REFERENCES public.users(id),
  archived_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (num_nonnulls(essay_id, attempt_id) = 1)
);

-- --------------------------------------------------------------------
-- 7. EXPERT
-- --------------------------------------------------------------------
-- Đối tượng được chấm: một essay (Writing luyện tập) HOẶC một test_attempt
-- (Writing Mock gồm 2 task, hoặc Speaking).
CREATE TABLE IF NOT EXISTS public.review_requests (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  essay_id     UUID REFERENCES public.essays(id) ON DELETE RESTRICT,
  attempt_id   UUID REFERENCES public.test_attempts(id) ON DELETE RESTRICT,
  requested_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  source       review_source NOT NULL,
  expert_id    UUID REFERENCES public.expert_profiles(user_id) ON DELETE RESTRICT,
  assigned_by  assigner_type,
  status       review_status NOT NULL DEFAULT 'requested',
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_at  TIMESTAMPTZ,
  due_at       TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  CHECK (num_nonnulls(essay_id, attempt_id) = 1),
  CHECK (source = 'learner_request' OR attempt_id IS NOT NULL),
  CHECK (source = 'learner_request' OR status <> 'cancelled'),
  CHECK ((status IN ('assigned', 'in_review', 'completed'))
         = (expert_id IS NOT NULL AND assigned_at IS NOT NULL AND due_at IS NOT NULL)),
  CHECK (due_at IS NULL OR due_at > assigned_at)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_review_active_essay   ON public.review_requests (essay_id)   WHERE status <> 'cancelled' AND essay_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_review_active_attempt ON public.review_requests (attempt_id) WHERE status <> 'cancelled' AND attempt_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_review_queue      ON public.review_requests (status, source, due_at);
CREATE INDEX IF NOT EXISTS idx_review_quota      ON public.review_requests (requested_by, source, requested_at);

CREATE TABLE IF NOT EXISTS public.expert_reviews (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_request_id UUID NOT NULL UNIQUE REFERENCES public.review_requests(id) ON DELETE RESTRICT,
  overall_band      NUMERIC(2,1) CHECK (overall_band BETWEEN 0 AND 9 AND overall_band * 2 = trunc(overall_band * 2)),
  feedback          TEXT,
  agrees_with_ai    BOOLEAN,
  submitted_at      TIMESTAMPTZ,                                -- NULL = bản nháp
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (submitted_at IS NULL OR overall_band IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS public.expert_review_scores (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expert_review_id UUID NOT NULL REFERENCES public.expert_reviews(id) ON DELETE CASCADE,
  essay_id         UUID REFERENCES public.essays(id) ON DELETE RESTRICT,  -- task Writing; NULL với Speaking
  criterion        criterion_code NOT NULL,
  band             NUMERIC(2,1) NOT NULL CHECK (band BETWEEN 0 AND 9 AND band * 2 = trunc(band * 2)),
  comment          TEXT,
  UNIQUE NULLS NOT DISTINCT (expert_review_id, essay_id, criterion)
);

-- --------------------------------------------------------------------
-- 8. VẬN HÀNH
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.system_settings (
  key        VARCHAR(80) PRIMARY KEY,
  value      JSONB NOT NULL,
  updated_by UUID REFERENCES public.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO public.system_settings (key, value) VALUES
  ('ai_daily_quota',            '{"writing": 10, "speaking": 10}'),
  ('mock_expert_weekly_quota',  '2'),
  ('practice_review_weekly_quota', '3'),
  ('review_due_hours',          '48'),
  ('assignment_strategy',       '"least_loaded"'),
  ('audio_retention_days',      '180')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id   UUID REFERENCES public.users(id),
  action     VARCHAR(60) NOT NULL,
  entity     VARCHAR(60) NOT NULL,
  entity_id  UUID,
  before     JSONB,
  after      JSONB,
  ip         INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------------------
