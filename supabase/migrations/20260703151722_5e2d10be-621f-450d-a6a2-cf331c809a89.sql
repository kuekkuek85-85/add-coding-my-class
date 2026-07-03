
-- 1) PRD 초안
CREATE TABLE public.s3_prd_drafts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  session_id uuid NOT NULL,
  problem text NOT NULL DEFAULT '',
  users text NOT NULL DEFAULT '',
  features text NOT NULL DEFAULT '',
  nonfunctional text NOT NULL DEFAULT '',
  success_metric text NOT NULL DEFAULT '',
  out_of_scope text NOT NULL DEFAULT '',
  submitted_v1_at timestamptz,
  submitted_v2_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.s3_prd_drafts TO service_role;
ALTER TABLE public.s3_prd_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny all client access" ON public.s3_prd_drafts FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

-- 2) Grill Me 질문 캐시
CREATE TABLE public.s3_grill_questions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  session_id uuid NOT NULL,
  draft_snapshot text NOT NULL,
  questions jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.s3_grill_questions TO service_role;
ALTER TABLE public.s3_grill_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny all client access" ON public.s3_grill_questions FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

-- 3) 체인 리뷰
CREATE TABLE public.s3_reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reviewer_id uuid NOT NULL,
  reviewee_id uuid NOT NULL,
  session_id uuid NOT NULL,
  good text NOT NULL,
  question text NOT NULL DEFAULT '',
  suggestion text NOT NULL DEFAULT '',
  submitted_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (reviewer_id, reviewee_id)
);
GRANT ALL ON public.s3_reviews TO service_role;
ALTER TABLE public.s3_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny all client access" ON public.s3_reviews FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

-- updated_at 트리거
CREATE OR REPLACE FUNCTION public.s3_touch_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_s3_prd_drafts_updated BEFORE UPDATE ON public.s3_prd_drafts
FOR EACH ROW EXECUTE FUNCTION public.s3_touch_updated_at();

CREATE TRIGGER trg_s3_reviews_updated BEFORE UPDATE ON public.s3_reviews
FOR EACH ROW EXECUTE FUNCTION public.s3_touch_updated_at();
