-- ============================================================================
-- MIGRATION: EXPERT GOVERNANCE FULL SUITE (PRD_01 — Wave 1 + Wave 2)
-- Phiên bản: 20261124000000
-- 1. Mở rộng review_assignments (+8 cột telemetry & anti-rubber-stamping)
-- 2. Mở rộng expert_profiles (+4 cột 4-tier, cooldown, clean streak, suspend)
-- 3. Tạo 3 bảng: expert_penalties, expert_performance_snapshots, expert_helpfulness_ratings
-- 4. Mở rộng notifications_type_check & seed system_settings (BR-26)
-- ============================================================================

-- 1. Extend review_assignments
ALTER TABLE public.review_assignments
    ADD COLUMN IF NOT EXISTS review_duration_sec INTEGER,
    ADD COLUMN IF NOT EXISTS completeness_passed BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS completeness_reject_count INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS is_early_sla BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS criteria_modified_count INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS annotations_delta INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS rubber_stamp_flag BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS reminder_stage SMALLINT NOT NULL DEFAULT 0 CHECK (reminder_stage IN (0, 1, 2));

-- 2. Extend expert_profiles
ALTER TABLE public.expert_profiles
    ADD COLUMN IF NOT EXISTS tier TEXT NOT NULL DEFAULT 'standard'
        CHECK (tier IN ('probation', 'standard', 'high_performer', 'top_expert')),
    ADD COLUMN IF NOT EXISTS cooldown_until TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS consecutive_clean_reviews INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS is_suspended_by_penalty BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. Create expert_penalties (Audit trail + Progressive Penalty Circuit Breaker)
CREATE TABLE IF NOT EXISTS public.expert_penalties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expert_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    assignment_id UUID REFERENCES public.review_assignments(id) ON DELETE SET NULL,
    reason TEXT NOT NULL CHECK (reason IN ('sla_expired', 'high_decline_rate', 'admin_quality_flag')),
    severity TEXT NOT NULL CHECK (severity IN ('warning', 'throttle', 'cooldown', 'suspended')),
    cooldown_until TIMESTAMPTZ,
    note TEXT,
    waived_by UUID REFERENCES public.profiles(id),
    waived_at TIMESTAMPTZ,
    waive_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expert_penalties_active
    ON public.expert_penalties (expert_id, created_at DESC)
    WHERE waived_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_expert_penalties_assignment_reason
    ON public.expert_penalties (assignment_id, reason)
    WHERE assignment_id IS NOT NULL AND waived_at IS NULL;

ALTER TABLE public.expert_penalties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Experts can read own penalties" ON public.expert_penalties;
CREATE POLICY "Experts can read own penalties"
    ON public.expert_penalties FOR SELECT TO authenticated
    USING (expert_id = auth.uid() OR public.is_admin());

-- 4. Create expert_performance_snapshots (Monthly snapshots for FR-50)
CREATE TABLE IF NOT EXISTS public.expert_performance_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expert_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    completed_count INTEGER NOT NULL DEFAULT 0,
    on_time_rate NUMERIC(5, 2) NOT NULL DEFAULT 100,
    early_sla_rate NUMERIC(5, 2) NOT NULL DEFAULT 0,
    completeness_first_pass_rate NUMERIC(5, 2) NOT NULL DEFAULT 100,
    avg_turnaround_hours NUMERIC(6, 2),
    decline_rate NUMERIC(5, 2) NOT NULL DEFAULT 0,
    rubber_stamp_count INTEGER NOT NULL DEFAULT 0,
    helpfulness_rate NUMERIC(5, 2),
    helpfulness_count INTEGER NOT NULL DEFAULT 0,
    tier TEXT NOT NULL CHECK (tier IN ('probation', 'standard', 'high_performer', 'top_expert')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (expert_id, period_start, period_end)
);

ALTER TABLE public.expert_performance_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Experts can read own snapshots" ON public.expert_performance_snapshots;
CREATE POLICY "Experts can read own snapshots"
    ON public.expert_performance_snapshots FOR SELECT TO authenticated
    USING (expert_id = auth.uid() OR public.is_admin());

-- 5. Create expert_helpfulness_ratings (Learner 30s helpfulness widget — FR-52, UC-44)
CREATE TABLE IF NOT EXISTS public.expert_helpfulness_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID NOT NULL REFERENCES public.attempts(id) ON DELETE CASCADE,
    assignment_id UUID REFERENCES public.review_assignments(id) ON DELETE SET NULL,
    learner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    expert_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    is_helpful BOOLEAN NOT NULL,
    tags TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (attempt_id)
);

CREATE INDEX IF NOT EXISTS idx_expert_helpfulness_expert_created
    ON public.expert_helpfulness_ratings (expert_id, created_at DESC);

ALTER TABLE public.expert_helpfulness_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants and admins can read helpfulness ratings" ON public.expert_helpfulness_ratings;
CREATE POLICY "Participants and admins can read helpfulness ratings"
    ON public.expert_helpfulness_ratings FOR SELECT TO authenticated
    USING (learner_id = auth.uid() OR expert_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Learners can insert own helpfulness rating" ON public.expert_helpfulness_ratings;
CREATE POLICY "Learners can insert own helpfulness rating"
    ON public.expert_helpfulness_ratings FOR INSERT TO authenticated
    WITH CHECK (learner_id = auth.uid());

-- 6. Safely widen notifications.type CHECK constraint (fixes B1 silent insert failure)
DO $$
DECLARE
    con_name TEXT;
BEGIN
    SELECT c.conname INTO con_name
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'notifications'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) LIKE '%ai_grading%';

    IF con_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.notifications DROP CONSTRAINT %I', con_name);
    END IF;
END $$;

ALTER TABLE public.notifications
    DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
    ADD CONSTRAINT notifications_type_check CHECK (
        type IN (
            'grading_pending',
            'grading_complete',
            'grading_failed',
            'ai_grading',
            'ai_complete',
            'ai_failed',
            'expert_requested',
            'expert_assigned',
            'expert_reassigned',
            'expert_complete',
            'streak_reminder',
            'streak_freeze_used',
            'badge_unlocked',
            'expert_sla_warning',
            'expert_sla_expired',
            'expert_penalty_notice',
            'admin_expert_suspended'
        )
    );

-- 7. Seed system_settings for BR-26 small-team cooldown pool guard
INSERT INTO public.system_settings (key, value, updated_at)
VALUES ('expert_cooldown_min_active_pool', '{"value": 3}'::jsonb, now())
ON CONFLICT (key) DO NOTHING;
