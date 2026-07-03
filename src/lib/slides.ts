// S1(1교시) 강의 슬라이드 데크. 강사가 강의 모드로 전환하면 참가자 화면에
// 이 순서대로 슬라이드가 자동 노출된다.

export type SlideKind = "title" | "bullets" | "quote" | "steps" | "closing";

export type SlideDef = {
  id: string;
  kind: SlideKind;
  kicker?: string;
  title: string;
  subtitle?: string;
  bullets?: string[];
  caption?: string;
};

export const SLIDES: SlideDef[] = [
  {
    id: "s1-01-open",
    kind: "title",
    kicker: "S1 · 1교시",
    title: "글쌤봇 따라하기",
    subtitle: "내 수업에 코딩 한 스푼 · 심화반",
  },
  {
    id: "s1-02-goal",
    kind: "bullets",
    kicker: "오늘의 목표",
    title: "AI 도우미와 함께 5분 안에 첫 프롬프트 만들기",
    bullets: [
      "주어진 예시 프롬프트를 붙여넣고 결과 확인하기",
      "색상 · 폰트 · 레이아웃 중 하나를 내 취향으로 바꾸기",
      "응답 형식 지시(문장 수, 이모지 등)를 프롬프트에 추가하기",
    ],
  },
  {
    id: "s1-03-why",
    kind: "quote",
    title: "왜 프롬프트를 손으로 써 보는가?",
    subtitle:
      "\"AI가 잘 못 알아듣는다\"는 감각은 직접 부딪혀 봐야 생깁니다. 실패한 프롬프트가 다음 수업 자료의 원료가 됩니다.",
    caption: "— 오늘의 관찰 지점",
  },
  {
    id: "s1-04-flow",
    kind: "steps",
    kicker: "따라하기 순서",
    title: "다섯 개의 초록불을 순서대로 켭니다",
    bullets: [
      "첫 프롬프트로 실행 성공",
      "UI 커스터마이즈 1개 적용",
      "응답 형식 지시 추가",
      "내 교과 예시 1개 삽입",
      "미리보기/배포 링크 열기",
    ],
  },
  {
    id: "s1-05-memo",
    kind: "closing",
    kicker: "실습 중 잊지 마세요",
    title: "‘내 수업이라면?’ 30초 메모",
    subtitle:
      "떠오르는 아이디어는 오른쪽 상단 30초 메모에 남기세요. 3교시 PRD 작성 화면에서 자동으로 불러옵니다.",
  },
];
