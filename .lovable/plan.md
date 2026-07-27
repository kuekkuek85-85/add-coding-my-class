# DJ 노동요 위젯 구현 계획

강사 대시보드 우측 하단에 유튜브 링크 기반의 백그라운드 음악 플레이어를 띄우고, 강사·수강생 모두 큐에 곡을 등록할 수 있는 협업형 DJ 기능을 추가합니다. 실제 소리 재생은 **강사 브라우저에서만** 발생합니다.

## 사용자 흐름

- **강사**: 우측 하단 🎧 버튼 → 미니 플레이어 펼침. 재생/일시정지/정지/이전/다음/삭제, 링크 붙여넣기 후 "큐에 추가" 또는 "바로 실행" 사용.
- **수강생**: 우측 하단 🎧 버튼 → "노동요 신청" 폼(제목 선택, URL 필수)만 노출. 등록하면 강사 큐 하단에 즉시 추가되고 신청자 닉네임이 함께 표시됨. 소리는 나지 않음(안내 문구 표기).
- 큐는 세션 단위로 공유되며 5초 폴링으로 동기화. 강사의 현재 재생 상태(재생 중 곡 ID·진행 여부)는 로컬 상태로만 유지(다른 사용자에게 재생 상태는 노출하지 않음, 큐 목록만 공유).

## 데이터 모델 (신규 테이블 1개)

`public.dj_queue`
- `id uuid pk`
- `session_id uuid not null`
- `requester_id uuid not null` (app_users.id)
- `requester_nickname text not null`
- `requester_role text not null` ('participant' | 'instructor')
- `youtube_url text not null`
- `video_id text not null` (URL에서 추출한 11자리 ID)
- `title text not null default ''` (선택 입력)
- `played_at timestamptz` (재생 완료 시 기록 → 큐에서 숨김)
- `created_at timestamptz not null default now()`
- `order_index integer not null default 0` (강사가 순서 변경 시 사용, 기본은 created_at 순)

RLS는 기존 패턴대로 `Deny all client access` 정책 + 서버 함수(`createServerFn`)로만 접근. 데이터 초기화 시 함께 truncate 하도록 `resetSessionData`에 추가.

## 서버 함수 (`src/lib/dj.functions.ts`)

- `listDjQueue({ userId })` — 세션 큐 조회 (played_at IS NULL 우선, 최근 재생 완료 5건도 포함)
- `enqueueDjTrack({ userId, url, title? })` — URL 파싱·검증(youtube.com/watch, youtu.be, shorts 모두 지원), 큐 추가
- `removeDjTrack({ userId, trackId })` — 강사 또는 본인만 삭제
- `markDjTrackPlayed({ userId, trackId })` — 강사만 호출, played_at 기록 (다음 곡 자동 진행 시 사용)
- `reorderDjQueue({ userId, orderedIds })` — 강사 전용

## 프론트엔드

### 신규 컴포넌트

- `src/components/dj/DjWidget.tsx` — 역할 분기 컨테이너. 우측 하단 fixed, MessageCenter/MissionEntryButton과 겹치지 않도록 `bottom-4 right-4` 계열에 오프셋 배치(예: `right-[calc(1rem+56px)]` 또는 별도 스택).
- `src/components/dj/DjPlayerPanel.tsx` (강사) — YouTube IFrame Player API를 동적 로드해 숨김 iframe(1x1, `visibility:hidden`) 생성. 컨트롤: ▶ 재생 / ⏸ 일시정지 / ⏹ 정지 / ⏮ 이전 / ⏭ 다음 / 🔊 볼륨 슬라이더(기본 50) / "바로 실행" (선택 트랙). 곡 종료(state=0) 감지 시 `markDjTrackPlayed` 후 다음 곡 자동 재생. 큐 목록 표시(신청자 뱃지, 삭제 버튼).
- `src/components/dj/DjRequestPanel.tsx` (수강생) — URL·제목 입력 폼, 대기 중인 큐 목록(자기 신청 곡은 삭제 가능), "재생은 강사 화면에서 진행됩니다" 안내.

### 라이브러리 로딩

- YouTube IFrame API (`https://www.youtube.com/iframe_api`)를 클라이언트에서만 로드(`useEffect` 안에서 script 태그 주입, `window.onYouTubeIframeAPIReady` 처리). SSR 안전.
- 자동재생 정책: 강사 최초 재생은 사용자 클릭에서 시작하므로 무음 처리 불필요.

### 배치

- `src/routes/instructor.tsx`: `<DjWidget session={stored} />` 추가.
- `src/routes/home.tsx`(및 각 스테이지 라우트가 공용 홈만 쓴다면 홈에만): 수강생용 `<DjWidget session={session} />` 추가. — 다른 스테이지 라우트에서도 노출이 필요한지는 홈에만 두는 것으로 시작하고, 요청 시 확장.

## 기타

- URL 파싱 유틸(`extractYoutubeId`)은 `src/lib/dj-utils.ts`에 두어 서버·클라 공용 사용.
- 볼륨 기본 50, 로컬스토리지(`dj:volume`)에 사용자 조정값 저장.
- Toast로 신규 신청 알림(강사 화면): 기존 `MissionToastListener`와 동일한 폴링 패턴으로 새 트랙 감지 시 sonner 토스트.
- 데이터 초기화(`resetSessionData`)에 `dj_queue` DELETE 포함.

## 산출물 요약

- 마이그레이션 1건 (`dj_queue` + GRANT + RLS deny-all)
- 신규 서버 함수 파일 1개
- 신규 컴포넌트 3개 (Widget/PlayerPanel/RequestPanel) + 유틸 1개
- `instructor.tsx`, `home.tsx`, `session.functions.ts` 소규모 수정
