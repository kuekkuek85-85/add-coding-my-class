-- s7_retrospectives
CREATE TABLE public.s7_retrospectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  learned text NOT NULL,
  next_try text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, user_id)
);

GRANT ALL ON public.s7_retrospectives TO service_role;
ALTER TABLE public.s7_retrospectives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deny all direct access s7_retro"
  ON public.s7_retrospectives
  FOR ALL
  USING (false)
  WITH CHECK (false);

CREATE TRIGGER s7_retro_touch_updated_at
  BEFORE UPDATE ON public.s7_retrospectives
  FOR EACH ROW EXECUTE FUNCTION public.s3_touch_updated_at();

-- sessions.closed_at
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS closed_at timestamptz;
