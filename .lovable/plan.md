## 문제
- `TrafficLight`는 `session` prop이 있을 때만 노랑/빨강 클릭 시 미션 등록 팝업(`MissionComposer`)을 연다.
- 현재 `home.tsx`만 `session={stored}`를 전달하고, `s1~s6` 라우트는 `userId`만 넘긴다.
- 그래서 PRD 작성(S3/S4) 등 스테이지 화면에서는 신호등을 눌러도 팝업이 뜨지 않는다.

## 수정
- `src/routes/s1.tsx`, `s2.tsx`, `s3.tsx`, `s4.tsx`, `s5.tsx`, `s6.tsx` 6개 파일의 `<TrafficLight userId={stored.userId} />` 호출에 `session={stored}`를 추가.

## 검증
- S3(PRD 작성) 화면에서 신호등 노랑/빨강 클릭 → 미션 등록 팝업 노출 확인.
- 다시 초록으로 돌렸다가 빨강 눌러도 팝업 재노출되는지 확인.
- 다른 스테이지에서도 동일 동작 확인.

UI/props 전달만 손대며 서버 로직·데이터 스키마는 변경하지 않는다.