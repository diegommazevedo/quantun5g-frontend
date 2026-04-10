-- QUANTUM5G - Chat history scoped by authenticated user
-- Safe to run multiple times.

ALTER TABLE public.ai_chat_history
  ADD COLUMN IF NOT EXISTS user_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'ai_chat_history'
      AND constraint_name = 'ai_chat_history_user_id_fkey'
  ) THEN
    ALTER TABLE public.ai_chat_history
      ADD CONSTRAINT ai_chat_history_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ai_chat_history_diag_user_created
  ON public.ai_chat_history(diagnostic_id, user_id, created_at DESC);

-- If already authenticated and linked to diagnostics by role:
-- admins: can access all
DROP POLICY IF EXISTS ai_chat_admin ON public.ai_chat_history;
CREATE POLICY ai_chat_admin ON public.ai_chat_history
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- consultants: only their own messages in their own diagnostics
DROP POLICY IF EXISTS ai_chat_consultant ON public.ai_chat_history;
CREATE POLICY ai_chat_consultant ON public.ai_chat_history
  FOR ALL TO authenticated
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.diagnostics d
      WHERE d.id = ai_chat_history.diagnostic_id
        AND d.consultant_id = auth.uid()
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.diagnostics d
      WHERE d.id = ai_chat_history.diagnostic_id
        AND d.consultant_id = auth.uid()
    )
  );

