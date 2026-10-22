-- =====================================================================
-- 20261010150000 — BASELINE: schema hiện có của dự án thực tập
-- ---------------------------------------------------------------------
-- Nội dung giống hệt backend/init_supabase.sql nhưng viết lại để chạy
-- được nhiều lần:
--   * Project Supabase ĐÃ có 7 bảng (đã chạy init_supabase.sql trước đây):
--     file này không thay đổi gì.
--   * Project MỚI: file này tạo đúng schema như init_supabase.sql.
-- Không sửa định nghĩa bảng nào ở đây; mọi thay đổi nằm ở các file sau.
-- =====================================================================

-- 1. ENUM ---------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
                 WHERE n.nspname = 'public' AND t.typname = 'user_role') THEN
    CREATE TYPE public.user_role AS ENUM ('student', 'admin');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
                 WHERE n.nspname = 'public' AND t.typname = 'task_type') THEN
    CREATE TYPE public.task_type AS ENUM ('task1', 'task2');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
                 WHERE n.nspname = 'public' AND t.typname = 'topic_difficulty') THEN
    CREATE TYPE public.topic_difficulty AS ENUM ('easy', 'medium', 'hard');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
                 WHERE n.nspname = 'public' AND t.typname = 'essay_status') THEN
    CREATE TYPE public.essay_status AS ENUM ('pending', 'evaluating', 'completed', 'failed', 'rejected');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
                 WHERE n.nspname = 'public' AND t.typname = 'annotation_type') THEN
    CREATE TYPE public.annotation_type AS ENUM ('error', 'upgrade', 'logic_issue', 'strength');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
                 WHERE n.nspname = 'public' AND t.typname = 'annotation_category') THEN
    CREATE TYPE public.annotation_category AS ENUM ('TR', 'CC', 'LR', 'GRA');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
                 WHERE n.nspname = 'public' AND t.typname = 'log_status') THEN
    CREATE TYPE public.log_status AS ENUM ('started', 'success', 'failed', 'retried');
  END IF;
END
$$;

-- 2. BẢNG ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    role user_role DEFAULT 'student',
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by UUID REFERENCES public.users(id),
    title VARCHAR(300) NOT NULL,
    description TEXT,
    prompt_content TEXT NOT NULL,
    task_type task_type NOT NULL,
    difficulty topic_difficulty DEFAULT 'medium',
    category VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.essays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) NOT NULL,
    topic_id UUID REFERENCES public.topics(id),
    content TEXT NOT NULL,
    word_count INTEGER NOT NULL,
    status essay_status DEFAULT 'pending',
    task_id VARCHAR(100) UNIQUE,
    submitted_at TIMESTAMPTZ DEFAULT now(),
    evaluated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.evaluation_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    essay_id UUID REFERENCES public.essays(id) UNIQUE NOT NULL,
    overall_band FLOAT CHECK (overall_band >= 0 AND overall_band <= 9),
    task_response_score FLOAT CHECK (task_response_score >= 0 AND task_response_score <= 9),
    coherence_cohesion_score FLOAT CHECK (coherence_cohesion_score >= 0 AND coherence_cohesion_score <= 9),
    lexical_resource_score FLOAT CHECK (lexical_resource_score >= 0 AND lexical_resource_score <= 9),
    grammar_accuracy_score FLOAT CHECK (grammar_accuracy_score >= 0 AND grammar_accuracy_score <= 9),
    overall_upgraded_essay TEXT,
    criteria_analysis JSONB NOT NULL,
    is_score_overridden BOOLEAN DEFAULT false,
    raw_ai_response JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.essay_annotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    essay_id UUID REFERENCES public.essays(id) ON DELETE CASCADE,
    type annotation_type NOT NULL,
    category annotation_category NOT NULL,
    title VARCHAR(255) NOT NULL,
    original_text TEXT NOT NULL,
    corrected_text TEXT,
    explanation TEXT NOT NULL,
    recommendation TEXT,
    position_start INTEGER NOT NULL,
    position_end INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.evaluation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    essay_id UUID REFERENCES public.essays(id) ON DELETE CASCADE,
    agent_name VARCHAR(50) NOT NULL,
    status log_status NOT NULL,
    phoenix_trace_id VARCHAR(64),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) UNIQUE NOT NULL,
    total_essays INTEGER DEFAULT 0,
    avg_overall_band FLOAT,
    avg_tr_score FLOAT,
    avg_cc_score FLOAT,
    avg_lr_score FLOAT,
    avg_gra_score FLOAT,
    best_overall_band FLOAT,
    last_submission_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT now()
);
