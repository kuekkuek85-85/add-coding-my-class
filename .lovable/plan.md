# 2D 사무실 대시보드 + 좌석/아바타 로그인

## 개요
로그인 시 좌석과 아바타를 선택하게 하고, 강사 대시보드에 "리스트 / 2D 사무실" 탭을 추가한다. 사무실 뷰에서는 각 자리에 참가자 아바타가 배치되고, 실시간으로 진행 현황이 3중(진행바+링 색상+말풍선) 방식으로 표시된다.

## 데이터 모델 변경

`app_users` 테이블에 컬럼 3개 추가 (마이그레이션):
- `seat_id text` — 좌석 슬롯 ID (예: `back-1`, `t-top-2`, `t-left-3`). unique per session.
- `avatar jsonb` — `{ hair: "h1"|"h2"|..., hairColor: "#...", top: "t1"|..., topColor: "#...", skin: "#...", accessory: "none"|"glasses"|"hat" }`
- `is_seated boolean default false` — 좌석 확정 여부

## 좌석 배치도 (총 20석, 좌석 ID 고정)
```text
back:      [b1 b2] [b3 b4] [b5 b6] [b7 b8]      (뒤쪽 긴 책상 8석)
t-top:            [tt1 tt2] [tt3 tt4]           (T자 상단 가로 4석)
t-left:           [tl1][tl2] ... [tl3][tl4]     (T자 좌측 세로 4석)
t-right:          [tr1][tr2] ... [tr3][tr4]     (T자 우측 세로 4석)
front-monitor:    [강사석 · 고정, TEACHER 계정에 자동 할당]
```
좌표는 `src/lib/office-layout.ts` 상수로 하드코딩 (SVG viewBox 기준 `{x,y,rotation}`).

## 아바타 프리셋
`src/lib/avatar-presets.ts`:
- 머리 스타일 6종 (SVG path)
- 머리색 8종 (팔레트)
- 상의 스타일 5종
- 상의색 8종
- 피부톤 4종
- 액세서리 4종 (없음/안경/모자/헤드셋)

`<AvatarSvg avatar={...} size={64} />` 컴포넌트가 SVG 레이어를 조합해 렌더링. 픽셀 느낌은 rendering `image-rendering: pixelated` + 각진 shape로.

## 로그인 흐름 변경
`src/routes/index.tsx` → 3단계 마법사:
1. **코드 + 닉네임** (기존)
2. **아바타 꾸미기** — 각 옵션 좌우 화살표로 순환, 실시간 미리보기
3. **좌석 선택** — 좌석 배치도 SVG. 이미 점유된 좌석은 회색(닉네임 표시), 빈 좌석은 주황색 클릭 가능. 강사석은 표시만.

`enterSession` 서버함수 확장: `{ code, nickname, avatar, seatId }` 받아 `app_users`에 저장. 좌석 중복 시 에러. 재입장(동일 닉네임)은 기존 avatar/seat 유지.

강사(`TEACHER7`)는 아바타 선택만 하고 좌석은 자동으로 `instructor-desk`.

## 강사 대시보드: 뷰 탭
`src/routes/instructor.tsx` 상단에 `Tabs` 추가:
- **리스트** (기존 전체 유지, 순서/기능 그대로)
- **2D 사무실** (신규 `<OfficeView />`)

## 2D 사무실 뷰
`src/components/office/OfficeView.tsx`:
- SVG 캔버스 (viewBox `0 0 1200 900`), 첨부한 사무실 이미지 톤(마루 바닥 갈색, 앞쪽 모니터, 벽·화이트보드)을 CSS 그라디언트+SVG shape로 스타일링. 픽셀 이미지 자체는 사용하지 않고 재현.
- 좌석 배치도의 좌표에 책상+의자 SVG를 그리고, 참가자 아바타를 그 자리에 렌더.
- 강사석(내 아바타)은 앞쪽 모니터 아래.

### 실시간 진행 현황 표시 (혼합 방식)
각 참가자 자리마다:
1. **책상 위 6칸 진행바** — S1~S6, 완료=칠판그린, 현재=옐로 펄스, 대기=회색.
2. **아바타 링 색상** — 현재 교시 색 (S1 노랑 / S2 코랄 / S3 보라 / S4 파랑 / S5 초록 / S6 자홍).
3. **말풍선 아이콘** — 우측 상단에 상태 배지:
   - 신호등 빨강 → 🚨 (도움 요청, 펄스 애니메이션)
   - 게이트 통과 순간 → 도장 스탬프 애니메이션(2초 fade)
   - 발표 중이면 🎤

### 상호작용
- 아바타 클릭 → 기존 `ParticipantDetailDialog` 오픈 (재사용).
- 우측 하단 범례 카드 (색상 = 어느 교시).

### 데이터
`getInstructorOverview` 응답에 이미 있는 `stageStatus`/`helpLevel`/`currentPresenter` 재사용. 5초 폴링. 좌석/아바타는 `snapshot.members`에 seat_id·avatar 추가로 확장.

## 서버함수 변경 요약
- `enterSession` — avatar/seatId 파라미터 추가, 좌석 중복 체크.
- `getSessionSnapshot`, `getInstructorOverview` — members에 `seat_id`, `avatar` 포함.
- 신규 `getOccupiedSeats(sessionId)` — 로그인 화면에서 실시간(3초 폴링)으로 점유 좌석 조회.

## 기술 상세 (참고)

### 파일 목록
```text
supabase/migrations/<ts>_seat_avatar.sql
src/lib/office-layout.ts          (좌석 좌표 상수)
src/lib/avatar-presets.ts         (아바타 옵션 상수)
src/components/avatar/AvatarSvg.tsx
src/components/avatar/AvatarBuilder.tsx
src/components/office/SeatPicker.tsx
src/components/office/OfficeView.tsx
src/components/office/SeatedAvatar.tsx  (아바타+진행바+배지)
src/routes/index.tsx              (3단계 마법사로 개편)
src/routes/instructor.tsx         (Tabs 추가)
src/lib/session.functions.ts      (enterSession 확장, getOccupiedSeats 신규)
src/lib/instructor-detail.functions.ts (members에 seat/avatar)
```

### 기존 동작 보존
- 이미 로그인한 사용자(seat/avatar가 null)는 자동으로 좌석 미배치 상태. 강사 뷰의 2D 사무실에서는 "미착석" 영역(좌측 하단)에 표시.
- 리스트 뷰는 완전히 그대로. 시간표/게이트/도장 로직 무변경.
- 색약 접근성: 링 색상만이 아니라 진행바 텍스트 라벨("3교시")도 병기.

### 확인 항목
1. 좌석 20개 렌더 및 클릭 시 `app_users.seat_id` 저장.
2. 다른 사용자가 같은 좌석을 시도하면 에러 토스트.
3. 강사 2D 뷰에서 참가자가 스테이지를 통과할 때 진행바 갱신(5초 이내).
4. 신호등 빨강 시 배지 펄스.
5. 모바일에서도 좌석 선택 화면 스크롤/줌 가능.
