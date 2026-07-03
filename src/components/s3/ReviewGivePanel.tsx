import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ClipboardCheck, ThumbsUp } from "lucide-react";

import {
  getMyReviewAssignment,
  getRevieweeDraft,
  submitReview,
} from "@/lib/s3.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const SECTION_LABEL: Array<[keyof PrdView, string]> = [
  ["problem", "문제"],
  ["users", "사용자"],
  ["features", "핵심 기능"],
  ["nonfunctional", "비기능"],
  ["success_metric", "성공 지표"],
  ["out_of_scope", "범위 밖"],
];

type PrdView = {
  problem: string;
  users: string;
  features: string;
  nonfunctional: string;
  success_metric: string;
  out_of_scope: string;
};

export function ReviewGivePanel({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const fetchAssign = useServerFn(getMyReviewAssignment);
  const fetchDraft = useServerFn(getRevieweeDraft);
  const submit = useServerFn(submitReview);

  const assignKey = ["s3-assign", userId];
  const { data: assign } = useQuery({
    queryKey: assignKey,
    queryFn: () => fetchAssign({ data: { userId } }),
    enabled: !!userId,
    refetchInterval: 10_000,
  });

  const revieweeId = assign?.ok && assign.status === "assigned" ? assign.revieweeId : null;
  const { data: draft } = useQuery({
    queryKey: ["s3-reviewee-draft", userId, revieweeId],
    queryFn: () => fetchDraft({ data: { userId, revieweeId: revieweeId! } }),
    enabled: !!revieweeId,
  });

  const [good, setGood] = useState("");
  const [question, setQuestion] = useState("");
  const [suggestion, setSuggestion] = useState("");

  useEffect(() => {
    if (assign?.ok && assign.status === "assigned" && assign.existing) {
      setGood(assign.existing.good);
      setQuestion(assign.existing.question ?? "");
      setSuggestion(assign.existing.suggestion ?? "");
    }
  }, [assign]);

  const submitMut = useMutation({
    mutationFn: () =>
      submit({
        data: {
          userId,
          revieweeId: revieweeId!,
          good,
          question,
          suggestion,
        },
      }),
    onSuccess: (res) => {
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("리뷰가 저장되었습니다.");
      qc.invalidateQueries({ queryKey: assignKey });
    },
    onError: () => toast.error("리뷰 저장에 실패했습니다."),
  });

  if (!assign?.ok) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-border/60 p-5 text-sm text-muted-foreground">
        불러오는 중…
      </div>
    );
  }

  if (assign.status === "need_v1") {
    return (
      <div className="rounded-2xl border-2 border-dashed border-border/60 bg-muted/30 p-5 text-center text-sm text-muted-foreground">
        먼저 내 PRD 1차 제출을 마쳐야 리뷰 짝이 배정됩니다.
      </div>
    );
  }

  if (assign.status === "waiting") {
    return (
      <div className="rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/40 p-5 text-center text-sm text-amber-900">
        {assign.message ?? "다른 참가자가 1차 제출을 마치면 배정됩니다."}
      </div>
    );
  }

  const goodLen = good.trim().length;
  const canSubmit = goodLen >= 5 && !submitMut.isPending;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border-2 border-primary/20 bg-card p-5 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-primary">
          <ClipboardCheck className="h-4 w-4" aria-hidden />
          <h3 className="font-display text-sm font-bold">
            리뷰 대상: <span className="text-foreground">{assign.revieweeNickname}</span>
          </h3>
        </div>
        {!draft?.ok ? (
          <p className="text-sm text-muted-foreground">
            {draft && !draft.ok ? draft.error : "PRD를 불러오는 중…"}
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {SECTION_LABEL.map(([key, label]) => (
              <div key={key} className="rounded-xl border border-border/60 bg-background/60 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-primary/70">{label}</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{draft.fields[key] || "—"}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl border-2 border-primary/20 bg-card p-5 shadow-sm">
        <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-bold text-primary">
          <ThumbsUp className="h-4 w-4" aria-hidden />
          동료 리뷰 작성
        </h3>

        <label className="mb-3 flex flex-col gap-1">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-semibold text-foreground">
              좋은 점 <span className="text-destructive">*</span>
            </span>
            <span className={cn("text-[11px]", goodLen >= 5 ? "text-emerald-600" : "text-muted-foreground")}>
              {goodLen}자 (5자 이상)
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            비어 있으면 제출할 수 없습니다. 구체적으로 무엇이 좋았는지 한두 문장.
          </p>
          <Textarea
            value={good}
            onChange={(e) => setGood(e.target.value.slice(0, 1000))}
            placeholder="예: 성공 지표를 학생 관찰 가능한 행동으로 정의한 점이 좋았다."
            rows={3}
          />
        </label>

        <label className="mb-3 flex flex-col gap-1">
          <span className="text-sm font-semibold text-foreground">궁금한 점 (질문)</span>
          <Textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value.slice(0, 1000))}
            placeholder="예: 오프라인 환경에서도 동작해야 하나요?"
            rows={2}
          />
        </label>

        <label className="mb-3 flex flex-col gap-1">
          <span className="text-sm font-semibold text-foreground">제안</span>
          <Textarea
            value={suggestion}
            onChange={(e) => setSuggestion(e.target.value.slice(0, 1000))}
            placeholder="예: 힌트 단계를 3단계 이하로 제한하면 좋겠어요."
            rows={2}
          />
        </label>

        <div className="flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground">
            {assign.existing ? "이미 제출한 리뷰를 수정할 수 있습니다." : "제출 후에도 수정할 수 있습니다."}
          </p>
          <Button size="sm" disabled={!canSubmit} onClick={() => submitMut.mutate()}>
            {assign.existing ? "리뷰 수정 제출" : "리뷰 제출"}
          </Button>
        </div>
      </div>
    </div>
  );
}
