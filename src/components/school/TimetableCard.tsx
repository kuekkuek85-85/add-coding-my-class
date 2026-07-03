import { Lock, CircleDot, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { StageStamp } from "./Nametag";

export type StageStatus = "locked" | "open" | "done";

export type Stage = {
  no: number;
  code: string; // S1..S6
  title: string;
  goal: string;
};

export const STAGES: Stage[] = [
  { no: 1, code: "S1", title: "글쌤봇 따라하기", goal: "체크포인트별 초록불로 진도 확인" },
  { no: 2, code: "S2", title: "글쌤봇 확장", goal: "확장 기능의 테스트 케이스 2개 먼저 작성" },
  { no: 3, code: "S3", title: "PRD 작성·검증", goal: "1차 제출 → 체인 동료 리뷰 → 2차 제출" },
  { no: 4, code: "S4", title: "TDD + 구현", goal: "테스트 케이스 3개 이상 → 첫 프롬프트 조립" },
  { no: 5, code: "S5", title: "교차 QA + 개선", goal: "실행 체크리스트 + 수정 프롬프트 초안" },
  { no: 6, code: "S6", title: "갤러리 발표", goal: "제출 순서대로 3분 발표" },
];

export function TimetableCard({
  stage,
  status,
  onClick,
}: {
  stage: Stage;
  status: StageStatus;
  onClick?: () => void;
}) {
  const locked = status === "locked";
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative flex h-full w-full flex-col gap-3 rounded-2xl border-2 bg-card p-5 text-left shadow-sm transition-all",
        locked
          ? "cursor-not-allowed border-border/60 opacity-70"
          : "border-primary/30 hover:-translate-y-0.5 hover:border-primary hover:shadow-md",
      )}
      aria-disabled={locked}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 font-display text-sm font-bold text-primary">
            {stage.no}
          </span>
          <span className="text-xs font-medium text-muted-foreground">{stage.code} · {stage.no}교시</span>
        </div>
        {status === "done" ? (
          <StageStamp>완료</StageStamp>
        ) : status === "open" ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
            <CircleDot className="h-3 w-3" aria-hidden /> 진행 중
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            <Lock className="h-3 w-3" aria-hidden /> 잠김
          </span>
        )}
      </div>
      <div>
        <h3 className="font-display text-lg font-bold text-foreground">{stage.title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{stage.goal}</p>
      </div>
      {locked && (
        <p className="mt-auto text-xs text-muted-foreground">
          <Lock className="mr-1 inline h-3 w-3" aria-hidden />
          이전 스테이지의 게이트를 통과해야 열립니다.
        </p>
      )}
      {status === "open" && (
        <p className="mt-auto flex items-center gap-1 text-xs font-medium text-primary">
          <Check className="h-3.5 w-3.5" aria-hidden /> 지금 진행 가능
        </p>
      )}
    </button>
  );
}
