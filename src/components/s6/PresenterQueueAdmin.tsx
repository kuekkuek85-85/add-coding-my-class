import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Play,
  RotateCcw,
  Timer,
  ChevronRight,
  UserPlus,
  X,
  CheckCircle2,
  Mic,
  Maximize2,
} from "lucide-react";

import {
  getSessionS6Overview,
  getPresentationState,
  addToQueue,
  removeFromQueue,
  setCurrentPresenter,
  markPresenterDone,
  resetTimer,
} from "@/lib/s6.functions";
import { Button } from "@/components/ui/button";
import { PresentationFullscreen } from "@/components/s6/PresentationFullscreen";

export function PresenterQueueAdmin({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const fetchOverview = useServerFn(getSessionS6Overview);
  const fetchState = useServerFn(getPresentationState);
  const add = useServerFn(addToQueue);
  const remove = useServerFn(removeFromQueue);
  const setCurrent = useServerFn(setCurrentPresenter);
  const markDone = useServerFn(markPresenterDone);
  const timer = useServerFn(resetTimer);

  const overviewKey = ["s6-overview", userId];
  const stateKey = ["s6-presentation", userId];

  const { data: overview } = useQuery({
    queryKey: overviewKey,
    queryFn: () => fetchOverview({ data: { userId } }),
    refetchInterval: 5_000,
  });
  const { data: state } = useQuery({
    queryKey: stateKey,
    queryFn: () => fetchState({ data: { userId } }),
    refetchInterval: 3_000,
  });

  function invalidate() {
    qc.invalidateQueries({ queryKey: overviewKey });
    qc.invalidateQueries({ queryKey: stateKey });
  }

  const addMut = useMutation({
    mutationFn: (targetId: string) => add({ data: { userId, targetId } }),
    onSuccess: (res) => {
      if (!res.ok) return toast.error(res.error);
      invalidate();
    },
  });
  const removeMut = useMutation({
    mutationFn: (targetId: string) => remove({ data: { userId, targetId } }),
    onSuccess: (res) => {
      if (!res.ok) return toast.error(res.error);
      invalidate();
    },
  });
  const currentMut = useMutation({
    mutationFn: (targetId: string) => setCurrent({ data: { userId, targetId } }),
    onSuccess: (res) => {
      if (!res.ok) return toast.error(res.error);
      toast.success("현재 발표자로 지정했어요. 타이머가 시작됩니다.");
      invalidate();
    },
  });
  const doneMut = useMutation({
    mutationFn: (targetId: string) => markDone({ data: { userId, targetId } }),
    onSuccess: (res) => {
      if (!res.ok) return toast.error(res.error);
      invalidate();
    },
  });
  const timerMut = useMutation({
    mutationFn: (start: boolean) => timer({ data: { userId, start } }),
    onSuccess: () => invalidate(),
  });

  const progress = overview?.ok ? overview.progress : [];
  const queue = state?.ok ? state.queue : [];
  const queueIds = new Set(queue.map((q) => q.userId));
  const current = state?.ok ? state.current : null;
  const eligible = progress.filter((p) => p.slidesConfirmed && !queueIds.has(p.userId));

  return (
    <div className="rounded-2xl border-2 border-primary/20 bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-primary">
          <Mic className="h-4 w-4" aria-hidden />
          <h3 className="font-display text-sm font-bold">S6 발표 진행</h3>
        </div>
        <div className="flex items-center gap-2">
          {state?.ok && state.timerStartedAt ? (
            <LiveTimer startedAt={state.timerStartedAt} />
          ) : (
            <span className="text-xs text-muted-foreground">타이머 대기 중</span>
          )}
          <Button
            size="sm"
            variant="outline"
            className="gap-1"
            onClick={() => timerMut.mutate(true)}
          >
            <Play className="h-3.5 w-3.5" aria-hidden />
            시작
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="gap-1"
            onClick={() => timerMut.mutate(false)}
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            리셋
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <p className="mb-1 text-xs font-semibold text-muted-foreground">발표 큐</p>
          {queue.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border/60 p-3 text-xs text-muted-foreground">
              큐가 비어 있어요. 오른쪽에서 참가자를 추가하세요.
            </p>
          ) : (
            <ol className="space-y-1.5">
              {queue.map((q) => (
                <li
                  key={q.userId}
                  className={`flex items-center justify-between gap-2 rounded-lg border-2 px-2 py-1.5 text-sm ${
                    q.state === "current"
                      ? "border-primary bg-primary/10"
                      : q.state === "done"
                        ? "border-border/40 bg-muted/50 text-muted-foreground"
                        : "border-primary/20 bg-card"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-[11px] font-bold text-primary">
                      {q.orderIndex}
                    </span>
                    <span className="font-medium">{q.nickname}</span>
                    {q.state === "current" && (
                      <span className="text-[10px] font-bold uppercase text-primary">발표 중</span>
                    )}
                    {q.state === "done" && (
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary/70" aria-hidden />
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {q.state !== "current" && q.state !== "done" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 gap-1 px-2 text-xs"
                        onClick={() => currentMut.mutate(q.userId)}
                      >
                        <ChevronRight className="h-3 w-3" aria-hidden />
                        발표 시작
                      </Button>
                    )}
                    {q.state === "current" && (
                      <Button
                        size="sm"
                        className="h-7 gap-1 px-2 text-xs"
                        onClick={() => doneMut.mutate(q.userId)}
                      >
                        완료
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      aria-label="큐에서 제거"
                      onClick={() => removeMut.mutate(q.userId)}
                    >
                      <X className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div>
          <p className="mb-1 text-xs font-semibold text-muted-foreground">
            추가할 참가자 (슬라이드 확정자)
          </p>
          {eligible.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border/60 p-3 text-xs text-muted-foreground">
              대기 중인 확정 참가자가 없어요.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {eligible.map((p) => (
                <li
                  key={p.userId}
                  className="flex items-center justify-between gap-2 rounded-lg border border-primary/15 bg-muted/30 px-2 py-1.5 text-sm"
                >
                  <span className="font-medium">{p.nickname}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1 px-2 text-xs"
                    onClick={() => addMut.mutate(p.userId)}
                  >
                    <UserPlus className="h-3 w-3" aria-hidden />
                    큐에 추가
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {current && (
        <p className="mt-3 text-xs text-muted-foreground">
          지금 발표 중 · <b className="text-primary">{current.nickname}</b>
          {progress.find((p) => p.userId === current.userId)
            ? ` · 청중 코멘트 ${progress.find((p) => p.userId === current.userId)!.commentsReceived}건`
            : ""}
        </p>
      )}
    </div>
  );
}

function LiveTimer({ startedAt }: { startedAt: string }) {
  const start = new Date(startedAt).getTime();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(t);
  }, []);
  const secs = Math.max(0, Math.floor((now - start) / 1000));
  const mm = String(Math.floor(secs / 60)).padStart(2, "0");
  const ss = String(secs % 60).padStart(2, "0");
  const over = secs > 180;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
        over ? "bg-rose-100 text-rose-800" : "bg-primary/10 text-primary"
      }`}
    >
      <Timer className="h-3 w-3" aria-hidden />
      {mm}:{ss}
    </span>
  );
}
