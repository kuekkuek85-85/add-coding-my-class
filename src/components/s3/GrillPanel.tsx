import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { RefreshCw, MessageCircleQuestion, Sparkles } from "lucide-react";

import { getGrillQuestions } from "@/lib/s3.functions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TAG_LABEL: Record<string, string> = {
  problem: "문제",
  users: "사용자",
  features: "핵심 기능",
  nonfunctional: "비기능",
  success_metric: "성공 지표",
  out_of_scope: "범위 밖",
};

export function GrillPanel({ userId, enabled }: { userId: string; enabled: boolean }) {
  const qc = useQueryClient();
  const fetchGrill = useServerFn(getGrillQuestions);
  const key = ["s3-grill", userId];

  const { data, isFetching, refetch } = useQuery({
    queryKey: key,
    queryFn: () => fetchGrill({ data: { userId } }),
    enabled: enabled && !!userId,
    staleTime: 60_000,
  });

  if (!enabled) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-border/60 bg-muted/30 p-5 text-center">
        <Sparkles className="mx-auto mb-2 h-5 w-5 text-muted-foreground" aria-hidden />
        <p className="text-sm text-muted-foreground">1차 제출을 마치면 Grill Me 도우미가 열립니다.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border-2 border-amber-300/60 bg-amber-50/60 p-5 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-amber-900">
            <MessageCircleQuestion className="h-5 w-5" aria-hidden />
            <h3 className="font-display text-lg font-bold">Grill Me · AI 도우미</h3>
          </div>
          <p className="mt-1 text-xs text-amber-900/80">
            AI는 <b>질문만</b> 합니다. 답은 여러분이 PRD에 직접 채워 주세요.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            qc.setQueryData(key, undefined);
            fetchGrill({ data: { userId, force: true } }).then(() => refetch());
          }}
          disabled={isFetching}
        >
          <RefreshCw className={cn("mr-1 h-3.5 w-3.5", isFetching && "animate-spin")} aria-hidden />
          다시 질문
        </Button>
      </div>

      {isFetching && !data && (
        <p className="text-sm text-muted-foreground">AI가 PRD를 읽는 중…</p>
      )}
      {data && !data.ok && (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
          {data.error}
        </p>
      )}
      {data?.ok && (
        <ol className="flex flex-col gap-2">
          {data.questions.map((q, i) => (
            <li
              key={i}
              className="flex items-start gap-2 rounded-xl border border-amber-300/60 bg-white/70 p-3"
            >
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white">
                {i + 1}
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{q.q}</p>
                <span className="mt-1 inline-block rounded-full bg-amber-200/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900">
                  {TAG_LABEL[q.tag] ?? q.tag}
                </span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
