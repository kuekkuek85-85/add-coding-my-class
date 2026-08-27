ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS max_stage integer NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS seat_layout text NOT NULL DEFAULT 'office';

ALTER TABLE public.sessions DROP CONSTRAINT IF EXISTS sessions_seat_layout_check;
ALTER TABLE public.sessions ADD CONSTRAINT sessions_seat_layout_check CHECK (seat_layout IN ('office','classroom'));

INSERT INTO public.sessions (name, participant_code, instructor_code, current_stage, max_stage, seat_layout)
SELECT '8기 · 장평중 인공지능 석류반', 'SEOKRYU', 'SRTEACH', 1, 2, 'classroom'
WHERE NOT EXISTS (SELECT 1 FROM public.sessions WHERE participant_code = 'SEOKRYU');

UPDATE public.sessions SET seat_layout = 'classroom', max_stage = 2 WHERE participant_code = 'SEOKRYU';