
-- 슬라이드 덱(참가자별 1행)
CREATE TABLE public.s6_slide_decks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  slides JSONB NOT NULL DEFAULT '[]'::jsonb,
  draft_generated_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);
GRANT ALL ON public.s6_slide_decks TO service_role;
ALTER TABLE public.s6_slide_decks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "s6_slide_decks_deny_all" ON public.s6_slide_decks FOR ALL USING (false) WITH CHECK (false);
CREATE TRIGGER s6_slide_decks_touch BEFORE UPDATE ON public.s6_slide_decks
  FOR EACH ROW EXECUTE FUNCTION public.s3_touch_updated_at();

-- 청중 코멘트
CREATE TABLE public.s6_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL,
  presenter_id UUID NOT NULL,
  commenter_id UUID NOT NULL,
  good TEXT NOT NULL,
  question TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.s6_comments TO service_role;
ALTER TABLE public.s6_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "s6_comments_deny_all" ON public.s6_comments FOR ALL USING (false) WITH CHECK (false);
CREATE INDEX s6_comments_presenter_idx ON public.s6_comments(presenter_id, created_at DESC);

-- 발표 순서 큐
CREATE TABLE public.s6_presentation_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL,
  user_id UUID NOT NULL,
  order_index INTEGER NOT NULL,
  state TEXT NOT NULL DEFAULT 'waiting',
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id, user_id),
  CHECK (state IN ('waiting','current','done'))
);
GRANT ALL ON public.s6_presentation_queue TO service_role;
ALTER TABLE public.s6_presentation_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "s6_presentation_queue_deny_all" ON public.s6_presentation_queue FOR ALL USING (false) WITH CHECK (false);
CREATE INDEX s6_queue_session_order_idx ON public.s6_presentation_queue(session_id, order_index);
CREATE TRIGGER s6_queue_touch BEFORE UPDATE ON public.s6_presentation_queue
  FOR EACH ROW EXECUTE FUNCTION public.s3_touch_updated_at();

-- 강사 타이머 시작 시각
ALTER TABLE public.sessions ADD COLUMN s6_timer_started_at TIMESTAMPTZ;
