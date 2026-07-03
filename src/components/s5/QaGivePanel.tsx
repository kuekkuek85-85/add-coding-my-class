import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, ExternalLink, Send, UserRound } from "lucide-react";
import { toast } from "sonner";

import {
  getMyS5QaAssignment,
  getRevieweeS4Bundle,
  submitS5QaReview,
} from "@/lib/s5.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const STATUS_KO: Record<string, string> = { pass: "통과", partial: "부분", fail: "실패" };

export function QaGivePanel({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const fetchAssignment = useServerFn(getMyS5QaAssignment);
  const fetchBundle = useServerFn(getRevieweeS4Bundle);
  const submit = useServerFn(submitS5QaReview);

  const asnKey = ["s5-qa-assignment", userId];
  const { data: asn } = useQuery({
    queryKey: asnKey,
    queryFn: () => fetchAssignment({ data: { userId } }),
    enabled: !!userId,
    refetchInterval: 20_000,
  });

  const revieweeId = asn?.ok && asn.status === "assigned" ? asn.revieweeId : null;
  const { data: bundle } = useQuery({
    queryKey: ["s5-reviewee-bundle", userId, revieweeId],
    queryFn: () => fetchBundle({ data: { userId, revieweeId: revieweeId! } }),
    enabled: !!revieweeId,
  });

  const [good, setGood] = useState("");
  const [issue, setIssue] = useState("");
  const [suggestion, setSuggestion] = useState("");
  useEffect(() => {
    if (asn?.ok && asn.status === "assigned" && asn.existing) {
      setGood(asn.existing.good);
      setIssue(asn.existing.issue);
      setSuggestion(asn.existing.suggestion);
    }
  }, [asn]);

  const mut = useMutation({
    mutationFn: () =>
      submit({
        data: {
          userId,
          revieweeId: revieweeId!,
          good,
          issue,
          suggestion,
        },
      }),
    onSuccess: (res) => {
      if (!res.ok) return toast.error(res.error);
      toast.success("교차 QA 리뷰가 제출되었습니다.");
      qc.invalidateQueries({ queryKey: asnKey });
      qc.invalidateQueries({ queryKey: ["s5-state", userId] });
    },
  });

  if (!asn?.ok) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-border/70 bg-muted/30 p-6 text-center text-sm text-muted-foreground">
        배정을 불러오는 중…
      </div>
    );
  }
  if (asn.status === "need_s4") {
    return (
      <div className="rounded-2xl border-2 border-dashed border-border/70 bg-muted/30 p-6 text-center text-sm text-muted-foreground">
        S4에서 PRD 프롬프트를 확정해야 교차 QA가 배정됩니다.
      </div>
    );
  }
  if (asn.status === "waiting") {
    return (
      <div className="rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/60 p-6 text-center text-sm text-amber-900">
        {asn.message}
      </div>
    );
  }

  const already = !!asn.existing?.submitted_at;
  const canSubmit = good.trim().length >= 5;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border-2 border-primary/25 bg-accent/20 p-4">
        <div className="mb-1 flex items-center gap-2">
          <UserRound className="h-4 w-4 text-primary" aria-hidden />
          <p className="text-xs font-semibold uppercase tracking-widest text-primary/70">
            내가 QA 할 대상
          </p>
        </div>
        <p className="font-display text-lg font-bold text-primary">{asn.revieweeNickname}</p>
      </div>

      {bundle?.ok && (
        <div className="rounded-2xl border-2 border-primary/15 bg-card p-4 shadow-sm">
          <div className="mb-3 rounded-xl border-2 border-primary/25 bg-accent/15 p-3">
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-primary/70">
              대상자의 배포 앱 URL
            </p>
            {bundle.deployedUrl ? (
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={bundle.deployedUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="break-all text-sm font-semibold text-primary underline underline-offset-2"
                >
                  {bundle.deployedUrl}
                </a>
                <a
                  href={bundle.deployedUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1 rounded-full border-2 border-primary/40 bg-card px-2 py-0.5 text-[11px] font-semibold text-primary hover:bg-primary/5"
                >
                  <ExternalLink className="h-3 w-3" aria-hidden /> 새 창에서 열기
                </a>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                대상자가 아직 배포 URL을 등록하지 않았습니다. 등록될 때까지 프롬프트와 케이스 기준으로만 검토해 주세요.
              </p>
            )}
          </div>

          <h3 className="mb-2 font-display text-sm font-bold text-primary">대상자가 수정한 PRD 프롬프트</h3>
          {bundle.prompt.context?.trim() ? (
            <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-lg border border-border/40 bg-muted/30 p-2 text-xs leading-relaxed text-foreground">
{bundle.prompt.context}
            </pre>
          ) : (
            <p className="text-xs text-muted-foreground">아직 수정된 PRD가 없습니다.</p>
          )}

          <h3 className="mb-2 mt-4 font-display text-sm font-bold text-primary">
            대상자의 테스트 케이스와 실행 결과
          </h3>
          <ol className="flex flex-col gap-2">
            {bundle.cases.map((c, i) => (
              <li key={c.id} className="rounded-lg border border-border/50 bg-background p-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                    {i + 1}
                  </span>
                  <span className="font-semibold">{c.title}</span>
                  {c.result ? (
                    <span
                      className={cn(
                        "ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold",
                        c.result.status === "pass"
                          ? "bg-emerald-100 text-emerald-800"
                          : c.result.status === "partial"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-rose-100 text-rose-800",
                      )}
                    >
                      {STATUS_KO[c.result.status] ?? c.result.status}
                    </span>
                  ) : (
                    <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                      미기록
                    </span>
                  )}
                </div>
                <p className="mt-1 pl-7 text-foreground/80">
                  <b>주어진</b> {c.given} · <b>할 때</b> {c.when_step} · <b>그러면</b> {c.then_step}
                </p>
                {c.result?.note && (
                  <p className="mt-1 pl-7 text-muted-foreground">메모: {c.result.note}</p>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="rounded-2xl border-2 border-primary/25 bg-card p-4">
        <p className="mb-2 text-xs font-semibold text-primary">
          {already ? "리뷰 편집" : "새 교차 QA 리뷰"}
          <span className="ml-2 text-muted-foreground">
            · '좋은 점'은 필수(5자 이상)
          </span>
        </p>
        <div className="flex flex-col gap-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-primary">
              좋은 점 <span className="text-rose-600">*</span>
            </label>
            <Textarea
              rows={3}
              placeholder="예: 힌트 단계 규칙이 분명해서 대상자가 3분 이상 학생 관점에서 이해됩니다."
              value={good}
              maxLength={1500}
              onChange={(e) => setGood(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-primary">
              발견한 문제
            </label>
            <Textarea
              rows={3}
              placeholder="어떤 케이스에서 무엇이 어긋났는지 사실 위주로."
              value={issue}
              maxLength={1500}
              onChange={(e) => setIssue(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-primary">
              개선 제안
            </label>
            <Textarea
              rows={3}
              placeholder="지시적이지 않게 '무엇을 바꿔볼지'만 제안."
              value={suggestion}
              maxLength={1500}
              onChange={(e) => setSuggestion(e.target.value)}
            />
          </div>
          <div className="flex items-center justify-end gap-2">
            {already && (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                제출됨 — 저장 시 갱신
              </span>
            )}
            <Button size="sm" disabled={!canSubmit || mut.isPending} onClick={() => mut.mutate()}>
              <Send className="mr-1 h-4 w-4" aria-hidden />
              {already ? "리뷰 갱신" : "리뷰 제출"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

