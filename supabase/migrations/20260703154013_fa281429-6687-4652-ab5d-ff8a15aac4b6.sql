
CREATE TABLE public.s4_test_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_id uuid NOT NULL,
  title text NOT NULL DEFAULT '',
  given text NOT NULL DEFAULT '',
  when_step text NOT NULL DEFAULT '',
  then_step text NOT NULL DEFAULT '',
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.s4_test_cases TO service_role;
ALTER TABLE public.s4_test_cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny all client access to s4_test_cases"
  ON public.s4_test_cases FOR ALL TO authenticated, anon
  USING (false) WITH CHECK (false);
CREATE INDEX s4_test_cases_user_idx ON public.s4_test_cases(user_id);
CREATE INDEX s4_test_cases_session_idx ON public.s4_test_cases(session_id);
CREATE TRIGGER s4_test_cases_touch
  BEFORE UPDATE ON public.s4_test_cases
  FOR EACH ROW EXECUTE FUNCTION public.s3_touch_updated_at();

CREATE TABLE public.s4_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  session_id uuid NOT NULL,
  role text NOT NULL DEFAULT '',
  context text NOT NULL DEFAULT '',
  task text NOT NULL DEFAULT '',
  nonfunctional text NOT NULL DEFAULT '',
  confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.s4_prompts TO service_role;
ALTER TABLE public.s4_prompts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny all client access to s4_prompts"
  ON public.s4_prompts FOR ALL TO authenticated, anon
  USING (false) WITH CHECK (false);
CREATE INDEX s4_prompts_session_idx ON public.s4_prompts(session_id);
CREATE TRIGGER s4_prompts_touch
  BEFORE UPDATE ON public.s4_prompts
  FOR EACH ROW EXECUTE FUNCTION public.s3_touch_updated_at();
