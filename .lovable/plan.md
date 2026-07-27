
## 목표
참가자가 강사에게 개인 메시지(건의/오류 제보)를 보내고, 강사는 개별 답장 또는 전체 공지(식사·발표 안내 등)를 발송한다. 새 메시지는 화면 우측 하단에 토스트형 팝업으로 실시간 노출된다.

## UX

### 참가자 화면
- 우측 하단 고정 플로팅 버튼(💬 아이콘 + 안읽은 수 배지).
- 클릭 시 대화창 패널 열림 — 강사와의 1:1 스레드 + 전체 공지 히스토리 표시.
- 입력창 하단, "강사에게 보내기" 버튼. 카테고리 선택(건의 / 오류 제보 / 질문 / 기타) 태그 하나.
- 새 메시지 도착 시 우측 하단 팝업 토스트 4~5초 노출(공지는 강조 색상).

### 강사 화면
- 강사 대시보드 상단 탭 또는 플로팅 버튼으로 "메시지함" 진입.
- 좌측: 참가자별 스레드 리스트(안읽음 배지, 최신 메시지 미리보기, 카테고리 아이콘).
- 우측: 선택된 스레드 대화창 + 답장 입력.
- 상단 별도 "전체 공지 보내기" 버튼 → 모달에서 공지 유형(식사/발표/일반) 선택 후 발송.
- 새 참가자 메시지 도착 시 우측 하단 팝업 토스트.

## 데이터 모델 (신규 마이그레이션)

`messages` 테이블
- `id`, `session_id`, `sender_id`(app_users.id), `sender_role`('participant'|'instructor')
- `recipient_id`(nullable — null이면 전체 공지)
- `kind`('direct' | 'broadcast')
- `category`('suggestion'|'bug'|'question'|'meal'|'presentation'|'general')
- `body` text
- `created_at`

`message_reads` 테이블
- `message_id`, `user_id`, `read_at` — 안읽음 계산용

RLS: 프로젝트 정책대로 클라이언트 직접접근 차단 + `deny_all`, 접근은 모두 서버 함수 경유.

## 서버 함수 (`src/lib/messages.functions.ts`)
- `sendMessage({ recipientId?, kind, category, body })` — 참가자는 강사에게만 direct, 강사는 direct/broadcast 모두 가능(권한 체크).
- `listMyThread()` — 참가자: 본인↔강사 direct + 세션 broadcast 시간순.
- `listInstructorInbox()` — 강사: 세션의 모든 스레드(참가자별 그룹) + broadcast.
- `listThreadWith(userId)` — 강사가 특정 참가자와의 스레드 조회.
- `markRead(messageIds[])`.
- `getUnreadCount()`.

## 실시간
`ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;` 후 클라이언트에서 `useEffect` 안에 채널 구독. 본인 관련(수신자 = 자신 or broadcast or 강사이면 세션 내 전체) 필터링 후 sonner 토스트 + 카운터 무효화.

## 컴포넌트
- `src/components/messages/MessageFab.tsx` — 참가자용 플로팅 버튼 + 시트.
- `src/components/messages/ParticipantChatPanel.tsx`.
- `src/components/messages/InstructorInbox.tsx` — 강사 대시보드에 탭으로 삽입.
- `src/components/messages/BroadcastComposer.tsx` — 공지 발송 모달.
- `src/components/messages/MessageToastListener.tsx` — 루트에서 realtime 구독, sonner로 우측 하단 팝업(공지는 강조 스타일).

## 배치
- 참가자 라우트 공통 레이아웃(홈, 각 스테이지, 갤러리, 포트폴리오)에서 `MessageFab` + `MessageToastListener` 렌더.
- 강사 대시보드에도 `MessageToastListener` + 인박스 진입 UI 추가.

## 범위 외
- 파일 첨부, 이모지 리액션, 참가자간 DM, 검색 필터 — 이번 범위 아님.
