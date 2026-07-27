# 도움 미션 게시판 (Help Missions)

막힌 학생의 상황을 AI가 미션 카드로 구조화 → 게시판에 공개 → 여러 동료가 참여 신청/해결 제출 → 의뢰자가 확인. 강사도 대시보드에서 모니터링.

## 사용자 흐름

**의뢰자 (막힌 학생 · 노랑/빨강 신호등에서)**
1. 신호등을 노랑/빨강으로 바꾸면 "동료에게 도움 미션으로 올리기" 모달이 자동 뜸 (건너뛰기 가능)
2. 상황을 자유롭게 서술 + 이미지 첨부(스크린샷) + 링크 붙여넣기
3. "AI로 정리" 클릭 → 제목 / 요약 / 재현 단계 / 필요 역량 태그가 자동 채워짐
4. 학생이 카드를 편집·확정 → 게시판 공개
5. 헬퍼가 "해결 제출"할 때마다 알림 토스트 → 확인 후 "채택" 또는 "아직" 표시. 채택하면 미션 종료.

**헬퍼 (도와줄 친구)**
1. `/missions` 게시판에서 대기중/진행중 미션 카드 열람
2. "참여 신청" → 진행중 헬퍼 목록에 본인 등록
3. 미션 상세에서 의뢰자와 대화 가능(간단 코멘트 스레드)
4. 해결책이 준비되면 "해결 제출"(텍스트 + 링크/이미지) → 의뢰자에게 알림
5. 여러 명이 동시에 참여·제출 가능

**교사**
- 대시보드에 "도움 미션" 섹션: 진행중 / 해결됨 / 미해결 카운트 + 최근 5건 미리보기
- 교사도 미션 등록 가능 (학생이 교사에게만 물어본 케이스를 학생 동의 후 게시판으로 승격)
- 미션 카드 클릭 시 상세 팝업

## UI 배치

- 신호등 컴포넌트: 노랑/빨강 선택 시 미션 등록 모달 자동 오픈 옵션
- 홈 화면: "도움 미션 게시판 열기" 진입 카드 + 신규 대기중 미션 배지
- `/missions` 신규 라우트: 대기중 · 진행중 · 해결됨 탭 + 카드 목록 + 상세 다이얼로그
- 강사 대시보드: 도움 요청(신호등) 아래 "도움 미션" 섹션
- 우측 하단 토스트: 새 미션 게시 / 참여 신청 / 해결 제출 / 채택 이벤트

## 데이터 모델 (마이그레이션)

- `help_missions`
  - session_id, requester_id, requester_role
  - title, summary, repro_steps, tags (jsonb 배열)
  - raw_description (원문), attachments (jsonb: [{type:'image'|'link', url, caption}])
  - status ('open' | 'in_progress' | 'resolved' | 'cancelled')
  - resolved_helper_id (nullable, 채택된 헬퍼)
  - created_at, updated_at, resolved_at
- `help_mission_helpers`
  - mission_id, helper_id
  - state ('joined' | 'submitted' | 'accepted')
  - submission_text, submission_attachments (jsonb)
  - joined_at, submitted_at
  - unique(mission_id, helper_id)
- `help_mission_comments` (간단 대화)
  - id, mission_id, author_id, author_role, body, created_at

전부 `deny_all` RLS + 서버 함수 경유(프로젝트 관례).

## 서버 함수 (`src/lib/missions.functions.ts`)

- `structureMissionDraft({ rawText, attachments })` — Lovable AI Gateway (`google/gemini-3.6-flash`) 호출, JSON으로 `{title, summary, reproSteps, tags[]}` 반환
- `createMission({ title, summary, reproSteps, tags, rawDescription, attachments })`
- `listMissions({ status? })` — 세션 스코프, 상태별 필터
- `getMission({ missionId })` — 상세 + 헬퍼 목록 + 코멘트
- `joinMission({ missionId })` — 헬퍼 참여
- `submitSolution({ missionId, text, attachments })` — 해결 제출, 의뢰자에게 알림 큐
- `acceptSolution({ missionId, helperId })` — 채택 → 미션 resolved
- `cancelMission({ missionId })` — 의뢰자만
- `addMissionComment({ missionId, body })`
- `getInstructorMissionsOverview({ userId })` — 강사용 카운트/최근 목록
- 이미지 첨부는 기존 `uploadMessageImage` 재사용

## 컴포넌트

- `src/components/missions/MissionComposer.tsx` — 원문 입력 + AI 정리 + 편집·확정
- `src/components/missions/MissionCard.tsx` — 리스트 카드 (상태 뱃지, 태그, 헬퍼 수)
- `src/components/missions/MissionDetailDialog.tsx` — 상세: 카드 본문·첨부·헬퍼 목록·제출물·코멘트·의뢰자 액션(채택)
- `src/components/missions/MissionBoard.tsx` — 탭 게시판 (`/missions` 라우트에서 사용)
- `src/components/missions/MissionToastListener.tsx` — 5초 폴링 + 토스트
- `src/components/missions/InstructorMissionsPanel.tsx` — 강사 대시보드 섹션
- `TrafficLight` 훅 확장: 노랑/빨강 전환 시 `MissionComposer` 모달 오픈 (건너뛰기 옵션)

## 라우트

- `src/routes/missions.tsx` — 참가자·강사 공용 게시판
- 홈/각 스테이지 헤더에 "🎯 도움 미션" 진입 링크
- `MissionToastListener`를 참가자 공용 레이아웃 + 강사 대시보드에 마운트

## 알림 규칙

- 헬퍼 참여 → 의뢰자에게 토스트
- 해결 제출 → 의뢰자에게 토스트 (강조)
- 채택 → 해당 헬퍼에게 토스트 + "고마워요" 배지
- 새 미션 등록 → 세션 전체(의뢰자 제외)에게 대기중 배지 카운트 갱신

## 범위 외

- 미션 검색/필터, 헬퍼 랭킹, 포인트/보상, 미션 재오픈 흐름은 이번 범위 아님 (필요 시 후속).
