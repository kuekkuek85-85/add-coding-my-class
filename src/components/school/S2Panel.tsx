import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { FlaskConical, ShieldCheck, ShieldAlert, Trash2, Plus } from "lucide-react";

import {
  addS2TestCase,
  deleteS2TestCase,
  getMyS2State,
} from "@/lib/s2.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/**
 * S2 미니 게이트: 참가자가 확장 기능을 구현하기 전에 테스트 케이스 2건 이상을 작성해야
 * S3(PRD 작성)로 넘어갈 수 있다. AI는 대신 작성하지 않는다 — 사람이 직접 입력한다.
 */
export function S2Panel({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const fetchState = useServerFn(getMyS2State);
  const addFn = useServerFn(addS2TestCase);
  const delFn = useServerFn(deleteS2TestCase);

  const stateKey = ["s2-state", userId];
  const { data } = useQuery({
    queryKey: stateKey,
    queryFn: () => fetchState({ data: { userId } }),
    enabled: !!userId,
    refetchInterval: 15_000,
  });

  const [title, setTitle] = useState("");
  const [givenWhen, setGivenWhen] = useState("");
  const [expectedThen, setExpectedThen] = useState("");

  const addMut = useMutation({
    mutationFn: () =>
      addFn({ data: { userId, title, givenWhen, expectedThen } }),
    onSuccess: (res) => {
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setTitle("");
      setGivenWhen("");
      setExpectedThen("");
      toast.success("테스트 케이스가 추가되었습니다.");
      queryClient.invalidateQueries({ queryKey: stateKey });
    },
    onError: () => toast.error("저장에 실패했습니다."),
  });

  const delMut = useMutation({
    mutationFn: (caseId: string) => delFn({ data: { userId, caseId } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: stateKey }),
  });

  if (!data || !data.ok) return null;

  const count = data.cases.length;
  const passed = data.passed;
  const min = data.min;
  const canSubmit =
    !!title.trim() && !!givenWhen.trim() && !!expectedThen.trim() && !addMut.isPending;

  return (
    <div className="rounded-2xl border-2 border-primary/25 bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary/70">
            S2 · 2교시 미니 게이트
          </p>
          <h2 className="font-display text-xl font-bold text-foreground">
            확장 기능 · 테스트 케이스 먼저 쓰기
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            구현에 들어가기 전에, 이 확장이 "성공했다"고 판단할 방법을 최소 {min}개 적어 두세요.
            AI는 이 문장을 대신 써주지 않습니다.
          </p>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold",
            passed
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground",
          )}
          aria-label={passed ? "게이트 통과" : "게이트 미통과"}
        >
          {passed ? (
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <ShieldAlert className="h-3.5 w-3.5" aria-hidden />
          )}
          {count} / {min} {passed ? "통과" : "필요"}
        </span>
      </div>

      {/* 입력 폼 */}
      <div className="grid grid-cols-1 gap-2 rounded-xl border border-border/70 bg-background/70 p-3">
        <label className="text-xs font-semibold text-muted-foreground">
          제목 (무엇을 확인하나요?)
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, 120))}
            placeholder="예: 3문장 이하 응답 규칙 지키기"
            className="mt-1 bg-card"
          />
        </label>
        <label className="text-xs font-semibold text-muted-foreground">
          상황 · 입력 (Given / When)
          <Textarea
            value={givenWhen}
            onChange={(e) => setGivenWhen(e.target.value.slice(0, 400))}
            placeholder="예: 학생이 '어제 배운 거 다시 알려줘' 라고 물었을 때"
            className="mt-1 min-h-[64px] bg-card"
          />
        </label>
        <label className="text-xs font-semibold text-muted-foreground">
          기대 결과 (Expected / Then)
          <Textarea
            value={expectedThen}
            onChange={(e) => setExpectedThen(e.target.value.slice(0, 400))}
            placeholder="예: 3문장 이내로 요약하고, 마지막에 확인 질문 1개를 덧붙인다"
            className="mt-1 min-h-[64px] bg-card"
          />
        </label>
        <div className="flex items-center justify-between pt-1">
          <p className="text-[11px] text-muted-foreground">
            세 항목 모두 입력해야 저장됩니다.
          </p>
          <Button size="sm" disabled={!canSubmit} onClick={() => addMut.mutate()}>
            <Plus className="mr-1 h-4 w-4" /> 테스트 케이스 추가
          </Button>
        </div>
      </div>

      {/* 목록 */}
      <ul className="mt-4 flex flex-col gap-2">
        {data.cases.length === 0 ? (
          <li className="rounded-xl border-2 border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
            아직 작성된 테스트 케이스가 없습니다. 위 폼에서 첫 번째를 추가하세요.
          </li>
        ) : (
          data.cases.map((c, i) => (
            <li
              key={c.id}
              className="group rounded-xl border-2 border-border/60 bg-background p-3"
            >
              <div className="mb-1 flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                    {i + 1}
                  </span>
                  <FlaskConical className="h-3.5 w-3.5 text-primary" aria-hidden />
                  <span className="font-display text-sm font-bold text-foreground">
                    {c.title}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => delMut.mutate(c.id)}
                  className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                  aria-label="테스트 케이스 삭제"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-1 gap-1 pl-8 text-xs sm:grid-cols-2">
                <p>
                  <span className="mr-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                    상황
                  </span>
                  <span className="whitespace-pre-wrap text-foreground">{c.given_when}</span>
                </p>
                <p>
                  <span className="mr-1 rounded bg-accent/40 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                    기대
                  </span>
                  <span className="whitespace-pre-wrap text-foreground">{c.expected_then}</span>
                </p>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
