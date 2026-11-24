-- Lean Hybrid Gamification Upgrade (PA1):
-- 1. Create single lightweight table public.learner_gamification_state (1:1 with learner_profiles)
--    preserving all 33 baseline tables untouched (ADR-10: RLS SELECT own row, service_role writes).
-- 2. Extend public.notifications.type CHECK constraint with streak & badge notification types.

CREATE TABLE IF NOT EXISTS public.learner_gamification_state (
    user_id UUID PRIMARY KEY REFERENCES public.learner_profiles(user_id) ON DELETE CASCADE,
    weekly_goal_days SMALLINT NOT NULL DEFAULT 5 CHECK (weekly_goal_days IN (3, 5, 7)),
    reminder_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    repaired_dates DATE[] NOT NULL DEFAULT '{}'::DATE[],
    last_repaired_at TIMESTAMPTZ,
    notified_badge_codes TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
    last_freeze_notified_date DATE,
    last_reminder_sent_date DATE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_learner_gamification_state_reminder
    ON public.learner_gamification_state (reminder_enabled, last_reminder_sent_date);

ALTER TABLE public.learner_gamification_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Learners can read own gamification state" ON public.learner_gamification_state;
CREATE POLICY "Learners can read own gamification state"
    ON public.learner_gamification_state
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Safely widen notifications.type CHECK constraint to support streak_reminder, streak_freeze_used, badge_unlocked
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
            'ai_grading',
            'ai_complete',
            'ai_failed',
            'expert_requested',
            'expert_assigned',
            'expert_reassigned',
            'expert_complete',
            'streak_reminder',
            'streak_freeze_used',
            'badge_unlocked'
        )
    );
