import { Stamp, Lock, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { STAGES } from "@/components/school/TimetableCard";

export type StampSet = {
  s1: boolean;
  s2: boolean;
  s3: boolean;
  s4: boolean;
  s5: boolean;
  s6: boolean;
};

export function CompletionStamp({
  stamps,
  stampCount,
  retroSubmitted,
  allDone,
  nickname,
  sessionName,
  completedAt,
  closedAt,
  className,
}: {
  stamps: StampSet;
  stampCount: number;
  retroSubmitted: boolean;
  allDone: boolean;
  nickname: string;
  sessionName: string;
  completedAt: string | null;
  closedAt: string | null;
  className?: string;
}) {
  const items = STAGES.map((s) => ({
    code: s.code,
    title: s.title,
    done: stamps[`s${s.no}` as keyof StampSet],
  }));

  const missing: string[] = [];
  for (const it of items) if (!it.done) missing.push(it.code);
  if (!retroSubmitted) missing.push("회고");

  return (
    <div
      className={cn(
        "rounded-2xl border-2 p-5 shadow-sm",
        allDone
          ? "border-primary bg-accent/30"
          : "border-primary/20 bg-card",
        className,
      )}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {allDone ? (
            <CheckCircle2 className="h-5 w-5 text-primary" aria-hidden />
          ) : (
            <Stamp className="h-5 w-5 text-primary/70" aria-hidden />
          )}
          <h2 className="font-display text-base font-bold text-foreground">
            {allDone ? "심화반 수료 완료!" : "수료 도장판"}
          </h2>
        </div>
        <span className="text-xs text-muted-foreground">
          도장 {stampCount}/6 · 회고 {retroSubmitted ? "완료" : "미제출"}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {items.map((it) => (
          <div
            key={it.code}
            className={cn(
              "flex flex-col items-center gap-1 rounded-xl border-2 p-2 text-center",
              it.done
                ? "border-primary/60 bg-primary/10 text-primary"
                : "border-border/70 bg-muted text-muted-foreground",
            )}
            title={it.title}
          >
            {it.done ? (
              <Stamp className="h-4 w-4" aria-hidden />
            ) : (
              <Lock className="h-4 w-4" aria-hidden />
            )}
            <span className="text-[10px] font-bold">{it.code}</span>
          </div>
        ))}
      </div>

      {allDone ? (
        <p className="mt-3 text-sm text-primary">
          축하합니다, <b>{nickname}</b> 선생님! {sessionName} 심화반을 완주하셨습니다.
          {completedAt && (
            <span className="ml-1 text-xs text-muted-foreground">
              ({new Date(completedAt).toLocaleString("ko-KR")})
            </span>
          )}
        </p>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          남은 항목: <b>{missing.join(", ")}</b>
        </p>
      )}
      {closedAt && (
        <p className="mt-2 text-xs text-amber-700">
          강사가 연수를 종료했습니다({new Date(closedAt).toLocaleString("ko-KR")}). 이제
          기록은 보기 전용입니다.
        </p>
      )}
    </div>
  );
}
