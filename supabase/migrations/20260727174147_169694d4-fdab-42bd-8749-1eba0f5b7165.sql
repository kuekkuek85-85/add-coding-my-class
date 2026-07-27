
CREATE TABLE public.dj_queue (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  requester_id uuid not null,
  requester_nickname text not null,
  requester_role text not null,
  youtube_url text not null,
  video_id text not null,
  title text not null default '',
  played_at timestamptz,
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);
GRANT ALL ON public.dj_queue TO service_role;
ALTER TABLE public.dj_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dj_queue_deny_all" ON public.dj_queue AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE INDEX dj_queue_session_created_idx ON public.dj_queue (session_id, played_at, created_at);
