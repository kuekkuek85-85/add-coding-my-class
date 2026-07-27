
CREATE TABLE public.help_missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  requester_id uuid NOT NULL,
  requester_role text NOT NULL,
  title text NOT NULL DEFAULT '',
  summary text NOT NULL DEFAULT '',
  repro_steps text NOT NULL DEFAULT '',
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  raw_description text NOT NULL DEFAULT '',
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'open',
  resolved_helper_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
GRANT ALL ON public.help_missions TO service_role;
ALTER TABLE public.help_missions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "help_missions_deny_all" ON public.help_missions
  AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

CREATE INDEX help_missions_session_status_idx ON public.help_missions (session_id, status, updated_at DESC);

CREATE TABLE public.help_mission_helpers (
  mission_id uuid NOT NULL REFERENCES public.help_missions(id) ON DELETE CASCADE,
  helper_id uuid NOT NULL,
  state text NOT NULL DEFAULT 'joined',
  submission_text text NOT NULL DEFAULT '',
  submission_attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  joined_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  PRIMARY KEY (mission_id, helper_id)
);
GRANT ALL ON public.help_mission_helpers TO service_role;
ALTER TABLE public.help_mission_helpers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "help_mission_helpers_deny_all" ON public.help_mission_helpers
  AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

CREATE TABLE public.help_mission_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id uuid NOT NULL REFERENCES public.help_missions(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  author_role text NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.help_mission_comments TO service_role;
ALTER TABLE public.help_mission_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "help_mission_comments_deny_all" ON public.help_mission_comments
  AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

CREATE INDEX help_mission_comments_mission_idx ON public.help_mission_comments (mission_id, created_at);

CREATE TRIGGER help_missions_touch
  BEFORE UPDATE ON public.help_missions
  FOR EACH ROW EXECUTE FUNCTION public.s3_touch_updated_at();
