// 강의 슬라이드 데크. 강사가 차시별 "강의 시작"을 누르면 참가자 화면에
// 해당 차시(=STAGE_DECKS 항목)의 슬라이드가 순서대로 노출된다.
//
// 콘텐츠 방향:
//   - 성인 학습자 대상, 밝고 차분한 톤. 이모지·유아어 금지.
//   - "AI가 대신 써주지 않는다"는 절대 원칙을 각 차시 도입에서 재확인.
//   - 각 차시에는 활동 안내(무엇을 하는지)와 용어 설명(왜 그렇게 부르는지)을
//     담아 참가자가 실습 중 길을 잃지 않게 한다.
//   - S2~S6는 5장 이내로 압축 (도입 → 활동 안내 → 용어/유의사항 → 마무리).

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

// ────────────────────────────────────────────────────────────────────
// S1 · 1교시 — 기본 기능 떠올리기
// ────────────────────────────────────────────────────────────────────
const S1: SlideDef[] = [
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
    title: "다섯 개의 도장을 순서대로 찍습니다",
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
        caption: "게이트를 하나 통과할 때마다 명찰에 초록 도장이 켜집니다.",
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

// ────────────────────────────────────────────────────────────────────
// S2 · 2교시 — 글쌤봇 확장 (테스트 케이스 먼저)
// ────────────────────────────────────────────────────────────────────
const S2: SlideDef[] = [
  {
    id: "s2-01-open",
    kind: "title",
    kicker: "S2 · 2교시",
    title: "확장 기능은 테스트부터",
    subtitle: "코드보다 먼저 '무엇을 보면 됐다고 할지' 두 문장을 적습니다.",
  },
  {
    id: "s2-02-terms",
    kind: "stat",
    kicker: "용어 정리",
    title: "오늘 쓰는 세 낱말",
    stats: [
      {
        value: "확장 기능",
        label: "기본 기능에 얹는 작은 한 걸음",
        caption: "예: 요약 결과에 '학생용 예시 1개'를 덧붙이기",
      },
      {
        value: "테스트 케이스",
        label: "입력·기대 출력의 짝",
        caption: "예: \"3줄 요약해줘\" → 3줄, 각 30자 이내",
      },
      {
        value: "합격 조건",
        label: "이 조건이면 통과라고 말할 수 있는 기준",
        caption: "숫자·개수·문장 형태처럼 눈으로 확인 가능한 것",
      },
    ],
  },
  {
    id: "s2-03-flow",
    kind: "steps",
    kicker: "활동 안내",
    title: "네 걸음으로 진행합니다",
    bullets: [
      {
        title: "내 아이디어에 얹을 확장 기능 1개 고르기",
        caption: "1교시 메모에서 가져와도 좋습니다.",
      },
      {
        title: "테스트 케이스 2개 작성",
        caption: "정상 케이스 1개 + 까다로운 케이스 1개.",
      },
      {
        title: "각 케이스의 합격 조건 명시",
        caption: "\"OK\"가 아니라 \"3줄·각 30자 이내\"처럼 셀 수 있게.",
      },
      {
        title: "제출 후 옆 짝꿍과 조건 한 줄씩 서로 읽기",
        caption: "말이 안 되면 그 자리에서 다듬습니다.",
      },
    ],
  },
  {
    id: "s2-04-do-dont",
    kind: "compare",
    kicker: "테스트 케이스 유의사항",
    title: "이렇게 적으면 나중에 검증이 됩니다",
    compare: {
      left: {
        label: "이렇게 하세요",
        items: [
          "입력과 기대 출력을 짝으로 쓴다",
          "숫자·개수·형식으로 합격 조건을 적는다",
          "실패할 것 같은 케이스를 일부러 하나 넣는다",
        ],
      },
      right: {
        label: "피해 주세요",
        items: [
          "\"잘 되면 OK\" 같은 두루뭉술한 기준",
          "AI에게 테스트 케이스 자체를 대신 쓰게 하기",
          "정상 케이스만 3개 몰아쓰기",
        ],
      },
    },
  },
  {
    id: "s2-05-next",
    kind: "closing",
    kicker: "다음 교시 예고",
    title: "3교시 · PRD 작성과 동료 리뷰",
    subtitle:
      "오늘 정의한 기능·테스트를 문서 한 장(PRD)으로 정리하고, 옆 선생님이 '좋은 점'부터 짚어 줍니다.",
  },
];

// ────────────────────────────────────────────────────────────────────
// S3 · 3교시 — PRD 작성·검증 (동료 리뷰)
// ────────────────────────────────────────────────────────────────────
const S3: SlideDef[] = [
  {
    id: "s3-01-open",
    kind: "title",
    kicker: "S3 · 3교시",
    title: "PRD로 생각을 굳힙니다",
    subtitle: "머릿속 아이디어를 한 장짜리 문서로 바꾸고, 옆 선생님이 읽어 봅니다.",
  },
  {
    id: "s3-02-terms",
    kind: "stat",
    kicker: "용어 정리",
    title: "PRD가 뭐길래?",
    stats: [
      {
        value: "PRD",
        label: "무엇을 왜 만드는지 적은 한 장 문서",
        caption: "Product Requirements Document — '요구 정리서'로 이해하면 충분합니다.",
      },
      {
        value: "체인 리뷰",
        label: "정해진 순서대로 옆 선생님 것을 리뷰",
        caption: "1→2→3→…→1. 누구 것을 볼지 헤매지 않습니다.",
      },
      {
        value: "Grill Me",
        label: "PRD를 향한 날카로운 질문 도우미",
        caption: "질문만 던집니다. 답은 대신 써주지 않습니다.",
      },
    ],
  },
  {
    id: "s3-03-flow",
    kind: "steps",
    kicker: "활동 안내",
    title: "세 걸음 · 두 번의 제출",
    bullets: [
      {
        title: "1차 PRD 초안 제출",
        caption: "문제·사용자·핵심 기능·성공 기준·제외 범위 다섯 칸을 채웁니다.",
      },
      {
        title: "체인 순서대로 동료 리뷰",
        caption: "'좋은 점' 필수 → '고칠 점' → '한 가지 질문' 순으로 짧게.",
      },
      {
        title: "2차 PRD 확정 제출",
        caption: "받은 리뷰를 참고해 스스로 고쳐서 다시 제출합니다.",
      },
    ],
  },
  {
    id: "s3-04-review",
    kind: "compare",
    kicker: "동료 리뷰 규칙",
    title: "'좋은 점'부터 반드시 씁니다",
    compare: {
      left: {
        label: "이렇게 하세요",
        items: [
          "좋은 점 한 줄을 먼저 구체적으로 쓴다",
          "고칠 점은 '무엇을·왜' 두 가지를 함께",
          "질문 하나로 마무리해 상대가 생각하게 한다",
        ],
      },
      right: {
        label: "피해 주세요",
        items: [
          "좋은 점을 비워두고 제출 (제출 불가)",
          "\"별로예요\"처럼 근거 없는 코멘트",
          "리뷰 대신 상대의 PRD를 고쳐서 돌려주기",
        ],
      },
    },
  },
  {
    id: "s3-05-next",
    kind: "closing",
    kicker: "다음 교시 예고",
    title: "4교시 · TDD로 첫 프롬프트를 조립",
    subtitle:
      "확정된 PRD를 근거로 테스트 케이스 3개 이상을 먼저 쓰고, 그 뒤에 프롬프트 초안을 만듭니다.",
  },
];

// ────────────────────────────────────────────────────────────────────
// S4 · 4교시 — TDD + 첫 프롬프트
// ────────────────────────────────────────────────────────────────────
const S4: SlideDef[] = [
  {
    id: "s4-01-open",
    kind: "title",
    kicker: "S4 · 4교시",
    title: "테스트가 먼저, 프롬프트는 그다음",
    subtitle: "합격 조건을 먼저 못 박고, 그 조건을 통과할 프롬프트를 조립합니다.",
  },
  {
    id: "s4-02-terms",
    kind: "stat",
    kicker: "용어 정리",
    title: "TDD, 어렵게 부르지 않기",
    stats: [
      {
        value: "TDD",
        label: "테스트를 먼저 쓰고 그다음 만드는 방식",
        caption: "Test-Driven Development. 오늘은 '조건 먼저'로 이해합니다.",
      },
      {
        value: "프롬프트",
        label: "AI에게 주는 지시문",
        caption: "역할·맥락·규칙·출력 형태를 한 덩어리로.",
      },
      {
        value: "합격 프롬프트",
        label: "내 테스트 3개를 모두 통과한 프롬프트",
        caption: "통과할 때까지 프롬프트를 고칩니다. 테스트는 건드리지 않습니다.",
      },
    ],
  },
  {
    id: "s4-03-flow",
    kind: "steps",
    kicker: "활동 안내",
    title: "세 걸음으로 진행합니다",
    bullets: [
      {
        title: "테스트 케이스 3개 이상 작성",
        caption: "정상 2개 + 까다로운 것 1개를 권장합니다.",
      },
      {
        title: "첫 프롬프트 초안 작성",
        caption: "역할·맥락·규칙·출력 형태 네 조각을 먼저 채웁니다.",
      },
      {
        title: "직접 돌려보고 통과 여부를 표시",
        caption: "실패하면 프롬프트를 고칩니다 — 테스트는 그대로 둡니다.",
      },
    ],
  },
  {
    id: "s4-04-do-dont",
    kind: "compare",
    kicker: "유의사항",
    title: "AI가 대신 써주지 않는 것들",
    compare: {
      left: {
        label: "AI에게 부탁 OK",
        items: [
          "이 프롬프트를 어떻게 개선할지 '아이디어'만 묻기",
          "특정 표현이 왜 안 통했는지 이유 묻기",
          "출력 형식 예시를 몇 개 보여달라고 하기",
        ],
      },
      right: {
        label: "AI에게 시키면 안 되는 것",
        items: [
          "테스트 케이스 자체를 대신 쓰게 하기",
          "합격 조건을 AI에게 판단시키기",
          "실패한 결과에 맞춰 테스트를 낮춰 잡기",
        ],
      },
    },
  },
  {
    id: "s4-05-next",
    kind: "closing",
    kicker: "다음 교시 예고",
    title: "5교시 · 배포 URL 제출과 교차 QA",
    subtitle:
      "확정 프롬프트로 만든 결과물을 배포해 URL을 제출하고, 옆 선생님과 교차로 실행 체크리스트를 돌립니다.",
  },
];

// ────────────────────────────────────────────────────────────────────
// S5 · 5교시 — 배포 URL 제출 · 교차 QA
// ────────────────────────────────────────────────────────────────────
const S5: SlideDef[] = [
  {
    id: "s5-01-open",
    kind: "title",
    kicker: "S5 · 5교시",
    title: "배포하고, 서로 눌러 봅니다",
    subtitle: "결과물의 URL을 제출하고, 옆 선생님과 실행 체크리스트를 교차로 돌립니다.",
  },
  {
    id: "s5-02-terms",
    kind: "stat",
    kicker: "용어 정리",
    title: "오늘 다루는 세 낱말",
    stats: [
      {
        value: "배포 URL",
        label: "누구나 열어 볼 수 있는 결과물 링크",
        caption: "S5 상단에 붙여 넣어 제출합니다.",
      },
      {
        value: "실행 체크리스트",
        label: "링크로 열어 하나씩 눌러 확인할 항목",
        caption: "PRD의 핵심 기능이 실제로 되는지 눈으로 검증합니다.",
      },
      {
        value: "교차 QA",
        label: "체인 순서대로 상대 결과물을 검증",
        caption: "상대의 URL + 체크리스트로 리뷰합니다.",
      },
    ],
  },
  {
    id: "s5-03-flow",
    kind: "steps",
    kicker: "활동 안내",
    title: "세 걸음으로 진행합니다",
    bullets: [
      {
        title: "결과물을 배포하고 URL을 제출",
        caption: "S5 화면 상단 카드에 링크를 붙여 넣어 저장합니다.",
      },
      {
        title: "내 실행 체크리스트 통과 여부 표시",
        caption: "안 되면 이유를 한 줄로 남겨 다음 개선에 씁니다.",
      },
      {
        title: "지정된 상대의 URL·체크리스트로 교차 QA",
        caption: "'좋은 점' 먼저 · 개선 제안 하나 · 질문 하나 순으로.",
      },
    ],
  },
  {
    id: "s5-04-do-dont",
    kind: "compare",
    kicker: "교차 QA 유의사항",
    title: "리뷰의 목적은 지적이 아니라 개선입니다",
    compare: {
      left: {
        label: "이렇게 하세요",
        items: [
          "링크를 실제로 열어 보고 눌러 확인한다",
          "좋은 점을 먼저, 근거와 함께 쓴다",
          "개선 제안은 '무엇을·왜' 두 가지를 함께",
        ],
      },
      right: {
        label: "피해 주세요",
        items: [
          "링크를 안 열고 UI 스샷만 보고 판단",
          "\"별로예요\"처럼 근거 없는 코멘트",
          "상대 결과물을 대신 고쳐서 돌려주기",
        ],
      },
    },
  },
  {
    id: "s5-05-next",
    kind: "closing",
    kicker: "다음 교시 예고",
    title: "6교시 · 갤러리 발표",
    subtitle:
      "확정 슬라이드의 첫 페이지에 배포 URL이 하이퍼링크로 노출됩니다. 3분씩 순서대로 발표합니다.",
  },
];

// ────────────────────────────────────────────────────────────────────
// S6 · 6교시 — 갤러리 발표
// ────────────────────────────────────────────────────────────────────
const S6: SlideDef[] = [
  {
    id: "s6-01-open",
    kind: "title",
    kicker: "S6 · 6교시",
    title: "학예회처럼, 3분씩",
    subtitle: "확정 슬라이드와 배포 URL로 내 수업의 한 장면을 나눕니다.",
  },
  {
    id: "s6-02-terms",
    kind: "stat",
    kicker: "용어 정리",
    title: "발표 무대의 세 요소",
    stats: [
      {
        value: "확정 슬라이드",
        label: "발표자가 편집·확정한 초안",
        caption: "AI가 만든 초안은 교사가 반드시 다듬은 뒤 확정합니다.",
      },
      {
        value: "배포 URL",
        label: "표지 슬라이드의 하이퍼링크",
        caption: "관객이 실제 결과물을 바로 열어볼 수 있습니다.",
      },
      {
        value: "발표 코멘트",
        label: "관객이 발표자에게 남기는 짧은 응원·질문",
        caption: "발표 진행 중 실시간으로 발표자 화면에 뜹니다.",
      },
    ],
  },
  {
    id: "s6-03-flow",
    kind: "steps",
    kicker: "활동 안내",
    title: "발표는 이렇게 진행됩니다",
    bullets: [
      {
        title: "강사가 큐에서 발표자를 지정",
        caption: "강사 화면에 슬라이드가 전체화면으로 뜹니다.",
      },
      {
        title: "발표자는 3분 안에 핵심만",
        caption: "무엇을·왜·어떻게 되는지 한 장면씩 짚습니다.",
      },
      {
        title: "관객은 코멘트로 응원과 질문",
        caption: "'좋은 점' 한 줄 + 질문 하나면 충분합니다.",
      },
    ],
  },
  {
    id: "s6-04-do-dont",
    kind: "compare",
    kicker: "발표 유의사항",
    title: "짧게, 구체적으로, 서로에게 도움되게",
    compare: {
      left: {
        label: "이렇게 하세요",
        items: [
          "표지에서 배포 URL을 소개하고 시작",
          "핵심 기능이 실제로 되는 장면 1개 시연",
          "다음 수업에 시도해 볼 한 문장으로 마무리",
        ],
      },
      right: {
        label: "피해 주세요",
        items: [
          "슬라이드 전문을 그대로 읽기",
          "기술 자랑 위주 — 수업 맥락 없이 기능만 나열",
          "코멘트에 '별로예요'처럼 근거 없는 말 남기기",
        ],
      },

    },
  },
  {
    id: "s6-05-close",
    kind: "closing",
    kicker: "마무리",
    title: "오늘의 한 스푼을 내일 수업으로",
    subtitle:
      "발표가 끝난 뒤 회고 카드에서 '가장 쓸모 있었던 것 하나 · 내일 시도할 것 하나'를 남겨 주세요.",
  },
];

export type StageDeck = {
  no: number;
  code: string;
  title: string;
  /** SLIDES 배열 내 시작 인덱스 */
  offset: number;
  /** 이 차시의 슬라이드 개수 */
  count: number;
};

const RAW_DECKS: Array<{ no: number; code: string; title: string; slides: SlideDef[] }> = [
  { no: 1, code: "S1", title: "기본 기능 떠올리기", slides: S1 },
  { no: 2, code: "S2", title: "글쌤봇 확장", slides: S2 },
  { no: 3, code: "S3", title: "PRD 작성·검증", slides: S3 },
  { no: 4, code: "S4", title: "TDD + 구현", slides: S4 },
  { no: 5, code: "S5", title: "교차 QA + 개선", slides: S5 },
  { no: 6, code: "S6", title: "갤러리 발표", slides: S6 },
];

// 모든 슬라이드를 하나의 배열로 이어붙여 DB의 current_slide_index(단일 정수)와
// 호환되게 유지한다. 각 차시의 시작 위치는 STAGE_DECKS.offset 참조.
export const SLIDES: SlideDef[] = RAW_DECKS.flatMap((d) => d.slides);

export const STAGE_DECKS: StageDeck[] = (() => {
  let cursor = 0;
  return RAW_DECKS.map((d) => {
    const deck: StageDeck = {
      no: d.no,
      code: d.code,
      title: d.title,
      offset: cursor,
      count: d.slides.length,
    };
    cursor += d.slides.length;
    return deck;
  });
})();

/** 절대 slideIndex → 해당 스테이지 데크 반환 */
export function getDeckForIndex(slideIndex: number): StageDeck {
  for (let i = STAGE_DECKS.length - 1; i >= 0; i -= 1) {
    if (slideIndex >= STAGE_DECKS[i].offset) return STAGE_DECKS[i];
  }
  return STAGE_DECKS[0];
}
