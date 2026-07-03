import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MessageSquare } from "lucide-react";

import { getS5QaReviewsForMe } from "@/lib/s5.functions";

export function QaReceivedList({ userId }: { userId: string }) {
  const fetchReviews = useServerFn(getS5QaReviewsForMe);
  const { data } = useQuery({
    queryKey: ["s5-qa-received", userId],
    queryFn: () => fetchReviews({ data: { userId } }),
    enabled: !!userId,
    refetchInterval: 15_000,
  });

  const reviews = data?.ok ? data.reviews : [];

  if (reviews.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 bg-muted/30 p-4 text-center text-sm text-muted-foreground">
        아직 받은 교차 QA 리뷰가 없습니다.
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {reviews.map((r) => (
        <li key={r.id} className="rounded-xl border-2 border-primary/15 bg-background p-3">
          <div className="mb-2 flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" aria-hidden />
            <span className="text-sm font-semibold text-primary">{r.reviewerNickname}</span>
            <span className="ml-auto text-[10px] text-muted-foreground">
              {new Date(r.submittedAt).toLocaleString("ko-KR")}
            </span>
          </div>
          <div className="grid gap-1.5 text-xs">
            <Row label="좋은 점" value={r.good} tone="good" />
            {r.issue && <Row label="문제" value={r.issue} tone="warn" />}
            {r.suggestion && <Row label="제안" value={r.suggestion} tone="info" />}
          </div>
        </li>
      ))}
    </ul>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "good" | "warn" | "info";
}) {
  const chip =
    tone === "good"
      ? "bg-emerald-100 text-emerald-800"
      : tone === "warn"
        ? "bg-amber-100 text-amber-800"
        : "bg-sky-100 text-sky-800";
  return (
    <div className="flex gap-2">
      <span className={`h-fit rounded-full px-2 py-0.5 text-[10px] font-bold ${chip}`}>{label}</span>
      <p className="flex-1 whitespace-pre-wrap text-foreground">{value}</p>
    </div>
  );
}
