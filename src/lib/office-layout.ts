/**
 * 2D 사무실 좌석 배치도.
 * SVG viewBox 1200x900 기준. 각 자리는 책상+의자 그룹에 아바타가 얹혀지는 앵커.
 * 두 번째 첨부 이미지 배치 재현: 뒤쪽 긴 책상(8석) + T자 테이블(상단 4 + 좌 4 + 우 4).
 */

export type Seat = {
  id: string;
  /** 아바타 중심 좌표 (SVG px) */
  x: number;
  y: number;
  /** 책상 사각형 좌상단·크기 (같은 책상 위의 좌석들이 여러 개면 첫 좌석의 값만 그림에 사용) */
  desk?: { x: number; y: number; w: number; h: number };
  /** 아바타 위쪽 진행바가 향하는 방향 (책상에서 등 뒤 방향) */
  facing: "up" | "down" | "left" | "right";
  label: string;
};

/** 뒤쪽 긴 책상 8석 (한 줄) */
const backSeats: Seat[] = (() => {
  const y = 190;
  const startX = 110;
  const gap = 140;
  const desk = { x: 80, y: 130, w: 1040, h: 46 };
  return Array.from({ length: 8 }, (_, i) => ({
    id: `b${i + 1}`,
    x: startX + i * gap,
    y,
    desk: i === 0 ? desk : undefined,
    facing: "up" as const,
    label: `뒤 ${i + 1}`,
  }));
})();

/** T자 상단 가로 4석 */
const tTopSeats: Seat[] = (() => {
  const y = 320;
  const positions = [370, 500, 700, 830];
  const desk = { x: 330, y: 360, w: 540, h: 46 };
  return positions.map((x, i) => ({
    id: `tt${i + 1}`,
    x,
    y,
    desk: i === 0 ? desk : undefined,
    facing: "up" as const,
    label: `상 ${i + 1}`,
  }));
})();

/** T자 세로 좌측 4석 */
const tLeftSeats: Seat[] = (() => {
  const x = 480;
  const positions = [470, 620, 770, 920];
  const desk = { x: 520, y: 410, w: 46, h: 555 };
  return positions.map((y, i) => ({
    id: `tl${i + 1}`,
    x,
    y,
    desk: i === 0 ? desk : undefined,
    facing: "left" as const,
    label: `좌 ${i + 1}`,
  }));
})();

/** T자 세로 우측 4석 */
const tRightSeats: Seat[] = (() => {
  const x = 720;
  const positions = [470, 620, 770, 920];
  const desk = { x: 634, y: 410, w: 46, h: 555 };
  return positions.map((y, i) => ({
    id: `tr${i + 1}`,
    x,
    y,
    desk: i === 0 ? desk : undefined,
    facing: "right" as const,
    label: `우 ${i + 1}`,
  }));
})();

/** 사무실형 배치 (6·7기) */
export const OFFICE_SEATS: Seat[] = [
  ...backSeats,
  ...tTopSeats,
  ...tLeftSeats,
  ...tRightSeats,
];

/** 하위 호환 별칭 */
export const PARTICIPANT_SEATS: Seat[] = OFFICE_SEATS;

/** 교실형 5행 6열 = 30석. 1행이 강사석과 가장 가까운 앞줄. */
const COLUMN_X = [120, 300, 480, 660, 840, 1020];
const ROW_Y = [860, 700, 540, 380, 220]; // index 0 = 1행(앞줄)

export const CLASSROOM_SEATS: Seat[] = ROW_Y.flatMap((y, r) =>
  COLUMN_X.map((x, c) => ({
    id: `r${r + 1}c${c + 1}`,
    x,
    y,
    desk: { x: x - 65, y: y + 26, w: 130, h: 30 },
    facing: "down" as const,
    label: `${r + 1}행 ${c + 1}열`,
  })),
);

export type SeatLayout = "office" | "classroom";

export function getParticipantSeats(layout: SeatLayout | null | undefined): Seat[] {
  return layout === "classroom" ? CLASSROOM_SEATS : OFFICE_SEATS;
}

/** 교실형 좌석을 행 단위로 묶어 반환 (1행 → 5행) */
export function classroomRows(): Seat[][] {
  return ROW_Y.map((_, r) => CLASSROOM_SEATS.filter((s) => s.id.startsWith(`r${r + 1}c`)));
}

/** 강사석 (앞쪽 큰 모니터 아래) */
export const INSTRUCTOR_SEAT: Seat = {
  id: "instructor-desk",
  x: 600,
  y: 1030,
  desk: { x: 470, y: 1055, w: 260, h: 34 },
  facing: "up",
  label: "강사석",
};

/** 앞쪽 모니터 위치 (장식용) */
export const FRONT_MONITOR = { x: 470, y: 1075, w: 260, h: 18 };

export const OFFICE_VIEWBOX = { w: 1200, h: 1110 };

export function findSeat(id: string | null | undefined): Seat | null {
  if (!id) return null;
  if (id === INSTRUCTOR_SEAT.id) return INSTRUCTOR_SEAT;
  return (
    OFFICE_SEATS.find((s) => s.id === id) ??
    CLASSROOM_SEATS.find((s) => s.id === id) ??
    null
  );
}

