import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Trash2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { getMyS4State, upsertS4TestCase, deleteS4TestCase } from "@/lib/s4.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Draft = {
  id?: string;
  title: string;
  given: string;
  when_step: string;
  then_step: string;
};

const EMPTY: Draft = { title: "", given: "", when_step: "", then_step: "" };

function isComplete(d: Draft) {
  return (
    d.title.trim().length > 0 &&
    d.given.trim().length > 0 &&
    d.when_step.trim().length > 0 &&
    d.then_step.trim().length > 0
  );
}

export function TestCaseList({
  userId,
  locked,
}: {
  userId: string;
  locked: boolean;
}) {
  const qc = useQueryClient();
  const fetchState = useServerFn(getMyS4State);
  const upsert = useServerFn(upsertS4TestCase);
  const remove = useServerFn(deleteS4TestCase);
  const key = ["s4-state", userId];

  const { data } = useQuery({
    queryKey: key,
    queryFn: () => fetchState({ data: { userId } }),
    enabled: !!userId,
    refetchInterval: 15_000,
  });

  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    // 편집 모드일 때 서버 값을 강제 덮어쓰지 않음
  }, [data]);

  const upsertMut = useMutation({
    mutationFn: (d: Draft & { id?: string }) =>
      upsert({
        data: {
          userId,
          id: d.id,
          title: d.title.trim(),
          given: d.given.trim(),
          when_step: d.when_step.trim(),
          then_step: d.then_step.trim(),
        },
      }),
    onSuccess: (res) => {
      if (!res.ok) return toast.error(res.error);
      setDraft(EMPTY);
      setEditingId(null);
      qc.invalidateQueries({ queryKey: key });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => remove({ data: { userId, id } }),
    onSuccess: (res) => {
      if (!res.ok) return toast.error(res.error);
      qc.invalidateQueries({ queryKey: key });
    },
  });

  const cases = data?.ok ? data.cases : [];
  const s2Cases = data?.ok ? (data.s2Cases ?? []) : [];
  const completeCount = data?.ok ? data.completeCases : 0;
  const totalCount = completeCount + s2Cases.length;

  return (
    <div className="rounded-2xl border-2 border-primary/20 bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary/70">S4 · 4교시</p>
          <h2 className="font-display text-xl font-bold text-foreground">테스트 케이스</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            2교시 케이스가 아래에 자동으로 보여집니다. <b>총 3개 이상</b>이 되도록 이번 교시에서 추가해 주세요.
          </p>
        </div>
        <div className="text-right text-xs">
          <p className={cn("font-semibold", totalCount >= 3 ? "text-emerald-600" : "text-muted-foreground")}>
            {totalCount} / 3 완성
          </p>
          <p className="text-[11px] text-muted-foreground">
            2교시 {s2Cases.length} · 4교시 {completeCount}
          </p>
        </div>
      </div>

      {/* 2교시에서 가져온 케이스 (읽기 전용) */}
      {s2Cases.length > 0 && (
        <div className="mb-4 rounded-xl border-2 border-primary/15 bg-primary/5 p-3">
          <p className="mb-2 text-xs font-semibold text-primary">2교시에서 가져온 케이스 (읽기 전용)</p>
          <ol className="flex flex-col gap-2">
            {s2Cases.map((c, i) => (
              <li key={c.id} className="rounded-lg border border-primary/20 bg-card p-2 text-xs">
                <div className="mb-1 flex items-center gap-2">
                  <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
                    S2·{i + 1}
                  </span>
                  <span className="font-bold text-foreground">{c.title || "(제목 없음)"}</span>
                </div>
                <dl className="grid gap-0.5 pl-7">
                  <Row label="상황" value={c.given_when} />
                  <Row label="기대" value={c.expected_then} />
                </dl>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* 리스트 */}
      <ol className="mb-4 flex flex-col gap-2">
        {cases.length === 0 && (
          <li className="rounded-xl border border-dashed border-border/60 bg-muted/30 p-4 text-center text-sm text-muted-foreground">
            {s2Cases.length >= 2
              ? "2교시 케이스만으로도 2개가 있어요. 아래에서 1개만 더 추가하면 다음 단계로 갈 수 있습니다."
              : "아직 테스트 케이스가 없어요. 아래에서 첫 케이스를 추가해 주세요."}
          </li>
        )}
        {cases.map((c, i) => {
          const complete = isComplete(c);
          const editing = editingId === c.id;
          return (
            <li
              key={c.id}
              className={cn(
                "rounded-xl border-2 p-3",
                complete ? "border-emerald-300 bg-emerald-50/60" : "border-amber-200 bg-amber-50/40",
              )}
            >
              <div className="mb-1 flex items-start gap-2">
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {i + 1}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-bold text-foreground">{c.title || "(제목 없음)"}</p>
                </div>
                {complete && <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden />}
                {!locked && (
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      onClick={() => {
                        setEditingId(c.id);
                        setDraft({
                          id: c.id,
                          title: c.title,
                          given: c.given,
                          when_step: c.when_step,
                          then_step: c.then_step,
                        });
                      }}
                    >
                      편집
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs text-destructive"
                      onClick={() => deleteMut.mutate(c.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                  </div>
                )}
              </div>
              {!editing && (
                <dl className="grid gap-1 pl-8 text-xs">
                  <Row label="주어진" value={c.given} />
                  <Row label="할 때" value={c.when_step} />
                  <Row label="그러면" value={c.then_step} />
                </dl>
              )}
            </li>
          );
        })}
      </ol>

      {/* 폼 */}
      {(
        <div className="rounded-xl border-2 border-primary/25 bg-accent/20 p-3">
          <p className="mb-2 text-xs font-semibold text-primary">
            {editingId ? "테스트 케이스 편집" : "새 테스트 케이스"}
          </p>
          <div className="flex flex-col gap-2">
            <Input
              placeholder="제목 (예: 힌트 1단계 요청)"
              value={draft.title}
              maxLength={200}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            />
            <Textarea
              rows={2}
              placeholder="주어진 (Given): 예) 학생이 예시 문제를 풀다가 3분 이상 답을 못 내고 있다"
              value={draft.given}
              maxLength={1000}
              onChange={(e) => setDraft((d) => ({ ...d, given: e.target.value }))}
            />
            <Textarea
              rows={2}
              placeholder="할 때 (When): 예) '힌트' 버튼을 누른다"
              value={draft.when_step}
              maxLength={1000}
              onChange={(e) => setDraft((d) => ({ ...d, when_step: e.target.value }))}
            />
            <Textarea
              rows={2}
              placeholder="그러면 (Then): 예) 첫 단계 힌트만 노출된다 (정답은 노출되지 않는다)"
              value={draft.then_step}
              maxLength={1000}
              onChange={(e) => setDraft((d) => ({ ...d, then_step: e.target.value }))}
            />
            <div className="flex justify-end gap-2">
              {editingId && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditingId(null);
                    setDraft(EMPTY);
                  }}
                >
                  취소
                </Button>
              )}
              <Button
                size="sm"
                onClick={() => upsertMut.mutate(draft)}
                disabled={upsertMut.isPending || draft.title.trim().length === 0}
              >
                <Plus className="mr-1 h-3.5 w-3.5" aria-hidden />
                {editingId ? "수정 저장" : "케이스 추가"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="w-14 shrink-0 font-semibold text-muted-foreground">{label}</dt>
      <dd className="flex-1 whitespace-pre-wrap text-foreground">{value || "-"}</dd>
    </div>
  );
}
