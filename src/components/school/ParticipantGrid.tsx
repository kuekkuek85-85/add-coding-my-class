import { Stamp, CircleDot, Lock, StickyNote, ShieldCheck, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { STAGES } from "./TimetableCard";

export type S1Progress = {
  userId: string;
  checked: number;
  memoCount: number;
};

export type S2Progress = {
  userId: string;
  cases: number;
  passed: boolean;
};

/**
 * 강사 대시보드: 참가자 × 6교시 그리드.
 * S1 셀은 체크포인트 통과 개수(N/M)를, 오전 메모 개수를 사이드에 표시한다.
 */
export function ParticipantGrid({
  participants,
  currentStage,
  s1Progress,
  s1Total,
  s2Progress,
  s2Min,
}: {
  participants: Array<{ id: string; nickname: string }>;
  currentStage: number;
  s1Progress?: S1Progress[];
  s1Total?: number;
  s2Progress?: S2Progress[];
  s2Min?: number;
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

  const progressMap = new Map<string, S1Progress>();
  for (const p of s1Progress ?? []) progressMap.set(p.userId, p);
  const total = s1Total ?? 0;

  const s2Map = new Map<string, S2Progress>();
  for (const p of s2Progress ?? []) s2Map.set(p.userId, p);
  const s2Threshold = s2Min ?? 2;

  return (
    <div className="overflow-x-auto rounded-2xl border-2 border-primary/15 bg-card">
      <table className="w-full min-w-[620px] text-sm">
        <thead>
          <tr className="border-b border-border/70 bg-muted/40 text-xs">
            <th className="px-3 py-2 text-left font-semibold text-muted-foreground">
              참가 교사
            </th>
            <th className="px-2 py-2 text-center font-semibold text-muted-foreground">
              메모
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
          {participants.map((p) => {
            const pr = progressMap.get(p.id);
            const s2 = s2Map.get(p.id);
            return (
              <tr key={p.id} className="border-b border-border/40 last:border-0">
                <td className="px-3 py-2.5 font-medium text-foreground">{p.nickname}</td>
                <td className="px-2 py-2 text-center">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs",
                      (pr?.memoCount ?? 0) > 0
                        ? "bg-accent/40 text-primary"
                        : "bg-muted text-muted-foreground",
                    )}
                    aria-label={`오전 메모 ${pr?.memoCount ?? 0}건`}
                  >
                    <StickyNote className="h-3 w-3" aria-hidden />
                    {pr?.memoCount ?? 0}
                  </span>
                </td>
                {STAGES.map((s) => {
                  const st: "done" | "open" | "locked" =
                    s.no < currentStage ? "done" : s.no === currentStage ? "open" : "locked";
                  const showS1Count = s.no === 1 && total > 0 && st !== "locked";
                  const showS2Gate = s.no === 2 && st !== "locked";
                  return (
                    <td key={s.code} className="px-2 py-2 text-center">
                      {showS1Count ? (
                        <S1Cell checked={pr?.checked ?? 0} total={total} status={st} />
                      ) : showS2Gate ? (
                        <S2Cell
                          cases={s2?.cases ?? 0}
                          min={s2Threshold}
                          passed={s2?.passed ?? false}
                        />
                      ) : (
                        <StageCell status={st} />
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function S1Cell({
  checked,
  total,
  status,
}: {
  checked: number;
  total: number;
  status: "done" | "open" | "locked";
}) {
  const complete = checked >= total && total > 0;
  return (
    <span
      className={cn(
        "inline-flex min-w-[46px] items-center justify-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
        complete
          ? "bg-primary text-primary-foreground"
          : checked > 0
            ? "bg-accent/50 text-primary"
            : status === "open"
              ? "bg-muted text-muted-foreground"
              : "bg-muted text-muted-foreground",
      )}
      aria-label={`S1 체크포인트 ${checked}/${total}`}
    >
      {complete && <Stamp className="h-3 w-3" aria-hidden />}
      {checked}/{total}
    </span>
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
