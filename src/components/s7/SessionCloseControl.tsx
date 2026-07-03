import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { DoorClosed, DoorOpen, Award } from "lucide-react";

import {
  closeSession,
  getSessionCompletion,
  reopenSession,
} from "@/lib/s7.functions";
import { Button } from "@/components/ui/button";

export function SessionCloseControl({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const fetchCompletion = useServerFn(getSessionCompletion);
  const doClose = useServerFn(closeSession);
  const doReopen = useServerFn(reopenSession);

  const key = ["s7-completion-summary", userId];
  const { data } = useQuery({
    queryKey: key,
    queryFn: () => fetchCompletion({ data: { userId } }),
    refetchInterval: 10_000,
  });

  const [confirming, setConfirming] = useState<null | "close" | "reopen">(null);

  const closeMut = useMutation({
    mutationFn: () => doClose({ data: { userId } }),
    onSuccess: (res) => {
      if (!res.ok) return toast.error(res.error);
      toast.success("연수를 종료했습니다.");
      setConfirming(null);
      queryClient.invalidateQueries({ queryKey: key });
    },
  });

  const reopenMut = useMutation({
    mutationFn: () => doReopen({ data: { userId } }),
    onSuccess: (res) => {
      if (!res.ok) return toast.error(res.error);
      toast.success("연수를 다시 열었습니다.");
      setConfirming(null);
      queryClient.invalidateQueries({ queryKey: key });
    },
  });

  const rows = data?.ok ? data.rows : [];
  const closedAt = data?.ok ? data.closedAt : null;
  const doneCount = rows.filter((r) => r.allDone).length;

  return (
    <div className="rounded-2xl border-2 border-primary/20 bg-card p-5 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Award className="h-4 w-4 text-primary" aria-hidden />
          <h2 className="font-display text-sm font-bold text-foreground">
            연수 마무리
          </h2>
        </div>
        <span className="text-xs text-muted-foreground">
          수료 완료 {doneCount} / 총 {rows.length}명
        </span>
      </div>

      {rows.length > 0 && (
        <ul className="mb-3 flex flex-wrap gap-1.5">
          {rows.map((r) => (
            <li
              key={r.userId}
              className={
                r.allDone
                  ? "rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary"
                  : "rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
              }
              title={`도장 ${r.stampCount}/6 · 회고 ${r.retroSubmitted ? "제출" : "미제출"}`}
            >
              {r.nickname} · {r.stampCount}/6{r.retroSubmitted ? "★" : ""}
            </li>
          ))}
        </ul>
      )}

      {closedAt ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border-2 border-amber-300 bg-amber-50 p-3">
          <p className="text-sm text-amber-900">
            <DoorClosed className="mr-1 inline h-4 w-4" aria-hidden />
            연수가 종료되었습니다 ({new Date(closedAt).toLocaleString("ko-KR")}).
            참가자는 이제 회고를 편집할 수 없습니다.
          </p>
          {confirming === "reopen" ? (
            <div className="flex gap-1.5">
              <Button size="sm" onClick={() => reopenMut.mutate()} disabled={reopenMut.isPending}>
                네, 다시 열기
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirming(null)}>
                취소
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setConfirming("reopen")}
            >
              <DoorOpen className="mr-1 h-3.5 w-3.5" aria-hidden />
              연수 재개
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border-2 border-primary/20 bg-background p-3">
          <p className="text-sm text-muted-foreground">
            종료하면 참가자 회고 편집이 잠기고 홈에 수료 안내가 표시됩니다.
          </p>
          {confirming === "close" ? (
            <div className="flex gap-1.5">
              <Button size="sm" onClick={() => closeMut.mutate()} disabled={closeMut.isPending}>
                네, 종료
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirming(null)}>
                취소
              </Button>
            </div>
          ) : (
            <Button size="sm" onClick={() => setConfirming("close")}>
              <DoorClosed className="mr-1 h-3.5 w-3.5" aria-hidden />
              연수 종료
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
