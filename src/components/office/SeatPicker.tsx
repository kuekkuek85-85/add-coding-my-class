import {
  getParticipantSeats,
  INSTRUCTOR_SEAT,
  FRONT_MONITOR,
  OFFICE_VIEWBOX,
  type SeatLayout,
} from "@/lib/office-layout";
import { OfficeBackdrop } from "./OfficeBackdrop";

/**
 * 로그인 마법사용 좌석 선택. 이미 점유된 좌석은 회색·닉네임 표시, 빈 자리는 클릭 가능한 주황색 원.
 */
export function SeatPicker({
  occupied,
  selected,
  onSelect,
  myNickname,
  layout = "office",
}: {
  occupied: Map<string, string>; // seatId -> nickname
  selected: string | null;
  onSelect: (seatId: string) => void;
  myNickname: string;
  layout?: SeatLayout;
}) {
  const seats = getParticipantSeats(layout);
  const classroom = layout === "classroom";
  return (
    <div className="w-full overflow-hidden rounded-2xl border-2 border-primary/20 bg-card shadow-sm">
      <svg
        viewBox={`0 0 ${OFFICE_VIEWBOX.w} ${OFFICE_VIEWBOX.h}`}
        className="h-auto w-full"
        role="img"
        aria-label="좌석 배치도"
      >
        <OfficeBackdrop variant={layout} />
        {/* Instructor desk / monitor label */}
        {!classroom && <>
        <rect
          x={FRONT_MONITOR.x}
          y={FRONT_MONITOR.y}
          width={FRONT_MONITOR.w}
          height={FRONT_MONITOR.h}
          rx="4"
          fill="#0f172a"
        />
        <text
          x={FRONT_MONITOR.x + FRONT_MONITOR.w / 2}
          y={FRONT_MONITOR.y + 14}
          fill="#e2e8f0"
          fontSize="12"
          textAnchor="middle"
        >
          모니터 (강사석)
        </text>
        </>}
        <SeatDot seat={INSTRUCTOR_SEAT} fill="#94a3b8" label="강사석" disabled />
        {seats.map((seat) => {
          const holder = occupied.get(seat.id);
          const mine = holder && holder === myNickname;
          const taken = !!holder && !mine;
          const isSelected = selected === seat.id;
          return (
            <SeatDot
              key={seat.id}
              seat={seat}
              fill={
                isSelected
                  ? "#2F6B4F"
                  : taken
                    ? "#cbd5e1"
                    : mine
                      ? "#FFC94A"
                      : "#FF6B57"
              }
              label={holder ?? ""}
              disabled={taken}
              onClick={() => !taken && onSelect(seat.id)}
              highlighted={isSelected}
            />
          );
        })}
      </svg>
      <div className="flex flex-wrap items-center gap-3 border-t border-border/60 bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-full bg-[#FF6B57]" /> 빈 자리
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-full bg-[#2F6B4F]" /> 내 선택
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-full bg-[#cbd5e1]" /> 사용 중
        </span>
      </div>
    </div>
  );
}

function SeatDot({
  seat,
  fill,
  label,
  onClick,
  disabled,
  highlighted,
}: {
  seat: { id: string; x: number; y: number };
  fill: string;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  highlighted?: boolean;
}) {
  return (
    <g
      transform={`translate(${seat.x}, ${seat.y})`}
      style={{ cursor: disabled ? "not-allowed" : "pointer" }}
      onClick={onClick}
    >
      <circle
        r={highlighted ? 28 : 24}
        fill={fill}
        stroke={highlighted ? "#1a1a1a" : "#00000033"}
        strokeWidth={highlighted ? 4 : 2}
      />
      {label && (
        <text
          y="46"
          fill="#111827"
          fontSize="13"
          fontWeight="600"
          textAnchor="middle"
        >
          {label.length > 6 ? `${label.slice(0, 6)}…` : label}
        </text>
      )}
    </g>
  );
}
