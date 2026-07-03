# Step 4 — S3 「PRD 작성·검증」

3교시 전체 흐름을 완성합니다. 각 참가자는 PRD를 작성해 1차 제출 → Grill Me 도우미의 질문에 답변 → 다른 참가자 1명을 체인 방식으로 리뷰(좋은 점 필수) → 리뷰 반영 후 2차 제출 순으로 진행합니다.

## 완료 기준
- 참가자는 S3가 열리면 PRD 6개 섹션(문제·사용자·핵심 기능 3~5개·비기능·성공지표·범위 밖)을 작성해 **1차 제출**할 수 있다.
- 1차 제출 이후에만 **Grill Me** 패널이 열리며, Lovable AI가 PRD를 읽고 3~5개의 질문·모호점을 제시한다. AI는 절대 문장을 대신 쓰지 않는다(질문·플래그만).
- 시스템이 리뷰 짝을 체인(참가자를 순환)으로 자동 배정한다. 리뷰 폼에는 "좋은 점" 필수 입력이 있고 비어 있으면 제출 불가.
- 리뷰 완료 후 참가자는 PRD를 수정하고 **2차 제출**할 수 있으며 S3 게이트가 통과된다(참가자 그리드에 S3 도장).
- 강사석은 세션 참가자별 S3 상태(1차/리뷰 완료/2차)를 실시간 확인한다.

## 1) 데이터베이스 (마이그레이션 1건)

세 개 테이블 신설. RLS는 프로젝트 관례대로 `Deny all client access`(서버 함수 전용), GRANT는 `service_role`만.

- `s3_prd_drafts` — 참가자별 1행(upsert). 컬럼: `id`, `user_id`(unique), `session_id`, `problem`, `users`, `features`(text 3~5줄 개행 구분), `nonfunctional`, `success_metric`, `out_of_scope`, `submitted_v1_at`(nullable), `submitted_v2_at`(nullable), `updated_at`.
- `s3_grill_questions` — Grill Me 질문 캐시. 컬럼: `id`, `user_id`, `session_id`, `draft_snapshot`(text, 질문 생성 시점 PRD 스냅숏), `questions`(jsonb 배열: `[{ q, tag }]`), `created_at`. 같은 스냅숏이면 재사용.
- `s3_reviews` — 체인 리뷰. 컬럼: `id`, `reviewer_id`, `reviewee_id`, `session_id`, `good`(text, NOT NULL, min length 서버 검증), `question`(text), `suggestion`(text), `submitted_at`, `updated_at`. 유니크 `(reviewer_id, reviewee_id)`.
- 체인 짝 배정은 별도 테이블 없이 참가자 리스트를 `nickname` 순 정렬 후 `i → (i+1) mod n`로 서버 함수에서 계산(1차 제출한 사람만 대상). 결과는 서버 함수 응답으로만 제공.

## 2) 서버 함수 (`src/lib/s3.functions.ts` 신설)

전부 `requireSupabaseAuth` 미들웨어, 참가자 role 검증(강사는 조회만).

- `getMyPrdDraft({ userId })` — 없으면 빈 폼 초기값 반환.
- `saveMyPrdDraft({ userId, fields })` — 상시 upsert(자동 저장). 게이트 통과 후에는 잠금.
- `submitPrdV1({ userId })` — 6개 필드 필수·features 3줄 이상 검증 후 `submitted_v1_at=now()`.
- `submitPrdV2({ userId })` — v1 제출·리뷰 완료(내가 받은 리뷰 1건 존재) 전제 검증 후 `submitted_v2_at=now()`. 이 시점에 S3 게이트 통과로 간주.
- `getGrillQuestions({ userId })` — v1 제출된 경우에만. 캐시된 스냅숏과 현재 PRD가 같으면 캐시 반환, 다르면 Lovable AI Gateway(`google/gemini-2.5-flash`)에 시스템 프롬프트("너는 사용자 대신 PRD 문장을 쓰지 않는다. 오직 모호하거나 검증이 필요한 지점만 짧은 질문으로 3~5개 제시하라. 예시 답을 금지한다.")로 요청, JSON 배열만 파싱해 저장·반환. 실패 시 `{ error }` 반환(폴백 문장 없이 재시도 안내만).
- `getMyReviewAssignment({ userId })` — 위 체인 규칙으로 대상 참가자 산정. 대상자가 v1 미제출이면 `waiting` 상태 반환.
- `getRevieweeDraft({ revieweeId })` — 배정된 대상자의 PRD 스냅숏만 조회.
- `submitReview({ revieweeId, good, question, suggestion })` — `good.trim().length >= 5` 서버 검증, upsert.
- `getReviewsForMe({ userId })` — 내가 받은 리뷰 목록.
- `getSessionS3Overview({ userId })` — 강사 전용. 참가자별 `{ nickname, v1, reviewGiven, reviewReceived, v2 }` 배열.

## 3) 라우팅과 UI

- 새 라우트 `src/routes/s3.tsx` — S3가 열려 있을 때만 접근, 잠겨 있으면 홈으로 안내. 4개 탭(스텝퍼): **작성 → 1차 제출 & Grill Me → 동료 리뷰 → 2차 제출**. 현재 단계 상태에 따라 자동 활성화.
- `home.tsx`의 3교시 카드에서 "지금 진행 가능"이면 **S3 열기** 버튼으로 진입.
- 컴포넌트(신규, `src/components/s3/`):
  - `PrdForm.tsx` — 6개 섹션 폼, 자동 저장(디바운스 1초), 진행률 표시.
  - `GrillPanel.tsx` — 질문 리스트(로딩·오류·재요청 버튼). AI가 답을 제안하지 않음을 UI에 명시("AI는 질문만 합니다. 답은 여러분이 채워주세요").
  - `ReviewGivePanel.tsx` — 배정된 대상자 PRD 읽기 전용 뷰 + 리뷰 폼(좋은 점 필수, 카운터, 미입력 시 버튼 비활성 + 서버 검증).
  - `ReviewReceivedList.tsx` — 내가 받은 리뷰 카드 목록.
  - `PrdSubmitBar.tsx` — 하단 고정 바, 현재 상태에 맞는 CTA 하나만 노출.
- 강사석 `instructor.tsx`에 **S3 진행표** 섹션 추가(15초 refetch). 참가자 그리드 S3 컬럼은 기존 셀에서 v1(회색 점)/리뷰(노랑)/v2(초록 도장) 세 단계로 시각화. `ParticipantGrid` 최소 수정.

## 4) 규칙 준수 체크포인트
- **AI 대필 금지** — Grill 시스템 프롬프트에서 명시적으로 답변·문장 예시 금지. 응답 JSON 스키마에 `answer` 필드 없음(질문만).
- **좋은 점 필수** — 클라이언트 disable + 서버 검증 이중.
- **게이트 없이 다음 스테이지 진입 금지** — S3 라우트는 세션 `current_stage>=3`일 때만, S4는 v2 제출 완료된 사용자 목록 파생.
- **한국어 UI, 이모지 없음, 밝은 학교 톤**.

## 5) 이번 턴에 하지 않는 것
- S4~S6 스테이지 화면.
- 리뷰 큐 재배정 UI(대상자가 v1을 안 냈을 때는 안내만).
- 리뷰 이력 아카이브·PDF 내보내기.
- Grill Me 대화 이어가기(라운드는 1회, 스냅숏 변경 시 새 질문).
- 강사가 참가자 PRD를 직접 열람하는 뷰(다음 스텝에서 추가 예정).

## 기술 세부
- Lovable AI Gateway 호출은 `LOVABLE_API_KEY`를 `process.env`로 읽어 handler 내부에서만 사용, 응답은 JSON 스키마 강제(`response_format: { type: "json_object" }`) 또는 파서 실패 시 `error` 반환.
- 자동 저장은 React `useEffect` + `setTimeout` 디바운스, 서버 함수는 항상 upsert.
- 체인 매칭은 참가자 role 필터 + `nickname` 오름차순 + `.map((u,i,arr)=>[u, arr[(i+1)%arr.length]])`.
- 라우트별 `errorComponent`, `notFoundComponent`, `defaultErrorComponent` 준수.
- 마이그레이션 후 `types.ts` 재생성될 때까지 UI 코드 편집 시점 조정.
