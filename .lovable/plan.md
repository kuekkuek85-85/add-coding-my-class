# S1에 개인별 AI 비판적 사용 체크포인트 추가

## 목표
S1(기본 기능 떠올리기)에서 수강생이 **스스로 하나의 체크포인트**를 추가해, AI를 쓸 때 본인이 지켜야 할 기준을 직접 세우도록 유도한다. 사람마다 다른 기준을 가질 수 있게 한다.

## 변경 범위 요약
- 기존 5개 체크포인트는 그대로 유지한다.
- 사용자가 직접 문구(label)와 힌트(hint)를 입력해 **1개의 커스텀 체크포인트**를 추가/삭제할 수 있다.
- 추가한 체크포인트는 기존 체크포인트 목록에 자연스럽게 합쳐져 초록불 처리도 동일하게 가능하다.
- 강사 대시보드의 S1 진행률에도 자동 반영된다.

## 기술적 구현

### 1. DB 스키마 변경
`checkpoints` 테이블에 개인별 체크포인트를 담을 수 있도록 컬럼을 추가한다.

```sql
ALTER TABLE public.checkpoints
  ADD COLUMN user_id uuid REFERENCES app_users(id) ON DELETE CASCADE,
  ADD COLUMN is_custom boolean NOT NULL DEFAULT false;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.checkpoints TO authenticated;
GRANT ALL ON public.checkpoints TO service_role;
```

- 기존 시드 체크포인트: `user_id IS NULL`, `is_custom = false`
- 사용자 추가 체크포인트: `user_id = <본인 id>`, `is_custom = true`
- `user_id`가 NULL인 행은 모든 사용자에게 노출되고, `user_id`가 있는 행은 해당 사용자에게만 노출된다.

### 2. 서버 함수 수정
- `getMyS1State`: `stage_no = 1` AND (`user_id IS NULL` OR `user_id = $userId`) 조건으로 조회. `seq` 기준 정렬.
- `addCustomCheckpoint`: 본인의 S1 커스텀 체크포인트를 1개 추가. 이미 있으면 덮어쓰기 또는 "1개만 가능" 메시지 반환.
- `deleteCustomCheckpoint`: 본인 커스텀 체크포인트 삭제.
- `toggleCheckpoint`: 기존 로직 그대로 동작(커스텀 ID도 `checkpoint_progress`에 저장).

### 3. UI 수정
`src/components/school/S1Panel.tsx`:
- 기존 체크포인트 리스트 아래에 "내 AI 비판적 사용 질문" 소제목 추가.
- 커스텀 체크포인트가 없을 때: 문구 입력란 1줄(label) + 힌트 입력란 1줄(선택) + "추가" 버튼.
- 커스텀 체크포인트가 있을 때: 토글 가능한 체크포인트로 표시하고, 우측에 "삭제" 버튼.
- placeholder 예시: "AI가 제안한 기능이라도, 우리 반 학생에게 꼭 필요한가?"

### 4. 강사용 요약 반영
`getInstructorS1Summary`에서 `checkpoints` 조회 조건을 기존 시드만(`user_id IS NULL`)으로 고정하거나, 전체 사용자의 커스텀 체크포인트를 포함해 진행률 계산. 기존 `total`은 시드 기준을 유지하는 것이 강사 입장에서 혼란을 줄이므로, 기존 5개 total 유지하고 진행률은 사용자별 체크포인트 개수(시드+커스텀)로 계산하도록 조정한다.

### 5. 검증
- S1 페이지에서 새로고침 후 기존 5개 체크포인트 아래에 입력 폼이 보이는지 확인.
- 커스텀 체크포인트 추가 → 토글 → 삭제 → 다시 추가 흐름 테스트.
- 강사 대시보드에서 해당 사용자의 진행 개수가 정확히 반영되는지 확인.