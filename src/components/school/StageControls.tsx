import { ChevronLeft, ChevronRight, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * 강사가 현재 열린 교시(current_stage)를 앞뒤로 이동하며 스테이지를 개폐한다.
 * "다음 교시 개방" = current_stage +1, "이전으로 되돌리기" = -1.
 * 되돌릴 경우 해당 스테이지의 도장이 임시로 사라진다(강사 오조작 대비).
 */
export function StageControls({
  currentStage,
  maxStage,
  onChange,
  busy,
  blockNext,
  blockReason,
}: {
  currentStage: number;
  maxStage: number;
  onChange: (nextStage: number) => void;
  busy?: boolean;
  blockNext?: boolean;
  blockReason?: string;
}) {
  const canOpenNext = currentStage < maxStage && !blockNext;
  const canRollback = currentStage > 1;

  return (
    <div className="rounded-2xl border-2 border-accent/40 bg-accent/10 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-widest text-primary/70">
            <LockKeyhole className="h-3.5 w-3.5" aria-hidden /> 스테이지 개폐
          </p>
          <p className="mt-1 font-display text-lg font-bold text-foreground">
            지금 열린 교시: <span className="text-primary">{currentStage}교시</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            개방 즉시 참가자 화면에 반영됩니다(최대 15초 이내).
          </p>
          {blockNext && blockReason && (
            <p className="mt-1 text-xs font-semibold text-destructive">
              {blockReason} — 통과 전에는 다음 교시를 열 수 없습니다.
            </p>
          )}
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!canRollback || busy}
            onClick={() => onChange(currentStage - 1)}
          >
            <ChevronLeft className="mr-1 h-4 w-4" /> 되돌리기
          </Button>
          <Button
            size="sm"
            disabled={!canOpenNext || busy}
            onClick={() => onChange(currentStage + 1)}
          >
            다음 교시 개방 <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
