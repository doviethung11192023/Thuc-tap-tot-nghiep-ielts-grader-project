-- Migration: Add is_activated column to public.users (UC-19)
-- Tracks whether an invited user has activated their account and set their password.

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS is_activated BOOLEAN DEFAULT TRUE;

COMMENT ON COLUMN public.users.is_activated IS 'True if user has set password or activated via invite/oauth; False for pending invites';
