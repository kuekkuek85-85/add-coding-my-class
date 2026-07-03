
-- s5_checklist_results: 참가자가 자신의 S4 테스트 케이스를 실제 실행한 결과
CREATE TABLE public.s5_checklist_results (
  user_id UUID NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  test_case_id UUID NOT NULL REFERENCES public.s4_test_cases(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pass','fail','partial')),
  note TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, test_case_id)
);
GRANT ALL ON public.s5_checklist_results TO service_role;
ALTER TABLE public.s5_checklist_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "s5_checklist_deny_all" ON public.s5_checklist_results FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- s5_qa_reviews: 참가자 A가 참가자 B의 S4 산출물을 교차 QA 한 결과
CREATE TABLE public.s5_qa_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reviewer_id UUID NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  reviewee_id UUID NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  good TEXT NOT NULL,
  issue TEXT NOT NULL DEFAULT '',
  suggestion TEXT NOT NULL DEFAULT '',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (reviewer_id, reviewee_id)
);
GRANT ALL ON public.s5_qa_reviews TO service_role;
ALTER TABLE public.s5_qa_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "s5_qa_deny_all" ON public.s5_qa_reviews FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- s5_revised_prompts: 참가자가 다음번에 개발자/AI에게 넘길 수정 프롬프트 초안 (1인 1행)
CREATE TABLE public.s5_revised_prompts (
  user_id UUID NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  target TEXT NOT NULL DEFAULT '',
  evidence TEXT NOT NULL DEFAULT '',
  keep_list TEXT NOT NULL DEFAULT '',
  add_list TEXT NOT NULL DEFAULT '',
  constraints TEXT NOT NULL DEFAULT '',
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.s5_revised_prompts TO service_role;
ALTER TABLE public.s5_revised_prompts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "s5_revised_deny_all" ON public.s5_revised_prompts FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- updated_at 자동 갱신
CREATE TRIGGER s5_checklist_touch BEFORE UPDATE ON public.s5_checklist_results FOR EACH ROW EXECUTE FUNCTION public.s3_touch_updated_at();
CREATE TRIGGER s5_qa_touch BEFORE UPDATE ON public.s5_qa_reviews FOR EACH ROW EXECUTE FUNCTION public.s3_touch_updated_at();
CREATE TRIGGER s5_revised_touch BEFORE UPDATE ON public.s5_revised_prompts FOR EACH ROW EXECUTE FUNCTION public.s3_touch_updated_at();
