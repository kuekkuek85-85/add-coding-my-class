import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CheckCircle2, Circle, Lightbulb, Plus, Sparkles, StickyNote, Trash2, X } from "lucide-react";

import {
  addCustomCheckpoint,
  addMemo,
  deleteCustomCheckpoint,
  deleteMemo,
  getMyS1State,
  toggleCheckpoint,
} from "@/lib/s1.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const MEMO_MAX = 280;

export function S1Panel({
  userId,
  currentStage,
}: {
  userId: string;
  currentStage: number;
}) {
  const queryClient = useQueryClient();
  const fetchState = useServerFn(getMyS1State);
  const toggleFn = useServerFn(toggleCheckpoint);
  const addCustomFn = useServerFn(addCustomCheckpoint);
  const deleteCustomFn = useServerFn(deleteCustomCheckpoint);
  const addFn = useServerFn(addMemo);
  const delFn = useServerFn(deleteMemo);

  const stateKey = ["s1-state", userId];

  const { data } = useQuery({
    queryKey: stateKey,
    queryFn: () => fetchState({ data: { userId } }),
    enabled: !!userId,
    refetchInterval: 15_000,
  });

  const toggleMut = useMutation({
    mutationFn: (v: { checkpointId: string; on: boolean }) =>
      toggleFn({ data: { userId, ...v } }),
    onMutate: async (v) => {
      await queryClient.cancelQueries({ queryKey: stateKey });
      const prev = queryClient.getQueryData<Awaited<ReturnType<typeof fetchState>>>(stateKey);
      if (prev && prev.ok) {
        const next = {
          ...prev,
          checkedIds: v.on
            ? Array.from(new Set([...prev.checkedIds, v.checkpointId]))
            : prev.checkedIds.filter((id) => id !== v.checkpointId),
        };
        queryClient.setQueryData(stateKey, next);
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(stateKey, ctx.prev);
      toast.error("저장에 실패했습니다.");
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: stateKey }),
  });

  const [memo, setMemo] = useState("");
  const [memoStage, setMemoStage] = useState<1 | 2>(currentStage === 2 ? 2 : 1);

  const addMut = useMutation({
    mutationFn: () => addFn({ data: { userId, stageNo: memoStage, text: memo } }),
    onSuccess: (res) => {
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setMemo("");
      toast.success("메모가 저장되었습니다.");
      queryClient.invalidateQueries({ queryKey: stateKey });
    },
    onError: () => toast.error("메모 저장에 실패했습니다."),
  });

  const delMut = useMutation({
    mutationFn: (memoId: string) => delFn({ data: { userId, memoId } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: stateKey }),
  });

  const [customLabel, setCustomLabel] = useState("");
  const [customHint, setCustomHint] = useState("");

  const addCustomMut = useMutation({
    mutationFn: () =>
      addCustomFn({
        data: {
          userId,
          label: customLabel.trim(),
          hint: customHint.trim(),
        },
      }),
    onSuccess: (res) => {
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setCustomLabel("");
      setCustomHint("");
      toast.success("나만의 AI 비판적 사용 질문이 추가되었습니다.");
      queryClient.invalidateQueries({ queryKey: stateKey });
    },
    onError: () => toast.error("추가에 실패했습니다."),
  });

  const deleteCustomMut = useMutation({
    mutationFn: (checkpointId: string) =>
      deleteCustomFn({ data: { userId, checkpointId } }),
    onSuccess: (res) => {
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("질문이 삭제되었습니다.");
      queryClient.invalidateQueries({ queryKey: stateKey });
    },
    onError: () => toast.error("삭제에 실패했습니다."),
  });

  if (!data || !data.ok) return null;

  const total = data.checkpoints.length;
  const done = data.checkedIds.length;
  const checkedSet = new Set(data.checkedIds);
  const memoAllowed = currentStage <= 2;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* 체크포인트 */}
      <div className="rounded-2xl border-2 border-primary/25 bg-card p-5 shadow-sm lg:col-span-2">
        <div className="mb-4 flex items-baseline justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary/70">
              S1 · 1교시
            </p>
            <h2 className="font-display text-xl font-bold text-foreground">
              기본 기능 떠올리기 — 체크포인트
            </h2>
          </div>
          <div className="text-sm font-semibold text-primary">
            {done} / {total} 초록불
          </div>
        </div>

        <ul className="flex flex-col gap-2">
          {data.checkpoints.map((cp) => {
            const on = checkedSet.has(cp.id);
            const isCustom = !!cp.is_custom;
            return (
              <li key={cp.id}>
                <div className="flex items-start gap-1">
                  <button
                    type="button"
                    onClick={() => toggleMut.mutate({ checkpointId: cp.id, on: !on })}
                    className={cn(
                      "group flex flex-1 items-start gap-3 rounded-xl border-2 p-3 text-left transition-all",
                      on
                        ? "border-primary/70 bg-primary/5"
                        : "border-border/70 bg-background hover:border-primary/40",
                      isCustom && "border-accent/60 bg-accent/10",
                    )}
                    aria-pressed={on}
                  >
                    <span
                      className={cn(
                        "mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                        on ? "text-primary" : "text-muted-foreground",
                      )}
                      aria-hidden
                    >
                      {on ? (
                        <CheckCircle2 className="h-6 w-6" />
                      ) : (
                        <Circle className="h-6 w-6" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "flex items-center gap-2 font-display text-sm font-bold",
                          on ? "text-primary" : "text-foreground",
                        )}
                      >
                        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          {cp.seq}
                        </span>
                        {cp.label}
                        {isCustom && (
                          <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-semibold text-accent-foreground">
                            내 질문
                          </span>
                        )}
                        {on && !isCustom && (
                          <span className="ml-auto text-[10px] font-semibold text-primary">
                            초록불
                          </span>
                        )}
                      </span>
                      {cp.hint && (
                        <span className="mt-1 flex items-start gap-1 text-xs text-muted-foreground">
                          <Lightbulb className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
                          {cp.hint}
                        </span>
                      )}
                    </span>
                  </button>
                  {isCustom && (
                    <button
                      type="button"
                      onClick={() => deleteCustomMut.mutate(cp.id)}
                      disabled={deleteCustomMut.isPending}
                      className="ml-1 shrink-0 self-center rounded-full p-2 text-muted-foreground opacity-60 transition-opacity hover:bg-destructive/10 hover:text-destructive hover:opacity-100"
                      aria-label="질문 삭제"
                    >
                      <X className="h-4 w-4" aria-hidden />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        {/* AI 비판적 사용 질문 추가 */}
        {!data.checkpoints.some((cp) => cp.is_custom) && (
          <div className="mt-4 rounded-xl border-2 border-dashed border-accent/50 bg-accent/10 p-4">
            <div className="mb-2 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" aria-hidden />
              <h3 className="font-display text-sm font-bold text-foreground">
                내 AI 비판적 사용 질문 1개 추가
              </h3>
            </div>
            <p className="mb-2 text-xs text-muted-foreground">
              AI를 쓸 때 스스로 한 번 더 물어볼 질문을 하나 정해 보세요. 사람마다 다를 수
              있어요.
            </p>
            <Input
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value.slice(0, 100))}
              placeholder="예: AI가 추천한 기능이 우리 반 학생에게 꼭 필요한가?"
              className="mb-2 bg-background/80"
            />
            <Textarea
              value={customHint}
              onChange={(e) => setCustomHint(e.target.value.slice(0, 200))}
              placeholder="왜 그 질문이 중요한지 짧게 적어도 됩니다. (선택)"
              rows={2}
              className="mb-2 min-h-[48px] bg-background/80 text-xs"
            />
            <Button
              size="sm"
              onClick={() => addCustomMut.mutate()}
              disabled={!customLabel.trim() || addCustomMut.isPending}
            >
              <Plus className="mr-1 h-3.5 w-3.5" aria-hidden />
              추가
            </Button>
          </div>
        )}
      </div>

      {/* 오전 메모 위젯 */}
      <div className="rounded-2xl border-2 border-accent/50 bg-accent/10 p-5 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <StickyNote className="h-4 w-4 text-primary" aria-hidden />
          <h2 className="font-display text-sm font-bold text-foreground">
            내 수업이라면? · 30초 메모
          </h2>
        </div>
        {memoAllowed ? (
          <>
            <p className="mb-2 text-xs text-muted-foreground">
              실습 중 떠오른 아이디어를 짧게 남겨두세요. 3교시 PRD 작성 화면에서 자동으로
              불러옵니다.
            </p>
            <div className="mb-2 flex items-center gap-1 text-xs">
              <span className="text-muted-foreground">교시:</span>
              {[1, 2].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setMemoStage(n as 1 | 2)}
                  className={cn(
                    "rounded-full px-2 py-0.5 font-semibold",
                    memoStage === n
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground",
                  )}
                >
                  {n}교시
                </button>
              ))}
            </div>
            <Textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value.slice(0, MEMO_MAX))}
              placeholder="예: 우리 반 아이들에게는 응답이 3문장을 넘으면 안 읽을 것 같다."
              className="min-h-[84px] bg-background/80"
              maxLength={MEMO_MAX}
            />
            <div className="mt-1 flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">
                {memo.length}/{MEMO_MAX}
              </span>
              <Button
                size="sm"
                onClick={() => addMut.mutate()}
                disabled={!memo.trim() || addMut.isPending}
              >
                메모 저장
              </Button>
            </div>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">
            1~2교시에만 새 메모를 저장할 수 있습니다. 아래는 지금까지의 메모입니다.
          </p>
        )}

        {data.memos.length > 0 && (
          <ul className="mt-4 flex flex-col gap-2 border-t border-accent/30 pt-3">
            {data.memos.map((m) => (
              <li
                key={m.id}
                className="group flex items-start gap-2 rounded-lg bg-background/70 p-2 text-xs"
              >
                <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                  {m.stage_no}교시
                </span>
                <span className="flex-1 whitespace-pre-wrap text-foreground">{m.text}</span>
                <button
                  type="button"
                  onClick={() => delMut.mutate(m.id)}
                  className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                  aria-label="메모 삭제"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
