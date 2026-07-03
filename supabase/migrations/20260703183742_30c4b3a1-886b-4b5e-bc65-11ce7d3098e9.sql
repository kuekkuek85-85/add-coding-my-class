
ALTER TABLE public.s5_checklist_results DROP CONSTRAINT IF EXISTS s5_checklist_results_test_case_id_fkey;
ALTER TABLE public.s5_checklist_results DROP CONSTRAINT IF EXISTS s5_checklist_results_pkey;
ALTER TABLE public.s5_checklist_results ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 's4';
ALTER TABLE public.s5_checklist_results ADD CONSTRAINT s5_checklist_results_source_check CHECK (source IN ('s2','s4'));
ALTER TABLE public.s5_checklist_results ADD PRIMARY KEY (user_id, source, test_case_id);

CREATE OR REPLACE FUNCTION public.s5_validate_checklist_target()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.source = 's4' THEN
    IF NOT EXISTS (SELECT 1 FROM public.s4_test_cases WHERE id = NEW.test_case_id AND user_id = NEW.user_id) THEN
      RAISE EXCEPTION '유효하지 않은 S4 테스트 케이스입니다.';
    END IF;
  ELSIF NEW.source = 's2' THEN
    IF NOT EXISTS (SELECT 1 FROM public.s2_test_cases WHERE id = NEW.test_case_id AND user_id = NEW.user_id) THEN
      RAISE EXCEPTION '유효하지 않은 S2 테스트 케이스입니다.';
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS s5_validate_checklist_target ON public.s5_checklist_results;
CREATE TRIGGER s5_validate_checklist_target
  BEFORE INSERT OR UPDATE ON public.s5_checklist_results
  FOR EACH ROW EXECUTE FUNCTION public.s5_validate_checklist_target();
