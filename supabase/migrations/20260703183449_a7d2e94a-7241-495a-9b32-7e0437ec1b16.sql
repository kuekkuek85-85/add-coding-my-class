
UPDATE public.checkpoints SET label='내 수업의 반복 업무·문제 상황 1개 적기', hint='예: "매 수업 시작마다 지난 시간 요약을 다시 설명해야 한다"' WHERE stage_no=1 AND seq=1;
UPDATE public.checkpoints SET label='AI가 대신 해주면 좋을 핵심 기능 1개 떠올리기', hint='그 문제를 해결할 가장 작은 단위의 기능 하나만 고릅니다. 예: "지난 수업 요약 자동 생성"' WHERE stage_no=1 AND seq=2;
UPDATE public.checkpoints SET label='사용자·수업 맥락 구체화', hint='어떤 학년·과목·상황에서 쓰이는지 한 줄로 적어봅니다. 예: "초5 과학, 단원 도입 5분"' WHERE stage_no=1 AND seq=3;
UPDATE public.checkpoints SET label='성공 판단 기준 1개 정하기', hint='"성공했다"고 어떻게 알 수 있나요? 예: "학생이 이전 시간 핵심 3가지를 말할 수 있다"' WHERE stage_no=1 AND seq=4;
UPDATE public.checkpoints SET label='지금은 하지 않을 범위(제외) 1개 정하기', hint='욕심을 줄이는 단계. 예: "평가/채점 기능은 이번엔 제외"' WHERE stage_no=1 AND seq=5;
