
-- 1) S1 체크포인트 정의 (전역, 세션 공용)
CREATE TABLE public.checkpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_no int NOT NULL,
  seq int NOT NULL,
  label text NOT NULL,
  hint text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(stage_no, seq)
);
GRANT ALL ON public.checkpoints TO service_role;
ALTER TABLE public.checkpoints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny all client access" ON public.checkpoints FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

-- 2) 참가자 체크포인트 진행
CREATE TABLE public.checkpoint_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  checkpoint_id uuid NOT NULL REFERENCES public.checkpoints(id) ON DELETE CASCADE,
  checked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, checkpoint_id)
);
GRANT ALL ON public.checkpoint_progress TO service_role;
ALTER TABLE public.checkpoint_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny all client access" ON public.checkpoint_progress FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

-- 3) 오전 "내 수업이라면?" 30초 메모
CREATE TABLE public.morning_memos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  stage_no int NOT NULL,
  text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.morning_memos TO service_role;
ALTER TABLE public.morning_memos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny all client access" ON public.morning_memos FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

CREATE INDEX idx_checkpoint_progress_user ON public.checkpoint_progress(user_id);
CREATE INDEX idx_morning_memos_user ON public.morning_memos(user_id, stage_no);

-- 4) S1 체크포인트 시드 (5개)
INSERT INTO public.checkpoints (stage_no, seq, label, hint) VALUES
  (1, 1, '첫 프롬프트로 실행 성공', '강사가 안내한 첫 프롬프트를 붙여넣고 결과가 나오는 것을 확인했다'),
  (1, 2, 'UI 커스터마이즈 1개 적용', '색상·폰트·레이아웃 중 하나를 내 취향으로 바꿔봤다'),
  (1, 3, '응답 형식 지시 추가', '예: "3문장으로", "이모지 없이" 같은 형식 지시를 프롬프트에 추가했다'),
  (1, 4, '내 교과 예시 1개 삽입', '내 담당 교과·학년의 실제 예시 문장을 넣어봤다'),
  (1, 5, '미리보기/배포 링크 열기', '완성된 화면을 새 창에서 열어 확인했다');
