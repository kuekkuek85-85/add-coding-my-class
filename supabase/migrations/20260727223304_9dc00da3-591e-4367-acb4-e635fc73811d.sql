ALTER TABLE public.checkpoints
  ADD COLUMN user_id uuid REFERENCES public.app_users(id) ON DELETE CASCADE,
  ADD COLUMN is_custom boolean NOT NULL DEFAULT false;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.checkpoints TO authenticated;
GRANT ALL ON public.checkpoints TO service_role;

ALTER TABLE public.checkpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own custom checkpoints" ON public.checkpoints
  FOR ALL TO authenticated
  USING (user_id IS NULL OR user_id = auth.uid())
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY "Service role manages all checkpoints" ON public.checkpoints
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);