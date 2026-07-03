
CREATE TABLE public.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  participant_code text NOT NULL UNIQUE,
  instructor_code text NOT NULL UNIQUE,
  current_stage int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.sessions TO service_role;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
-- No policies: client access is blocked; all reads/writes go through server functions using service role.

CREATE TABLE public.app_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  nickname text NOT NULL,
  role text NOT NULL CHECK (role IN ('participant','instructor')),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, nickname)
);
GRANT ALL ON public.app_users TO service_role;
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

INSERT INTO public.sessions (name, participant_code, instructor_code)
VALUES ('심화반 · 기본 세션', 'SPOON1', 'TEACH1');
