CREATE TABLE public.help_signals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE REFERENCES public.app_users(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  level text NOT NULL DEFAULT 'green' CHECK (level IN ('green','yellow','red')),
  note text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.help_signals TO service_role;

ALTER TABLE public.help_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny all client access"
ON public.help_signals
AS RESTRICTIVE
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

CREATE INDEX help_signals_session_idx ON public.help_signals(session_id, updated_at DESC);