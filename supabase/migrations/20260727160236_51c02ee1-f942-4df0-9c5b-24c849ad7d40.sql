
CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  sender_role text NOT NULL CHECK (sender_role IN ('participant','instructor')),
  recipient_id uuid,
  kind text NOT NULL CHECK (kind IN ('direct','broadcast')),
  category text NOT NULL DEFAULT 'general',
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX messages_session_created_idx ON public.messages(session_id, created_at DESC);
CREATE INDEX messages_recipient_idx ON public.messages(recipient_id);
CREATE INDEX messages_sender_idx ON public.messages(sender_id);

GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages_deny_all" ON public.messages AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

CREATE TABLE public.message_reads (
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id)
);
CREATE INDEX message_reads_user_idx ON public.message_reads(user_id);

GRANT ALL ON public.message_reads TO service_role;
ALTER TABLE public.message_reads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "message_reads_deny_all" ON public.message_reads AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
