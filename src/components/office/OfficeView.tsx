import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Mic, AlertTriangle } from "lucide-react";

import { getSessionSnapshot } from "@/lib/session.functions";
import { getInstructorS1Summary } from "@/lib/s1.functions";
import { getInstructorS2Summary } from "@/lib/s2.functions";
import { getSessionS3Overview } from "@/lib/s3.functions";
import { getSessionS4Overview } from "@/lib/s4.functions";
import { getSessionS5Overview } from "@/lib/s5.functions";
import { getSessionS6Overview } from "@/lib/s6.functions";
import { listSessionHelpSignals } from "@/lib/help.functions";
import { getSessionRetrospectives } from "@/lib/s7.functions";
import {
  PARTICIPANT_SEATS,
  INSTRUCTOR_SEAT,
  FRONT_MONITOR,
  OFFICE_VIEWBOX,
  findSeat,
} from "@/lib/office-layout";
import { DEFAULT_AVATAR, type Avatar } from "@/lib/avatar-presets";
import { AvatarSvg } from "@/components/avatar/AvatarSvg";
import { OfficeBackdrop } from "./OfficeBackdrop";
import { ParticipantDetailDialog } from "@/components/school/ParticipantDetailDialog";

const STAGE_COLORS: Record<number, string> = {
  1: "#FFC94A",
  2: "#FF6B57",
  3: "#a855f7",
  4: "#3b82f6",
  5: "#10b981",
  6: "#e11d48",
};

const STAGE_LABELS: Record<number, string> = {
  1: "1교시",
  2: "2교시",
  3: "3교시",
  4: "4교시",
  5: "5교시",
  6: "6교시",
};

type Member = {
  id: string;
  nickname: string;
  role: string;
  seat_id: string | null;
  avatar: Avatar | null;
};

export function OfficeView({ instructorUserId }: { instructorUserId: string }) {
  const fetchSnap = useServerFn(getSessionSnapshot);
  const fetchS1 = useServerFn(getInstructorS1Summary);
  const fetchS2 = useServerFn(getInstructorS2Summary);
  const fetchS3 = useServerFn(getSessionS3Overview);
  const fetchS4 = useServerFn(getSessionS4Overview);
  const fetchS5 = useServerFn(getSessionS5Overview);
  const fetchS6 = useServerFn(getSessionS6Overview);
  const fetchHelp = useServerFn(listSessionHelpSignals);
  const fetchRetro = useServerFn(getSessionRetrospectives);

  const enabled = !!instructorUserId;
  const common = { enabled, refetchInterval: 5_000 } as const;
  const { data: snap } = useQuery({
    queryKey: ["office-snap", instructorUserId],
    queryFn: () => fetchSnap({ data: { userId: instructorUserId } }),
    ...common,
  });
  const { data: s1 } = useQuery({
    queryKey: ["office-s1", instructorUserId],
    queryFn: () => fetchS1({ data: { userId: instructorUserId } }),
    ...common,
  });
  const { data: s2 } = useQuery({
    queryKey: ["office-s2", instructorUserId],
    queryFn: () => fetchS2({ data: { userId: instructorUserId } }),
    ...common,
  });
  const { data: s3 } = useQuery({
    queryKey: ["office-s3", instructorUserId],
    queryFn: () => fetchS3({ data: { userId: instructorUserId } }),
    ...common,
  });
  const { data: s4 } = useQuery({
    queryKey: ["office-s4", instructorUserId],
    queryFn: () => fetchS4({ data: { userId: instructorUserId } }),
    ...common,
  });
  const { data: s5 } = useQuery({
    queryKey: ["office-s5", instructorUserId],
    queryFn: () => fetchS5({ data: { userId: instructorUserId } }),
    ...common,
  });
  const { data: s6 } = useQuery({
    queryKey: ["office-s6", instructorUserId],
    queryFn: () => fetchS6({ data: { userId: instructorUserId } }),
    ...common,
  });
  const { data: help } = useQuery({
    queryKey: ["office-help", instructorUserId],
    queryFn: () => fetchHelp({ data: { userId: instructorUserId } }),
    ...common,
  });
  const { data: retro } = useQuery({
    queryKey: ["office-retro", instructorUserId],
    queryFn: () => fetchRetro({ data: { userId: instructorUserId } }),
    ...common,
  });

  const [detail, setDetail] = useState<{ userId: string; nickname: string; stageNo: number } | null>(null);

  const members: Member[] = (snap?.ok ? snap.members : []) as Member[];
  const participants = members.filter((m) => m.role === "participant");
  const instructor = members.find((m) => m.role === "instructor");
  const currentStage = snap?.ok ? snap.session.current_stage : 1;

  const s1Map = new Map((s1?.ok ? s1.progress : []).map((p) => [p.userId, p]));
  const s2Map = new Map((s2?.ok ? s2.progress : []).map((p) => [p.userId, p]));
  const s3Map = new Map((s3?.ok ? s3.progress : []).map((p) => [p.userId, p]));
  const s4Map = new Map((s4?.ok ? s4.progress : []).map((p) => [p.userId, p]));
  const s5Map = new Map((s5?.ok ? s5.progress : []).map((p) => [p.userId, p]));
  const s6Map = new Map((s6?.ok ? s6.progress : []).map((p) => [p.userId, p]));
  const helpMap = new Map((help?.ok ? help.signals : []).map((h) => [h.userId, h]));
  const retroMap = new Map((retro?.ok ? retro.entries : []).map((r) => [r.userId, r]));

  function stageDoneFlags(userId: string): boolean[] {
    const s1p = s1Map.get(userId);
    const s2p = s2Map.get(userId);
    const s3p = s3Map.get(userId);
    const s4p = s4Map.get(userId);
    const s5p = s5Map.get(userId);
    const s6p = s6Map.get(userId);
    const s1Total = s1p?.total ?? 0;
    return [
      !!(s1Total > 0 && (s1p?.checked ?? 0) >= s1Total),
      !!(s2p?.passed || (s2p?.cases ?? 0) > 0),
      !!(s3p?.v2 || s3p?.v1),
      !!s4p?.confirmed,
      !!(s5p?.confirmed || (s5p?.checkedCases ?? 0) > 0),
      s6p?.queueState === "done",
    ];
  }

  const seated = participants.filter((p) => p.seat_id && findSeat(p.seat_id));
  const unseated = participants.filter((p) => !p.seat_id || !findSeat(p.seat_id));

  const currentPresenter =
    (s6?.ok ? s6.progress : []).find((p) => p.queueState === "current")?.userId ?? null;

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border-2 border-primary/15 bg-card p-2 shadow-sm">
        <svg
          viewBox={`0 0 ${OFFICE_VIEWBOX.w} ${OFFICE_VIEWBOX.h}`}
          className="h-auto w-full"
          role="img"
          aria-label="2D 사무실 대시보드"
        >
          <defs>
            <filter id="deskShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="2" dy="3" stdDeviation="2" floodColor="#000000" floodOpacity="0.25" />
            </filter>
          </defs>
          <OfficeBackdrop />
          {/* Desks and chairs (draw once per group) */}
          {[...PARTICIPANT_SEATS, INSTRUCTOR_SEAT].map((s) =>
            s.desk ? (
              <g key={s.id + "-deskgroup"}>
                {/* Desk top */}
                <rect
                  x={s.desk.x}
                  y={s.desk.y}
                  width={s.desk.w}
                  height={s.desk.h}
                  rx="6"
                  fill="#6d4c32"
                  stroke="#3f2712"
                  strokeWidth="3"
                  filter="url(#deskShadow)"
                />
                {/* Desk surface highlight */}
                <rect
                  x={s.desk.x + 4}
                  y={s.desk.y + 4}
                  width={s.desk.w - 8}
                  height={s.desk.h - 8}
                  rx="4"
                  fill="none"
                  stroke="#8b5e3c"
                  strokeWidth="2"
                  opacity="0.6"
                />
                {/* Chair */}
                <Chair seat={s} />
              </g>
            ) : null,
          )}
          {/* Front monitor */}
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
            모니터
          </text>

          {/* Instructor */}
          {instructor && (
            <SeatedAvatarNode
              seat={INSTRUCTOR_SEAT}
              avatar={instructor.avatar ?? DEFAULT_AVATAR}
              nickname={instructor.nickname}
              flags={[false, false, false, false, false, false]}
              currentStage={currentStage}
              helpLevel={"green"}
              isInstructor
              status={null}
            />
          )}

          {/* Seated participants */}
          {seated.map((p) => {
            const seat = findSeat(p.seat_id)!;
            const flags = stageDoneFlags(p.id);
            const h = helpMap.get(p.id);
            const r = retroMap.get(p.id);
            const s6Done = flags[5];
            const retroDone = !!r?.submittedAt;
            const status: "presenting" | "graduated" | "retro" | null =
              currentPresenter === p.id
                ? "presenting"
                : retroDone
                  ? "graduated"
                  : s6Done
                    ? "retro"
                    : null;
            return (
              <SeatedAvatarNode
                key={p.id}
                seat={seat}
                avatar={p.avatar ?? DEFAULT_AVATAR}
                nickname={p.nickname}
                flags={flags}
                currentStage={currentStage}
                helpLevel={h?.level ?? "green"}
                status={status}
                onClick={() =>
                  setDetail({ userId: p.id, nickname: p.nickname, stageNo: currentStage })
                }
              />
            );
          })}
        </svg>
      </div>

      {/* Unseated stragglers */}
      {unseated.length > 0 && (
        <div className="rounded-xl border border-dashed border-border/70 bg-muted/30 p-3">
          <p className="mb-2 text-xs font-semibold text-muted-foreground">
            아직 자리를 고르지 않은 참가자 ({unseated.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {unseated.map((p) => (
              <button
                key={p.id}
                onClick={() =>
                  setDetail({ userId: p.id, nickname: p.nickname, stageNo: currentStage })
                }
                className="flex items-center gap-2 rounded-full border bg-card px-2 py-1 text-xs hover:bg-accent/30"
              >
                <AvatarSvg avatar={p.avatar ?? DEFAULT_AVATAR} size={24} />
                {p.nickname}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="rounded-xl border border-border/70 bg-card p-3 text-xs">
        <div className="mb-2 font-semibold text-foreground">교시 색상</div>
        <div className="flex flex-wrap gap-3">
          {Object.entries(STAGE_LABELS).map(([no, label]) => (
            <span key={no} className="flex items-center gap-1.5">
              <span
                className="inline-block h-3 w-3 rounded-full"
                style={{ background: STAGE_COLORS[Number(no)] }}
              />
              {label}
            </span>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-3 text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-sm bg-[#2F6B4F]" /> 통과 도장
          </span>
          <span className="flex items-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5 text-rose-500" /> 도움 요청
          </span>
          <span className="flex items-center gap-1">
            <Mic className="h-3.5 w-3.5 text-rose-500" /> 발표
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-sm bg-amber-500" /> 회고 작성 중
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-sm bg-[#2F6B4F]" /> 수료 완료
          </span>
        </div>
      </div>

      <ParticipantDetailDialog
        open={detail !== null}
        onOpenChange={(v) => {
          if (!v) setDetail(null);
        }}
        instructorUserId={instructorUserId}
        targetUserId={detail?.userId ?? null}
        targetNickname={detail?.nickname ?? ""}
        stageNo={detail?.stageNo ?? null}
      />
    </div>
  );
}

function SeatedAvatarNode({
  seat,
  avatar,
  nickname,
  flags,
  currentStage,
  helpLevel,
  status,
  isInstructor,
  onClick,
}: {
  seat: { id: string; x: number; y: number };
  avatar: Avatar;
  nickname: string;
  flags: boolean[];
  currentStage: number;
  helpLevel: "green" | "yellow" | "red";
  status: "presenting" | "retro" | "graduated" | null;
  isInstructor?: boolean;
  onClick?: () => void;
}) {
  const ring = isInstructor ? "#0f172a" : STAGE_COLORS[currentStage] ?? "#94a3b8";
  const barY = -60;
  const barX = -42;
  const barW = 84;
  const barH = 10;
  const cellW = barW / 6;
  // 시드 기반 지연·속도 (좌석마다 다르게 흔들리도록)
  let seed = 0;
  for (let i = 0; i < seat.id.length; i++) seed = (seed * 31 + seat.id.charCodeAt(i)) >>> 0;
  const delay = ((seed % 1000) / 1000) * 2.4; // 0 ~ 2.4s
  const duration = 3 + ((seed >> 3) % 200) / 100; // 3.0 ~ 5.0s
  return (
    <g
      transform={`translate(${seat.x}, ${seat.y})`}
      style={{ cursor: onClick ? "pointer" : "default" }}
      onClick={onClick}
    >
      {/* Nametag */}
      <rect x="-42" y="30" width="84" height="18" rx="4" fill="#ffffff" stroke="#00000033" />
      <text x="0" y="43" textAnchor="middle" fontSize="12" fontWeight="700" fill="#111827">
        {isInstructor ? `강사 ${nickname}` : nickname}
      </text>

      {/* Progress bar (6 cells) */}
      {!isInstructor && (
        <g>
          <rect x={barX} y={barY} width={barW} height={barH} rx="2" fill="#e2e8f0" />
          {flags.map((done, i) => (
            <rect
              key={i}
              x={barX + i * cellW}
              y={barY}
              width={cellW - 1}
              height={barH}
              fill={
                done
                  ? "#2F6B4F"
                  : i + 1 === currentStage
                    ? STAGE_COLORS[currentStage]
                    : "transparent"
              }
              opacity={i + 1 === currentStage && !done ? 0.8 : 1}
            />
          ))}
          <rect
            x={barX}
            y={barY}
            width={barW}
            height={barH}
            rx="2"
            fill="none"
            stroke="#00000044"
          />
          <text x="0" y={barY - 3} textAnchor="middle" fontSize="9" fill="#111827">
            {STAGE_LABELS[currentStage] ?? ""}
          </text>
        </g>
      )}

      {/* Avatar with ring — 살랑 애니메이션 */}
      <g
        className="avatar-bob"
        style={{ animationDelay: `-${delay}s`, animationDuration: `${duration}s` }}
      >
        <circle cx="0" cy="0" r="26" fill="#ffffff" stroke={ring} strokeWidth="4" />
        <g transform="translate(-24, -24)">
          <AvatarSvg avatar={avatar} size={48} />
        </g>
      </g>


      {/* Status badge (top-right) */}
      {helpLevel === "red" && (
        <g transform="translate(24, -22)">
          <circle r="10" fill="#e11d48">
            <animate attributeName="r" values="10;12;10" dur="1.2s" repeatCount="indefinite" />
          </circle>
          <text y="4" textAnchor="middle" fontSize="12" fill="#fff" fontWeight="800">
            !
          </text>
        </g>
      )}
      {helpLevel === "yellow" && (
        <g transform="translate(24, -22)">
          <circle r="9" fill="#f59e0b" />
          <text y="4" textAnchor="middle" fontSize="12" fill="#fff" fontWeight="800">
            ?
          </text>
        </g>
      )}
      {status === "presenting" && (
        <g transform="translate(-26, -22)">
          <rect x="-20" y="-10" width="40" height="20" rx="10" fill="#e11d48" />
          <text y="4" textAnchor="middle" fontSize="10" fill="#fff" fontWeight="800">
            발표
          </text>
        </g>
      )}
      {status === "retro" && (
        <g transform="translate(-26, -22)">
          <rect x="-20" y="-10" width="40" height="20" rx="10" fill="#f59e0b" />
          <text y="4" textAnchor="middle" fontSize="10" fill="#fff" fontWeight="800">
            회고
          </text>
        </g>
      )}
      {status === "graduated" && (
        <g transform="translate(-26, -22)">
          <rect x="-20" y="-10" width="40" height="20" rx="10" fill="#2F6B4F" />
          <text y="4" textAnchor="middle" fontSize="10" fill="#fff" fontWeight="800">
            수료
          </text>
        </g>
      )}
    </g>
  );
}

function Chair({
  seat,
}: {
  seat: { id: string; x: number; y: number; facing: "up" | "down" | "left" | "right" };
}) {
  const distance = 40;
  let cx = seat.x;
  let cy = seat.y;
  let w = 22;
  let h = 16;
  switch (seat.facing) {
    case "up":
      cy = seat.y + distance;
      break;
    case "down":
      cy = seat.y - distance;
      break;
    case "left":
      cx = seat.x + distance;
      w = 16;
      h = 22;
      break;
    case "right":
      cx = seat.x - distance;
      w = 16;
      h = 22;
      break;
  }
  return (
    <g>
      <rect
        x={cx - w / 2}
        y={cy - h / 2}
        width={w}
        height={h}
        rx="5"
        fill="#334155"
        stroke="#1e293b"
        strokeWidth="2"
      />
      <rect
        x={cx - w / 2 + 3}
        y={cy - h / 2 + 3}
        width={w - 6}
        height={h - 6}
        rx="3"
        fill="#475569"
      />
    </g>
  );
}



