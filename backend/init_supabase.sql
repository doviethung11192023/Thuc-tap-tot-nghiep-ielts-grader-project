-- ====================================================
-- IELTS GRADER DATABASE SCHEMA (POSTGRESQL - SUPABASE)
-- ====================================================

-- 1. ENUMS
CREATE TYPE user_role AS ENUM ('student', 'admin');
CREATE TYPE task_type AS ENUM ('task1', 'task2');
CREATE TYPE topic_difficulty AS ENUM ('easy', 'medium', 'hard');
CREATE TYPE essay_status AS ENUM ('pending', 'evaluating', 'completed', 'failed', 'rejected');
CREATE TYPE error_severity AS ENUM ('minor', 'major', 'critical');
CREATE TYPE log_status AS ENUM ('started', 'success', 'failed', 'retried');

-- 2. TABLES

-- Users Table
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    role user_role DEFAULT 'student',
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Topics Table
CREATE TABLE public.topics (
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

-- Essays Table
CREATE TABLE public.essays (
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

-- Evaluation Results Table
CREATE TABLE public.evaluation_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    essay_id UUID REFERENCES public.essays(id) UNIQUE NOT NULL,
    task_response_score FLOAT CHECK (task_response_score >= 0 AND task_response_score <= 9),
    coherence_cohesion_score FLOAT CHECK (coherence_cohesion_score >= 0 AND coherence_cohesion_score <= 9),
    lexical_resource_score FLOAT CHECK (lexical_resource_score >= 0 AND lexical_resource_score <= 9),
    grammar_accuracy_score FLOAT CHECK (grammar_accuracy_score >= 0 AND grammar_accuracy_score <= 9),
    overall_band FLOAT CHECK (overall_band >= 0 AND overall_band <= 9),
    is_score_overridden BOOLEAN DEFAULT false,
    tr_feedback TEXT NOT NULL,
    cc_feedback TEXT NOT NULL,
    lr_feedback TEXT NOT NULL,
    gra_feedback TEXT NOT NULL,
    overall_feedback TEXT NOT NULL,
    improvement_suggestions TEXT NOT NULL,
    raw_ai_response JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Grammar Errors Table
CREATE TABLE public.grammar_errors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evaluation_id UUID REFERENCES public.evaluation_results(id) ON DELETE CASCADE,
    error_type VARCHAR(50) NOT NULL,
    original_text TEXT NOT NULL,
    corrected_text TEXT NOT NULL,
    explanation TEXT NOT NULL,
    position_start INTEGER NOT NULL,
    position_end INTEGER NOT NULL,
    severity error_severity DEFAULT 'major'
);

-- Evaluation Logs Table (Hybrid Tracing)
CREATE TABLE public.evaluation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    essay_id UUID REFERENCES public.essays(id) ON DELETE CASCADE,
    agent_name VARCHAR(50) NOT NULL,
    status log_status NOT NULL,
    phoenix_trace_id VARCHAR(64),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- User Progress Table
CREATE TABLE public.user_progress (
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

-- 3. ENABLE RLS (Row Level Security) - Tùy chọn, hiện tại tắt để Backend gọi API dễ dàng
-- ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
-- (Bạn có thể bỏ qua RLS vì FastAPI sẽ đóng vai trò như Admin)
