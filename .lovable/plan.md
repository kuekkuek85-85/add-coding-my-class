## 다음 단계: Step 5 — S4 「TDD + 구현」 (4교시)

지금까지 S1(글쌤봇 따라하기) · S2(확장 + 테스트 케이스) · S3(PRD 작성·검증) 세 스테이지와 오전 스탬프·신호등이 완성됐습니다. 남은 스테이지는 S4·S5·S6이고, 순서대로 다음은 **S4「TDD + 구현」** — S3에서 통과한 PRD를 근거로 테스트 케이스를 먼저 3개 이상 짜고, 그걸 기반으로 "첫 프롬프트"를 조립해 개발자(Lovable/AI 코딩 도구)에게 넘길 준비를 하는 스테이지입니다.

### 완료 기준
- S4가 열린 참가자는 자신의 확정된 PRD를 읽기 전용으로 보며 **테스트 케이스**를 3개 이상 작성한다(주어진/할 때/그러면 구조).
- **TDD 도우미**(AI)는 테스트 케이스를 대신 쓰지 않고, 누락된 관점(성공/실패/경계/접근성 등)만 짧게 지적한다.
- 테스트 케이스가 3개 이상이 되면 **첫 프롬프트 조립기**가 열린다. 참가자는 (역할·컨텍스트·해야 할 일·테스트 케이스·비기능) 5칸을 직접 채우고 미리보기에서 최종 프롬프트를 확인·복사할 수 있다. 이 프롬프트 역시 AI가 대신 쓰지 않는다(플래그만).
- 참가자가 "첫 프롬프트 확정" 버튼을 누르면 S4 게이트 통과 → 참가자 그리드 S4 도장.
- 강사석에서 참가자별 S4 상태(테스트 N개 / 프롬프트 확정)를 실시간 확인한다.

### 데이터 (마이그레이션 1건)
- `s4_test_cases` — 참가자별 여러 행. `user_id`, `session_id`, `title`, `given`, `when`, `then`, `order_index`.
- `s4_prompts` — 참가자별 1행(upsert). `user_id`, `session_id`, `role`, `context`, `task`, `nonfunctional`, `confirmed_at`.
- 두 테이블 모두 관례대로 `Deny all client access` + `service_role` GRANT, 서버 함수 경유.

### 서버 함수 (`src/lib/s4.functions.ts`)
- `getMyS4State` / `listMyTestCases` / `upsertTestCase` / `deleteTestCase` / `getTddHints`(Lovable AI, 힌트만) / `getMyPrompt` / `saveMyPrompt` / `confirmMyPrompt`(테스트 3개 이상 + 5칸 필수 검증) / `getSessionS4Overview`(강사용).
- 모두 `requireSupabaseAuth` + 참가자 role 검증.

### UI
- 새 라우트 `src/routes/s4.tsx` — 3개 탭: **테스트 케이스 → TDD 도우미 → 첫 프롬프트**. 이전 탭이 만족돼야 다음 탭 활성화.
- 컴포넌트 (`src/components/s4/`): `PrdReadOnly.tsx`(내 PRD 요약), `TestCaseList.tsx`(추가/편집/삭제, 최소 3개 진행률), `TddHintPanel.tsx`(질문·지적만), `FirstPromptBuilder.tsx`(5칸 폼 + 미리보기 + 복사), `S4SubmitBar.tsx`.
- `home.tsx` 4교시 카드에서 "지금 진행 가능"이면 **S4 열기** 버튼.
- `instructor.tsx`에 **S4 진행표** 섹션 (참가자별 테스트 개수·프롬프트 확정 여부), `ParticipantGrid`의 S4 셀에 회색점(진행 중)/노랑(테스트 3+)/초록 도장(확정) 3단계.

### 규칙 준수
- AI 대필 금지 — TDD 도우미와 프롬프트 조립기 모두 "질문·지적만, 문장은 여러분이 씁니다" 문구 명시.
- 게이트 없이 다음 스테이지 진입 금지 — S5는 S4 확정된 사용자만 진입.
- 한국어 UI, 밝은 학교 톤, 이모지 없음.

### 이번 턴에 하지 않는 것
- S5(교차 QA + 개선), S6(갤러리 발표).
- 참가자 간 프롬프트 공유·복사 갤러리.
- Lovable/외부 코딩 도구로 실제 앱을 만드는 부분(참가자가 오프라인에서 진행).
- 강사가 참가자 프롬프트를 직접 편집하는 기능.

### 다른 선택지 (원하시면 우선순위 변경 가능)
1. **Step 6로 건너뛰기 — S5·S6 스텁 라우트만 먼저 만들기**: 강사가 남은 시간 배분을 미리 확인.
2. **강사 도구 보강**: 참가자별 PRD·테스트·프롬프트를 강사가 열람할 수 있는 뷰(S3 후행 작업으로 미뤄둔 것).
3. **오전 스탬프 후속** — 오후 시작 전에 노출되는 회고 카드(선택 사항).

기본 제안은 **Step 5(S4 「TDD + 구현」)** 이지만, 위 대안 중 하나가 더 급하면 말씀해 주세요.