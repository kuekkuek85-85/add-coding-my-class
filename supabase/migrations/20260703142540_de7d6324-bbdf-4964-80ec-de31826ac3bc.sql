
CREATE TABLE public.s2_test_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_id uuid NOT NULL,
  title text NOT NULL,
  given_when text NOT NULL,
  expected_then text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.s2_test_cases TO service_role;
ALTER TABLE public.s2_test_cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny all client access" ON public.s2_test_cases
  AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE INDEX s2_test_cases_user_idx ON public.s2_test_cases(user_id, created_at DESC);
