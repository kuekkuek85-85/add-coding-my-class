import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle, Sparkles } from "lucide-react";

import { getSessionRetrospectives } from "@/lib/s7.functions";

export function RetrospectiveWall({ userId }: { userId: string }) {
  const fetchRetros = useServerFn(getSessionRetrospectives);
  const { data } = useQuery({
    queryKey: ["s7-retro-wall", userId],
    queryFn: () => fetchRetros({ data: { userId } }),
    refetchInterval: 10_000,
  });

  const entries = data?.ok ? data.entries : [];
  const submitted = entries.filter((e) => e.submittedAt);
  const pending = entries.filter((e) => !e.submittedAt);

  return (
    <div className="rounded-2xl border-2 border-primary/20 bg-card p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-primary" aria-hidden />
          <h2 className="font-display text-sm font-bold text-foreground">
            오늘의 회고 모음
          </h2>
        </div>
        <span className="text-xs text-muted-foreground">
          제출 {submitted.length} / 총 {entries.length}명
        </span>
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">참가자가 없습니다.</p>
      ) : (
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {submitted.map((e) => (
            <div
              key={e.userId}
              className="rounded-xl border-2 border-primary/15 bg-accent/20 p-3"
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="font-display text-sm font-bold text-primary">
                  {e.nickname}
                </span>
                {e.submittedAt && (
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(e.submittedAt).toLocaleTimeString("ko-KR")}
                  </span>
                )}
              </div>
              <p className="text-sm text-foreground">
                <Sparkles className="mr-1 inline h-3 w-3 text-primary" aria-hidden />
                {e.learned}
              </p>
              {e.nextTry && (
                <p className="mt-1 text-xs text-muted-foreground">
                  → 다음에: {e.nextTry}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {pending.length > 0 && (
        <div className="mt-3">
          <p className="mb-1 text-xs font-semibold text-muted-foreground">
            아직 회고 미제출
          </p>
          <div className="flex flex-wrap gap-1.5">
            {pending.map((p) => (
              <span
                key={p.userId}
                className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
              >
                {p.nickname}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
