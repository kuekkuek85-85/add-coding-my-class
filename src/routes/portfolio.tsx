import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";

import { useStoredSession, clearStoredSession } from "@/lib/local-session";
import { getMyPortfolio, getMyCompletion } from "@/lib/s7.functions";
import { getSessionSnapshot } from "@/lib/session.functions";
import { Button } from "@/components/ui/button";
import { Nametag } from "@/components/school/Nametag";
import { PortfolioSummary, type PortfolioLike } from "@/components/s7/PortfolioSummary";
import { RetrospectiveForm } from "@/components/s7/RetrospectiveForm";
import { CompletionStamp, type StampSet } from "@/components/s7/CompletionStamp";
import { CertificateCard } from "@/components/s7/CertificateCard";

type CompletionOk = {
  ok: true;
  session: { name: string; closedAt: string | null };
  nickname: string;
  stamps: StampSet;
  stampCount: number;
  retroSubmitted: boolean;
  allDone: boolean;
  completedAt: string | null;
};

export const Route = createFileRoute("/portfolio")({
  component: PortfolioPage,
  head: () => ({
    meta: [
      { title: "내 산출물 모아보기 · 코딩 한 스푼 심화반" },
      {
        name: "description",
        content: "심화반 연수에서 남긴 PRD, 프롬프트, 실행 체크, 슬라이드, 회고를 한 화면에서 봅니다.",
      },
    ],
  }),
});

function PortfolioPage() {
  const navigate = useNavigate();
  const { ready, session: stored } = useStoredSession({ requireRole: "participant" });

  const fetchSnapshot = useServerFn(getSessionSnapshot);
  const fetchPortfolio = useServerFn(getMyPortfolio);
  const fetchCompletion = useServerFn(getMyCompletion);

  const { data: snap } = useQuery({
    queryKey: ["snapshot", stored?.userId],
    queryFn: () => fetchSnapshot({ data: { userId: stored!.userId } }),
    enabled: !!stored?.userId,
    refetchInterval: 15_000,
  });

  const { data: portfolio } = useQuery({
    queryKey: ["s7-portfolio", stored?.userId],
    queryFn: () => fetchPortfolio({ data: { userId: stored!.userId } }),
    enabled: !!stored?.userId,
    refetchInterval: 20_000,
  });

  const { data: completion } = useQuery({
    queryKey: ["s7-completion", stored?.userId],
    queryFn: () => fetchCompletion({ data: { userId: stored!.userId } }),
    enabled: !!stored?.userId,
    refetchInterval: 20_000,
  });

  if (!ready || !stored) return <div className="min-h-screen" />;
  if (snap && !snap.ok) {
    clearStoredSession();
    navigate({ to: "/" });
    return null;
  }

  const p: PortfolioLike | null =
    portfolio && (portfolio as { ok: boolean }).ok
      ? (portfolio as unknown as PortfolioLike)
      : null;
  const c: CompletionOk | null =
    completion && (completion as { ok: boolean }).ok
      ? (completion as unknown as CompletionOk)
      : null;

  return (
    <main className="min-h-screen pb-24">
      <header className="border-b-2 border-primary/15 bg-card/60 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="h-9 w-9 p-0">
              <Link to="/home" aria-label="홈으로">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <p className="font-display text-sm font-bold text-primary">
                내 산출물 모아보기
              </p>
              <p className="text-xs text-muted-foreground">
                {snap?.ok ? snap.session.name : "심화반 연수"}
              </p>
            </div>
          </div>
          <Nametag nickname={stored.nickname} role="participant" />
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 py-6">
        {c && (
          <CompletionStamp
            className="mb-5 print:hidden"
            stamps={c.stamps}
            stampCount={c.stampCount}
            retroSubmitted={c.retroSubmitted}
            allDone={c.allDone}
            nickname={c.nickname}
            sessionName={c.session.name}
            completedAt={c.completedAt}
            closedAt={c.session.closedAt}
          />
        )}

        <div className="mb-5 print:hidden">
          <RetrospectiveForm userId={stored.userId} />
        </div>

        {c && (
          <div className="mb-5">
            <CertificateCard
              nickname={c.nickname}
              sessionName={c.session.name}
              stamps={{ s1: true, s2: true, s3: true, s4: true, s5: true, s6: true }}
              completedAt={c.completedAt ?? new Date().toISOString()}
              allDone={true}
            />
          </div>
        )}

        <div className="print:hidden">
          <h2 className="mb-3 font-display text-lg font-bold text-foreground">
            내 여정 요약
          </h2>
          {p ? (
            <PortfolioSummary portfolio={p} />
          ) : (
            <p className="text-sm text-muted-foreground">불러오는 중…</p>
          )}
        </div>
      </section>
    </main>
  );
}
