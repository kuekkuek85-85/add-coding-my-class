// S1(1교시) 강의 슬라이드 데크. 강사가 강의 모드로 전환하면 참가자 화면에
// 이 순서대로 자동 노출된다.
//
// 콘텐츠 방향(3-D):
//   - 성인 학습자 대상, 밝고 차분한 톤. 이모지·유아어 금지.
//   - "AI가 대신 써주지 않는다"는 절대 원칙을 슬라이드 전면에 반복 노출.
//   - S1 다섯 개 체크포인트를 슬라이드로도 미리 훑어 참가자가 실습 중
//     길을 잃지 않게 한다.

export type SlideKind =
  | "title"
  | "bullets"
  | "quote"
  | "steps"
  | "compare"
  | "stat"
  | "closing";

export type SlideBullet = { title: string; caption?: string };

export type SlideDef = {
  id: string;
  kind: SlideKind;
  kicker?: string;
  title: string;
  subtitle?: string;
  /** bullets · steps · closing 에서 사용. 문자열 or {title, caption}. */
  bullets?: Array<string | SlideBullet>;
  /** compare 슬라이드에서 사용. 왼쪽/오른쪽 두 컬럼. */
  compare?: {
    left: { label: string; items: string[] };
    right: { label: string; items: string[] };
  };
  /** stat 슬라이드에서 사용. 최대 3개 카드. */
  stats?: Array<{ value: string; label: string; caption?: string }>;
  caption?: string;
};

export const SLIDES: SlideDef[] = [
  {
    id: "s1-01-open",
    kind: "title",
    kicker: "S1 · 1교시",
    title: "기본 기능 떠올리기",
    subtitle: "내 수업에서 AI가 대신 해주면 좋을 가장 작은 기능 하나를 골라봅니다.",
  },
  {
    id: "s1-02-promise",
    kind: "bullets",
    kicker: "오늘의 약속",
    title: "세 가지만 지키면 오늘 실습은 성공입니다",
    bullets: [
      {
        title: "AI에게 맡기지 않고 내가 씁니다",
        caption: "아이디어·테스트 케이스·리뷰 — 판단은 사람이 합니다.",
      },
      {
        title: "실패한 아이디어를 버리지 않습니다",
        caption: "왜 안 될지 미리 적어두면 다음 수업의 재료가 됩니다.",
      },
      {
        title: "옆 선생님과 신호등으로 이야기합니다",
        caption: "초록불·노란불·빨간불로 진행 상태를 서로 알립니다.",
      },
    ],
  },
  {
    id: "s1-03-why",
    kind: "quote",
    title: "왜 '기본 기능'부터 떠올리는가?",
    subtitle:
      "\"뭐든 다 해주는 도구\"는 결국 아무 데도 못 씁니다. 내 수업의 한 장면을 골라 그 안의 반복을 덜어주는 아주 작은 기능부터 상상해야 실제로 굴러갑니다.",
    caption: "— 오늘의 관찰 지점",
  },
  {
    id: "s1-04-anatomy",
    kind: "stat",
    kicker: "기본 기능 해부",
    title: "세 조각으로 기능을 정의합니다",
    stats: [
      {
        value: "문제",
        label: "무엇이 반복되고 힘든가",
        caption: "예: 매 수업 시작마다 지난 시간을 다시 설명해야 한다",
      },
      {
        value: "사용자",
        label: "누가·어떤 맥락에서 쓰는가",
        caption: "예: 초5 과학, 단원 도입 5분",
      },
      {
        value: "성공",
        label: "무엇이 되면 성공인가",
        caption: "예: 학생이 이전 시간 핵심 3가지를 말할 수 있다",
      },
    ],
  },
  {
    id: "s1-05-do-dont",
    kind: "compare",
    kicker: "기능 떠올리기 유의사항",
    title: "이렇게 잡으면 실제로 굴러갑니다",
    compare: {
      left: {
        label: "이렇게 하세요",
        items: [
          "이번 학기에 반복되는 장면 한 컷을 고른다",
          "가장 작은 단위의 기능 하나만 남긴다",
          "지금은 안 할 범위를 함께 적어둔다",
        ],
      },
      right: {
        label: "피해 주세요",
        items: [
          "'모든 걸 다 해주는 AI 튜터' 같은 큰 그림",
          "한 기능에 여러 목적(요약+평가+상담)을 얹기",
          "성공 판단 기준 없이 '좋아 보이면 OK'로 두기",
        ],
      },
    },
  },
  {
    id: "s1-06-flow",
    kind: "steps",
    kicker: "떠올리기 순서",
    title: "다섯 개의 초록불을 순서대로 켭니다",
    bullets: [
      {
        title: "내 수업의 반복 업무·문제 상황 1개 적기",
        caption: "매 수업마다 되풀이되는 장면 하나를 문장으로 씁니다.",
      },
      {
        title: "AI가 대신 해주면 좋을 핵심 기능 1개 떠올리기",
        caption: "그 문제를 해결할 가장 작은 단위의 기능 하나만 고릅니다.",
      },
      {
        title: "사용자·수업 맥락 구체화",
        caption: "어떤 학년·과목·시간에 쓰는지 한 줄로 좁힙니다.",
      },
      {
        title: "성공 판단 기준 1개 정하기",
        caption: "무엇을 보면 '됐다'고 판단할지 지표 하나를 정합니다.",
      },
      {
        title: "지금은 하지 않을 범위(제외) 1개 정하기",
        caption: "이번엔 손대지 않을 기능을 미리 적어 욕심을 줄입니다.",
      },
    ],
  },

  {
    id: "s1-07-signal",
    kind: "bullets",
    kicker: "도움이 필요할 때",
    title: "말 대신 신호등으로 알려주세요",
    bullets: [
      {
        title: "초록불 — 진행이 잘 되고 있어요",
        caption: "체크포인트를 하나 통과할 때마다 명찰에 초록 도장이 켜집니다.",
      },
      {
        title: "노란불 — 잠깐 막혔지만 아직 해볼 만해요",
        caption: "옆 짝꿍에게 먼저 물어보고, 안 되면 노란불을 켜세요.",
      },
      {
        title: "빨간불 — 강사 도움이 필요해요",
        caption: "강사석에서 빨간불이 뜨는 순서대로 찾아갑니다.",
      },
    ],
  },
  {
    id: "s1-08-memo",
    kind: "closing",
    kicker: "실습 중 잊지 마세요",
    title: "'내 수업이라면?' 30초 메모",
    subtitle:
      "떠오르는 아이디어는 화면 오른쪽 30초 메모에 남겨 두세요. 3교시 PRD 작성에서 그대로 불러옵니다.",
  },
  {
    id: "s1-09-next",
    kind: "closing",
    kicker: "다음 교시 예고",
    title: "2교시 · 확장 기능은 테스트부터",
    subtitle:
      "코드보다 테스트 케이스를 먼저 두 개 씁니다. AI는 여러분의 테스트를 대신 써주지 않습니다.",
  },
];
