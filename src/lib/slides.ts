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
    title: "글쌤봇 따라하기",
    subtitle: "AI 도우미와 함께 5분 안에 첫 프롬프트를 완성합니다.",
  },
  {
    id: "s1-02-promise",
    kind: "bullets",
    kicker: "오늘의 약속",
    title: "세 가지만 지키면 오늘 실습은 성공입니다",
    bullets: [
      {
        title: "AI에게 맡기지 않고 내가 씁니다",
        caption: "프롬프트·테스트 케이스·리뷰 — 판단은 사람이 합니다.",
      },
      {
        title: "실패한 프롬프트를 버리지 않습니다",
        caption: "왜 안 됐는지가 다음 수업의 재료가 됩니다.",
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
    title: "왜 프롬프트를 손으로 써 보는가?",
    subtitle:
      "\"AI가 잘 못 알아듣는다\"는 감각은 직접 부딪혀 봐야 생깁니다. 실패한 프롬프트가 다음 수업 자료의 원료가 됩니다.",
    caption: "— 오늘의 관찰 지점",
  },
  {
    id: "s1-04-anatomy",
    kind: "stat",
    kicker: "좋은 프롬프트 해부",
    title: "세 조각으로 나눠 씁니다",
    stats: [
      {
        value: "상황",
        label: "누구에게, 언제 쓰는 답인가",
        caption: "예: 초5 학생이 수업 중에 질문했을 때",
      },
      {
        value: "형식",
        label: "몇 문장, 어떤 어투로",
        caption: "예: 3문장 이내, 존댓말, 이모지 없이",
      },
      {
        value: "예시",
        label: "정답에 가까운 샘플 한 개",
        caption: "예: '어제 배운 광합성 다시 알려줘' → …",
      },
    ],
  },
  {
    id: "s1-05-do-dont",
    kind: "compare",
    kicker: "실습 중 유의사항",
    title: "이렇게 쓰면 결과가 달라집니다",
    compare: {
      left: {
        label: "이렇게 하세요",
        items: [
          "역할과 대상 학년을 문장 첫머리에 명시",
          "'3문장 이내' 처럼 길이·형식을 숫자로 지시",
          "실제 학생이 쓸 법한 질문을 예시로 넣기",
        ],
      },
      right: {
        label: "피해 주세요",
        items: [
          "'잘, 자세히, 친절하게' 같은 두루뭉술한 지시",
          "한 프롬프트에 여러 작업을 한꺼번에 요구",
          "AI가 실패해도 다시 안 물어보고 지나가기",
        ],
      },
    },
  },
  {
    id: "s1-06-flow",
    kind: "steps",
    kicker: "따라하기 순서",
    title: "다섯 개의 초록불을 순서대로 켭니다",
    bullets: [
      {
        title: "첫 프롬프트로 실행 성공",
        caption: "안내된 예시 프롬프트를 그대로 붙여넣고 응답을 확인합니다.",
      },
      {
        title: "UI 커스터마이즈 1개 적용",
        caption: "색상·폰트·레이아웃 중 하나만 골라 내 취향으로 바꿔봅니다.",
      },
      {
        title: "응답 형식 지시 추가",
        caption: "'3문장으로', '이모지 없이' 같은 형식 규칙을 프롬프트에 넣습니다.",
      },
      {
        title: "내 교과 예시 1개 삽입",
        caption: "내가 담당하는 교과·학년의 실제 질문 한 문장을 예시로 넣습니다.",
      },
      {
        title: "미리보기 · 배포 링크 열기",
        caption: "완성된 화면을 새 창에서 열어 실제 학생 관점으로 확인합니다.",
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
