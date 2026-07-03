# Step 3-E — 오전 스탬프 & 신호등 버튼

오전 세션(S1+S2)이 스스로 마무리되도록 **오전 완료 도장**을 추가하고, 스테이지와 독립적으로 언제든 도움을 요청할 수 있는 **신호등 버튼**을 참가자 화면에 배치합니다. 강사석에서는 두 정보가 실시간으로 보입니다.

## 완료 기준
- 참가자가 S1 체크포인트 5/5 + S2 테스트 케이스 2건을 모두 채우면 홈 상단에 "오전 완료" 도장이 도장 애니메이션과 함께 나타난다.
- 참가자는 상시 신호등(초록/노랑/빨강) 상태를 하나 선택할 수 있고, 다시 눌러 초록으로 되돌릴 수 있다.
- 강사 대시보드의 참가자 그리드에서 각 참가자의 신호등 색과 오전 도장 여부가 한눈에 보이며 15초 이내에 반영된다.
- 강사석 상단에 노랑/빨강 신호등을 켠 참가자 알림 스트림(최근순 5명)이 뜬다.

## 1) 데이터베이스 (마이그레이션 1건)

새 테이블 `help_signals`:
- 컬럼: `id`, `user_id`, `session_id`, `level`(text, `green`|`yellow`|`red`), `note`(text nullable, 짧은 메모 선택), `updated_at`
- 유니크: `(user_id)` — 참가자당 1행. Upsert로 최신 상태만 유지.
- RLS: 프로젝트 관례대로 `Deny all client access` (서버 함수로만 접근).
- GRANT: `service_role` 전체. 참가자·강사 모두 서버 함수로만 읽고 쓰므로 anon/authenticated 권한 부여 안 함.

오전 도장은 별도 테이블 없이 **파생 상태**로 계산합니다 (S1 5/5 + S2 2건 이상). 강사 그리드에 이미 두 값이 있으므로 클라이언트 합산으로 충분.

## 2) 서버 함수 (`src/lib/help.functions.ts` 신설)

- `setMyHelpSignal({ userId, level, note? })` — upsert, 참가자 본인만 호출 가능(role 검증).
- `getMyHelpSignal({ userId })` — 현재 신호등 상태 반환.
- `listSessionHelpSignals({ userId })` — 강사만 호출, 세션 내 모든 참가자의 최신 신호를 `{ userId, nickname, level, note, updated_at }` 배열로 반환. `getSessionSnapshot`의 참가자 그리드 응답에 병합해도 되지만, 15초 refetch 주기가 달라 별도 함수로 분리.

## 3) 참가자 UI

**`src/components/school/TrafficLight.tsx` 신설** — 세 버튼(초록/노랑/빨강) + 짧은 라벨 + 각 색 아이콘(원+체크/느낌표/X). 색약 접근성을 위해 색+아이콘+텍스트 병행. 선택된 색은 굵은 외곽선 + `aria-pressed`. 모바일 우선 레이아웃(가로 3분할, 손가락 크기 최소 48px).

- 배치: `home.tsx` 우상단 명찰 옆(모바일에서는 헤더 아래 가로 스트립).
- 상태 저장: 낙관적 업데이트 + 서버 upsert. 15초 refetch로 강사석과 동기화.
- 문구: 초록 "잘 되고 있어요" / 노랑 "잠깐 봐주세요" / 빨강 "막혔어요".

**`src/components/school/MorningStamp.tsx` 신설** — S1 5/5 + S2 통과 시 렌더. 큰 도장 배지(`Stamp` 아이콘 + "오전 완료"), 첫 통과 순간에 `animate-scale-in`과 회전 스탬프 효과(단발성, `useEffect`로 이전 상태와 비교). 통과 취소되지 않도록 로컬 sticky flag(localStorage) 사용.

- 배치: `home.tsx`에서 S1Panel 위. 조건: `s1.checked === 5 && s2.passed`. 이 두 값을 위해 `S1Panel`이 이미 가진 `getMyS1State` 응답을 홈에서도 받도록 훅 리팩터링(또는 홈에서 별도 조회 서버 함수 호출).

## 4) 강사 UI (`src/routes/instructor.tsx` + `ParticipantGrid.tsx`)

- 참가자 그리드에 **신호등 컬럼** 신설 — 참가자 이름 왼쪽 8px 원형 뱃지(초록/노랑/빨강). 오전 도장은 이름 오른쪽에 작은 스탬프 아이콘.
- 상단 세션 정보 카드 오른쪽에 **"도움 요청" 미니 스트림 카드**: 노랑/빨강만 필터, 최근 5명, 닉네임+색+메모(있으면). 비어 있으면 "모두 초록입니다" 문구.
- refetch 주기 5초(신호등 스트림만), 그리드는 기존 15초 유지.

## 5) 강의 슬라이드 텍스트 (선택, 짧게)

`s1-07-signal` 슬라이드가 이미 신호등 3색을 안내하고 있으므로 캡션 한 줄 보강만 진행 — "화면 우상단 버튼으로 언제든 알려주세요". 콘텐츠 대규모 변경 없음.

## 기술 세부

- 신호등 upsert는 `onConflict: 'user_id'` 사용. 초기 상태는 서버에서 로우 없으면 "green" 반환(가상 기본값).
- `S1Panel`에서 이미 조회 중인 체크포인트 진도 `useQuery`를 홈에서도 재사용하도록 `queryKey`를 `["s1-state", userId]`로 통일하고 `MorningStamp`가 같은 key를 구독. 중복 요청 없음.
- 참가자 신호등 조회는 `useQuery`로 세션 시작 시 최초 1회 hydrate 후 로컬 상태로 처리(사용자 조작 즉시 반영, 서버는 백그라운드 upsert).
- 강사석 도움 요청 스트림은 `listSessionHelpSignals` + `.filter(level !== 'green')` + `.slice(0,5)`.
- 도장 애니메이션은 `@keyframes stamp` (rotate + scale)를 `src/styles.css`에 추가; 기존 `animate-scale-in`으로도 충분하면 skip.
- 모든 문구 한국어, 이모지 없음.

## 이번 턴에 하지 않는 것
- S3 이후 스테이지(PRD 폼, 리뷰, TDD 도우미 등)
- 신호등 이력 로그(현재 상태만 보관)
- 강사가 참가자 신호에 응답하는 채팅 채널
- 오전 도장 외 스테이지별 도장 (S3~S6은 각 스테이지 구현 시 함께 추가)
