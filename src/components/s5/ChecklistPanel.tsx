import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Circle, MinusCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

import { getMyS5State, setS5ChecklistResult } from "@/lib/s5.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Status = "pass" | "fail" | "partial";

const STATUS_META: Record<Status, { label: string; Icon: typeof CheckCircle2; cls: string }> = {
  pass: { label: "통과", Icon: CheckCircle2, cls: "border-emerald-400 bg-emerald-50 text-emerald-800" },
  partial: { label: "부분 통과", Icon: MinusCircle, cls: "border-amber-400 bg-amber-50 text-amber-800" },
  fail: { label: "실패", Icon: XCircle, cls: "border-rose-400 bg-rose-50 text-rose-800" },
};

export function ChecklistPanel({ userId, locked }: { userId: string; locked: boolean }) {
  const qc = useQueryClient();
  const fetchState = useServerFn(getMyS5State);
  const saveResult = useServerFn(setS5ChecklistResult);
  const key = ["s5-state", userId];

  const { data } = useQuery({
    queryKey: key,
    queryFn: () => fetchState({ data: { userId } }),
    enabled: !!userId,
    refetchInterval: 15_000,
  });

  const cases = data?.ok ? data.cases : [];
  const [drafts, setDrafts] = useState<Record<string, { status: Status; note: string }>>({});

  const mut = useMutation({
    mutationFn: (v: { testCaseId: string; source: "s2" | "s4"; status: Status; note: string }) =>
      saveResult({
        data: { userId, testCaseId: v.testCaseId, source: v.source, status: v.status, note: v.note },
      }),
    onSuccess: (res) => {
      if (!res.ok) return toast.error(res.error);
      qc.invalidateQueries({ queryKey: key });
    },
  });

  const checkedCount = useMemo(() => cases.filter((c) => c.result).length, [cases]);

  if (data?.ok && !data.s4Confirmed) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-border/70 bg-muted/30 p-6 text-center text-sm text-muted-foreground">
        S4에서 첫 PRD 프롬프트를 확정해야 실행 체크리스트가 열립니다.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border-2 border-primary/20 bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary/70">S5 · 5교시</p>
          <h2 className="font-display text-xl font-bold text-foreground">실행 체크리스트</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            2교시·4교시에서 작성한 테스트 케이스를 하나씩 돌려보고 <b>통과 / 부분 / 실패</b>를 표시합니다.
          </p>
        </div>
        <p
          className={cn(
            "text-xs font-semibold",
            checkedCount === cases.length && cases.length > 0
              ? "text-emerald-600"
              : "text-muted-foreground",
          )}
        >
          {checkedCount} / {cases.length} 기록
        </p>
      </div>

      {cases.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border/60 bg-muted/30 p-4 text-center text-sm text-muted-foreground">
          기록할 테스트 케이스가 없습니다. 2교시(S2) 또는 4교시(S4)로 돌아가 확인해 주세요.
        </p>
      ) : (
        <ol className="flex flex-col gap-3">
          {cases.map((c, i) => {
            const saved = c.result ?? null;
            const key = `${c.source}:${c.id}`;
            const draft = drafts[key] ?? {
              status: (saved?.status as Status | undefined) ?? "pass",
              note: saved?.note ?? "",
            };
            const dirty =
              !saved ||
              draft.status !== saved.status ||
              draft.note !== (saved.note ?? "");
            const isS2 = c.source === "s2";
            return (
              <li
                key={key}
                className={cn(
                  "rounded-xl border-2 p-3",
                  saved ? STATUS_META[saved.status as Status].cls : "border-border/60 bg-background",
                )}
              >
                <div className="mb-2 flex items-start gap-2">
                  <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                          isS2
                            ? "bg-primary/15 text-primary"
                            : "bg-accent/40 text-primary",
                        )}
                      >
                        {isS2 ? "S2" : "S4"}
                      </span>
                      <p className="text-sm font-bold text-foreground">{c.title || "(제목 없음)"}</p>
                    </div>
                    <dl className="mt-1 grid gap-0.5 text-xs text-foreground/80">
                      {isS2 ? (
                        <>
                          <div className="flex gap-2">
                            <dt className="w-12 shrink-0 font-semibold text-muted-foreground">상황</dt>
                            <dd className="flex-1 whitespace-pre-wrap">{c.given}</dd>
                          </div>
                          <div className="flex gap-2">
                            <dt className="w-12 shrink-0 font-semibold text-muted-foreground">기대</dt>
                            <dd className="flex-1 whitespace-pre-wrap">{c.then_step}</dd>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex gap-2">
                            <dt className="w-12 shrink-0 font-semibold text-muted-foreground">주어진</dt>
                            <dd className="flex-1 whitespace-pre-wrap">{c.given}</dd>
                          </div>
                          <div className="flex gap-2">
                            <dt className="w-12 shrink-0 font-semibold text-muted-foreground">할 때</dt>
                            <dd className="flex-1 whitespace-pre-wrap">{c.when_step}</dd>
                          </div>
                          <div className="flex gap-2">
                            <dt className="w-12 shrink-0 font-semibold text-muted-foreground">그러면</dt>
                            <dd className="flex-1 whitespace-pre-wrap">{c.then_step}</dd>
                          </div>
                        </>
                      )}
                    </dl>
                  </div>
                  {saved ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                  ) : (
                    <Circle className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  )}
                </div>

                <div className="mt-2 flex flex-col gap-2">
                  <div className="flex flex-wrap gap-1.5">
                    {(Object.keys(STATUS_META) as Status[]).map((s) => {
                      const meta = STATUS_META[s];
                      const active = draft.status === s;
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() =>
                            setDrafts((d) => ({ ...d, [key]: { ...draft, status: s } }))
                          }
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full border-2 px-2.5 py-1 text-xs font-semibold transition-all",
                            active
                              ? meta.cls
                              : "border-border/60 bg-card text-muted-foreground hover:border-primary/40",
                          )}
                        >
                          <meta.Icon className="h-3 w-3" aria-hidden />
                          {meta.label}
                        </button>
                      );
                    })}
                  </div>
                  <Textarea
                    rows={2}
                    placeholder="관찰한 것을 짧게 (예: 힌트가 정답 문장을 그대로 보여줌)"
                    value={draft.note}
                    maxLength={1000}
                    onChange={(e) =>
                      setDrafts((d) => ({ ...d, [key]: { ...draft, note: e.target.value } }))
                    }
                  />
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      disabled={!dirty || mut.isPending}
                      onClick={() => {
                        setDrafts((d) => ({ ...d, [key]: draft }));
                        mut.mutate({
                          testCaseId: c.id,
                          source: c.source,
                          status: draft.status,
                          note: draft.note,
                        });
                      }}
                    >
                      {saved ? "기록 갱신" : "기록 저장"}
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
