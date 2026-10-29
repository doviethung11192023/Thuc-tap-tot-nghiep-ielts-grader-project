-- Migration: Add difficulty column to tests table
-- Allows categorizing tests into 'easy', 'medium', 'hard'

ALTER TABLE public.tests 
ADD COLUMN IF NOT EXISTS difficulty VARCHAR(20) DEFAULT 'medium';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'chk_tests_difficulty'
    ) THEN
        ALTER TABLE public.tests 
        ADD CONSTRAINT chk_tests_difficulty 
        CHECK (difficulty IN ('easy', 'medium', 'hard'));
    END IF;
END $$;
