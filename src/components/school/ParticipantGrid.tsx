import { Stamp, CircleDot, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { STAGES } from "./TimetableCard";

/**
 * 강사 대시보드: 참가자 × 6교시 그리드.
 * 현재는 세션 단위 current_stage 기준으로 도장/진행중/잠금을 표시한다.
 * Step 3부터 참가자별 체크포인트 결과가 반영된다.
 */
export function ParticipantGrid({
  participants,
  currentStage,
}: {
  participants: Array<{ id: string; nickname: string }>;
  currentStage: number;
}) {
  if (participants.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-border/70 p-8 text-center">
        <p className="text-sm text-muted-foreground">
          아직 접속한 참가자가 없습니다. 참가자가 입장하면 여기에 표시됩니다.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border-2 border-primary/15 bg-card">
      <table className="w-full min-w-[520px] text-sm">
        <thead>
          <tr className="border-b border-border/70 bg-muted/40 text-xs">
            <th className="px-3 py-2 text-left font-semibold text-muted-foreground">
              참가 교사
            </th>
            {STAGES.map((s) => (
              <th
                key={s.code}
                className="px-2 py-2 text-center font-semibold text-muted-foreground"
                title={s.title}
              >
                {s.code}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {participants.map((p) => (
            <tr key={p.id} className="border-b border-border/40 last:border-0">
              <td className="px-3 py-2.5 font-medium text-foreground">{p.nickname}</td>
              {STAGES.map((s) => {
                const st: "done" | "open" | "locked" =
                  s.no < currentStage ? "done" : s.no === currentStage ? "open" : "locked";
                return (
                  <td key={s.code} className="px-2 py-2 text-center">
                    <StageCell status={st} />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StageCell({ status }: { status: "done" | "open" | "locked" }) {
  return (
    <span
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-full text-xs",
        status === "done" && "bg-accent/50 text-primary",
        status === "open" && "bg-primary text-primary-foreground",
        status === "locked" && "bg-muted text-muted-foreground",
      )}
      aria-label={
        status === "done" ? "완료(도장)" : status === "open" ? "진행 중" : "잠김"
      }
    >
      {status === "done" ? (
        <Stamp className="h-3.5 w-3.5" aria-hidden />
      ) : status === "open" ? (
        <CircleDot className="h-3.5 w-3.5" aria-hidden />
      ) : (
        <Lock className="h-3 w-3" aria-hidden />
      )}
    </span>
  );
}
