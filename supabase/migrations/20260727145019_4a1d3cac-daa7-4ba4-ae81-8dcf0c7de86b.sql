ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS seat_id text;
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS avatar jsonb;
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS is_seated boolean NOT NULL DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS app_users_session_seat_unique ON public.app_users(session_id, seat_id) WHERE seat_id IS NOT NULL;