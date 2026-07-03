
CREATE POLICY "Deny all client access" ON public.sessions
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "Deny all client access" ON public.app_users
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
