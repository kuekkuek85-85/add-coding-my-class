import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Inbox, ThumbsUp } from "lucide-react";

import { getReviewsForMe } from "@/lib/s3.functions";

export function ReviewReceivedList({ userId }: { userId: string }) {
  const fetchReviews = useServerFn(getReviewsForMe);
  const { data } = useQuery({
    queryKey: ["s3-reviews-received", userId],
    queryFn: () => fetchReviews({ data: { userId } }),
    enabled: !!userId,
    refetchInterval: 15_000,
  });

  if (!data || !data.ok) return null;
  if (data.reviews.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-border/60 bg-muted/30 p-5 text-center text-sm text-muted-foreground">
        <Inbox className="mx-auto mb-2 h-5 w-5" aria-hidden />
        아직 받은 리뷰가 없습니다.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {data.reviews.map((r) => (
        <article key={r.id} className="rounded-2xl border-2 border-primary/15 bg-card p-4 shadow-sm">
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              {r.reviewerNickname}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {new Date(r.submittedAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
          <div className="mb-2 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3">
            <p className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-emerald-800">
              <ThumbsUp className="h-3 w-3" aria-hidden />
              좋은 점
            </p>
            <p className="whitespace-pre-wrap text-sm text-foreground">{r.good}</p>
          </div>
          {r.question && (
            <div className="mb-2 rounded-xl border border-amber-200 bg-amber-50/70 p-3">
              <p className="mb-1 text-[11px] font-semibold text-amber-800">궁금한 점</p>
              <p className="whitespace-pre-wrap text-sm text-foreground">{r.question}</p>
            </div>
          )}
          {r.suggestion && (
            <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-3">
              <p className="mb-1 text-[11px] font-semibold text-sky-800">제안</p>
              <p className="whitespace-pre-wrap text-sm text-foreground">{r.suggestion}</p>
            </div>
          )}
        </article>
      ))}
    </div>
  );
}
