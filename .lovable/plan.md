# Step 8 · 연수 마무리 「수료식과 명찰 완성」

S1~S6를 모두 통과한 참가자가 **오늘의 여정을 한 화면에 모아 보고, 회고를 남기고, 수료 도장을 받는** 마지막 단계입니다. 강사는 연수를 공식 종료할 수 있습니다.

## 완료 기준

- **내 산출물 모아보기 (`/portfolio`)** — 참가자용 한 페이지에 아침 메모 → S2 테스트 케이스 → S3 PRD → S4 첫 프롬프트 → S5 실행 체크·수정 프롬프트 → S6 슬라이드·받은 코멘트 요약. 스테이지별 도장 상태 배지. 인쇄 친화 레이아웃.
- **회고 카드** — 포트폴리오 상단에 "오늘 배운 것 1문장(필수, 10자+)" + "다음 수업에 시도할 것 1문장(선택)" 폼. 강사 대시보드에 실시간 모음 뷰.
- **최종 게이트 · 수료 도장판** — S1 아침 도장 + S2~S6 6개 도장 + 회고 제출이 모두 완료되면 홈 화면에 "심화반 수료" 종합 스탬프(큰 도장 카드) 노출.
- **수료증(명찰형)** — 닉네임 + 세션명 + 6개 도장 아이콘 + 수료 시각을 담은 카드. 브라우저 인쇄로 저장 가능(PDF 출력은 브라우저 기본 기능 이용, 별도 라이브러리 없음).
- **강사 연수 종료 처리** — 강사 대시보드에 "연수 종료" 버튼. `sessions.state = 'closed'` 로 전환하면 참가자 홈이 수료 모드로 잠기고 새 편집이 막힘(뷰만 허용).

## 데이터 (마이그레이션 1건)

- `s7_retrospectives` — 참가자별 1행. `user_id`, `session_id`, `learned`(text, not null, 10자+), `next_try`(text, nullable), `submitted_at`. `(session_id, user_id)` unique.
- `sessions` 컬럼 추가: `closed_at` (nullable timestamptz).
- Deny-all RLS + `service_role` GRANT, 서버 함수 경유(기존 스테이지들과 동일 패턴).

## 서버 함수 (`src/lib/s7.functions.ts`, `session.functions.ts` 확장)

- 참가자:
  - `getMyPortfolio(userId)` — S1 메모/S2 케이스/S3 PRD/S4 프롬프트/S5 수정본/S6 슬라이드+받은 코멘트+도장 상태를 하나의 DTO로 반환.
  - `getMyRetrospective`, `saveMyRetrospective` (10자 검증).
  - `getMyCompletion` — 6개 도장 + 회고 제출 여부 + 완료 시각 계산.
- 강사:
  - `getSessionRetrospectives` — 참가자별 회고 모음(닉네임 + 두 문장 + 시각).
  - `getSessionCompletion` — 참가자별 완료 여부 요약.
  - `closeSession` / `reopenSession` — `sessions.closed_at` 토글, admin 역할 검증.

전부 `requireSupabaseAuth` + 역할 검증. Lovable AI 호출 없음(대필 금지 원칙).

## UI

- 신규 라우트 `src/routes/portfolio.tsx` — 참가자용 포트폴리오+회고+수료증 한 페이지, 인쇄 스타일(@media print) 포함.
- 컴포넌트 (`src/components/s7/`):
  - `PortfolioSummary.tsx` — 스테이지별 카드 6개 요약(펼치기 없이 요점만).
  - `RetrospectiveForm.tsx` — 두 문장 입력 폼, 저장 후 잠금(수정은 세션 종료 전까지 허용).
  - `CompletionStamp.tsx` — 수료 상태 큰 도장 카드(미완료 시 남은 항목 안내).
  - `CertificateCard.tsx` — 명찰형 수료증(인쇄 최적화, 세션명·닉네임·6도장·수료 시각).
  - `RetrospectiveWall.tsx`(강사용) — 실시간 회고 모음 그리드.
  - `SessionCloseControl.tsx`(강사용) — 종료/재개 토글 + 확인 다이얼로그.
- `src/routes/home.tsx` — 홈 상단에 `CompletionStamp` + "내 산출물 모아보기 열기" 버튼(S6 완료자만 활성). 세션 종료 시 시간표 카드 편집 잠금 문구.
- `src/routes/instructor.tsx` — 「연수 마무리」 섹션 추가(회고 모음 + 종료 버튼).
- `src/components/school/ParticipantGrid.tsx` — 마지막 열에 "회고" + "수료" 상태 컬럼 추가.

## 규칙 준수

- AI 대필 금지: 회고·포트폴리오 어디에도 AI 자동 작성 없음.
- 회고 "배운 것" 필수(10자 이상), 빈 값 제출 불가.
- 세션 종료 권한은 강사(admin)만.
- 세션 종료 이후 참가자 서버 함수는 `session.closed_at != null` 이면 편집 계열(save/confirm/submit)을 거부, 조회는 허용.
- 한국어 UI, 학교 톤. 도장 상태는 색+아이콘+텍스트 병행. 모바일 우선 레이아웃.

## 기술 메모

- 수료증 인쇄는 `window.print()` + `@media print { ... }` CSS만 사용. PDF 라이브러리 도입 없음.
- 실시간은 기존 스테이지와 동일한 폴링 방식(`refetchInterval`).
- 데이터 시딩은 별도로 하지 않음(리허설용 4명은 이미 존재).

## 이번 턴에 하지 않는 것

- 수료증 이미지/PDF 서버 생성, 이메일 발송.
- 강사용 CSV 내보내기, 참가자별 상세 분석 리포트.
- 발표 녹화, 슬라이드 PDF 내보내기(계획 파일에 이미 보류로 명시된 항목).
- 헬프 신호 히스토리 뷰(별도 후속 작업).

이대로 진행할까요?
