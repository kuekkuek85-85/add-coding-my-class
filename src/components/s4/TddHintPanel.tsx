import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { RefreshCw, MessageCircleQuestion, Sparkles } from "lucide-react";

import { getTddHints } from "@/lib/s4.functions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TAG_LABEL: Record<string, string> = {
  missing_failure: "실패 케이스",
  missing_boundary: "경계값",
  missing_a11y: "접근성",
  missing_privacy: "개인정보",
  missing_offline: "오프라인",
  missing_edge: "엣지",
  ambiguity: "모호함",
};

export function TddHintPanel({
  userId,
  enabled,
}: {
  userId: string;
  enabled: boolean;
}) {
  const qc = useQueryClient();
  const fetchHints = useServerFn(getTddHints);
  const key = ["s4-hints", userId];

  const { data, isFetching, refetch } = useQuery({
    queryKey: key,
    queryFn: () => fetchHints({ data: { userId } }),
    enabled: false, // 수동 실행: 요청 시에만 AI 호출
    staleTime: 60_000,
  });

  if (!enabled) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-border/60 bg-muted/30 p-5 text-center">
        <Sparkles className="mx-auto mb-2 h-5 w-5 text-muted-foreground" aria-hidden />
        <p className="text-sm text-muted-foreground">
          완성된 테스트 케이스가 1개 이상 있어야 TDD 도우미가 열립니다.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border-2 border-amber-300/60 bg-amber-50/60 p-5 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-amber-900">
            <MessageCircleQuestion className="h-5 w-5" aria-hidden />
            <h3 className="font-display text-lg font-bold">TDD 도우미</h3>
          </div>
          <p className="mt-1 text-xs text-amber-900/80">
            AI는 <b>놓친 관점만 질문</b>합니다. Given/When/Then 문장을 대신 쓰지 않습니다.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            qc.setQueryData(key, undefined);
            refetch();
          }}
          disabled={isFetching}
        >
          <RefreshCw className={cn("mr-1 h-3.5 w-3.5", isFetching && "animate-spin")} aria-hidden />
          {data ? "다시 지적받기" : "지적받기"}
        </Button>
      </div>

      {isFetching && !data && (
        <p className="text-sm text-muted-foreground">AI가 테스트 케이스를 읽는 중…</p>
      )}
      {data && !data.ok && (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
          {data.error}
        </p>
      )}
      {data?.ok && (
        <ol className="flex flex-col gap-2">
          {data.hints.map((h, i) => (
            <li
              key={i}
              className="flex items-start gap-2 rounded-xl border border-amber-300/60 bg-white/70 p-3"
            >
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white">
                {i + 1}
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{h.q}</p>
                <span className="mt-1 inline-block rounded-full bg-amber-200/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900">
                  {TAG_LABEL[h.tag] ?? h.tag}
                </span>
              </div>
            </li>
          ))}
        </ol>
      )}
      {!data && !isFetching && (
        <p className="text-sm text-muted-foreground">
          "지적받기"를 눌러 AI에게 놓친 관점을 확인받으세요.
        </p>
      )}
    </div>
  );
}
