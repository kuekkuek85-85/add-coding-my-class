# Step 7 · S6 「갤러리 발표」 (6교시)

S1~S5까지 완료된 참가자들이 자신의 여정(PRD → 첫 프롬프트 → 실행 체크 → 수정 프롬프트)을 정리해 **3분 발표**하고, 청중은 **좋은 점 코멘트**를 실시간으로 남기는 마지막 스테이지입니다.

## 완료 기준

- **갤러리**: S5 확정한 참가자 카드 목록. 각 카드는 닉네임 + PRD 제목 + 프롬프트/수정 프롬프트 미리보기 + "펼쳐보기". 서로의 산출물을 자유롭게 열람.
- **발표 슬라이드 초안 생성기**: 참가자가 자기 카드에서 "슬라이드 초안 만들기" → Lovable AI로 6장 초안(표지 / PRD 한 문장 / 첫 프롬프트 요약 / 실행 체크에서 배운 것 / 수정 프롬프트 핵심 / 다음에 해볼 것) 생성. **초안은 반드시 교사(=자기 자신)가 각 슬라이드 문장을 편집 후 "발표 준비 완료" 버튼을 눌러야 확정.** 이 예외는 프로젝트 원칙에 명시.
- **발표 순서**: 강사가 발표 큐에 참가자를 등록/재정렬/현재 발표자 지정. "지금 발표 중" 표시가 모든 참가자 화면에 실시간 반영.
- **청중 코멘트**: 발표 중인 참가자에게 다른 참가자들이 "좋은 점"(필수 5자 이상) + "질문/제안"(선택) 코멘트 남김. 발표자 카드 하단에 실시간 누적.
- **강사 대시보드**: 발표 큐 관리(추가/제거/순서 변경/다음), 3분 타이머(시작/일시정지/리셋), 참가자별 발표 완료 도장, S6 진행표.
- **최종 게이트**: 자기 슬라이드 확정 + 발표 완료 표시(강사가 눌러줌) → S6 도장 → 그리드 전 스테이지 완료.

## 데이터 (마이그레이션 1건)

- `s6_slide_decks` — 참가자별 1행. `user_id`, `session_id`, `title`, `slides` (jsonb: `[{heading, body}]` 6개), `draft_generated_at`, `confirmed_at`.
- `s6_comments` — 청중 코멘트. `presenter_id`, `commenter_id`, `session_id`, `good`(필수), `question`.
- `s6_presentation_queue` — 발표 순서. `session_id`, `user_id`, `order_index`, `state`(waiting/current/done), `started_at`, `finished_at`. `(session_id, user_id)` unique.
- 세 테이블 모두 Deny-all + `service_role` GRANT, 서버 함수 경유.
- `sessions` 컬럼 추가: `s6_timer_started_at` (nullable) — 강사 타이머 서버 시각.

## 서버 함수 (`src/lib/s6.functions.ts`)

- 참가자: `getMyS6State`, `getGallery`(닉네임/PRD/프롬프트/수정 프롬프트 목록), `getParticipantBundle(userId)`(상세), `generateSlideDraft`(Lovable AI, 초안만), `saveMySlides`, `confirmMySlides`(6장 모두 heading+body 있음 필수), `submitComment`(좋은 점 5자+), `getMyReceivedComments`, `getCurrentPresenter`.
- 강사: `getSessionS6Overview`, `addToQueue`, `removeFromQueue`, `reorderQueue`, `setCurrentPresenter`, `markPresenterDone`, `startTimer`, `resetTimer`.
- 전부 `requireSupabaseAuth` + role 검증.

## UI

- 신규 라우트 `src/routes/s6.tsx` — 참가자용, 3개 탭: **1. 갤러리 → 2. 내 발표 슬라이드 → 3. 발표 진행(청중 코멘트)**.
- 컴포넌트 (`src/components/s6/`):
  - `GalleryGrid.tsx` — 참가자 카드 목록 + 상세 다이얼로그.
  - `SlideDraftEditor.tsx` — 6장 슬라이드 편집기(제목/본문 textarea × 6). 상단에 "초안 만들기"(AI) 버튼 + "AI 초안은 반드시 편집·확정 후 제출됩니다" 안내. 확정 시 잠금.
  - `SlidePreview.tsx` — 슬라이드 미리보기(1920×1080 스케일, `slides-app` 가이드 준수: `.slide-content` + `slide-title` / `slide-body` 시맨틱 클래스).
  - `PresentationStage.tsx` — 현재 발표자 표시 + 청중 코멘트 폼(내가 발표자가 아닐 때) 또는 받은 코멘트 실시간 목록(내가 발표자일 때).
  - `PresenterQueueAdmin.tsx`(강사용) — 큐 관리 + 타이머 + 완료 버튼.
- `src/routes/instructor.tsx`에 **S6 발표 진행** 섹션 추가 (`PresenterQueueAdmin` 사용).
- `src/components/school/ParticipantGrid.tsx` — S6 셀: 슬라이드 확정(회색 도장) → 발표 완료(초록 도장) 2단계.
- `src/routes/home.tsx` 6교시 카드에 "S6 열기" 버튼(S5 확정자만).
- 실시간 폴링: 발표 진행 상태 3초, 받은 코멘트 4초 간격 `refetchInterval`.

## 규칙 준수

- **AI 대필 예외**: 슬라이드 초안 생성만 허용. UI에 "AI 초안은 참고용 — 반드시 직접 편집·확정 후 발표합니다" 문구 상단 고정.
- 청중 코멘트 "좋은 점" 필수(5자 이상), 빈 값 제출 불가.
- 발표 순서·현재 발표자·완료 처리 권한은 강사만.
- 자기 슬라이드 확정 없이는 발표 큐 등록 불가.
- 한국어 UI, 학교 톤, 이모지 없음. 색약 접근성: 도장 상태는 색+아이콘+텍스트 병행.

## 기술 메모

- 슬라이드 미리보기는 편집기 우측에 320×180 축소판. 발표 스테이지에서는 큰 미리보기(960×540)로 렌더.
- 슬라이드 데이터는 `slides: [{heading, body}]` 형태의 jsonb 6원소 배열로 고정 저장.
- 타이머는 클라이언트 로컬 카운트(강사 화면만) — 서버 저장 최소화, `s6_timer_started_at` 만 저장해 새로고침 복원.
- 실시간은 기존 스테이지들과 동일한 폴링 방식.

## 이번 턴에 하지 않는 것

- 실제 프로젝터 풀스크린 프레젠테이션 모드(F5 등) — 강사 화면의 큰 미리보기로 대체.
- 슬라이드 드래그 재정렬 / 추가 슬라이드(6장 고정).
- 발표 녹화 / 발표 후 회고 카드.
- 슬라이드를 PDF/이미지로 내보내기.

이대로 진행할까요?
