import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, CheckCircle2, Lock, Presentation, LayoutGrid, Mic } from "lucide-react";

import { useStoredSession, clearStoredSession } from "@/lib/local-session";
import { getSessionSnapshot } from "@/lib/session.functions";
import { getMyS6State } from "@/lib/s6.functions";
import { Button } from "@/components/ui/button";
import { Nametag } from "@/components/school/Nametag";
import { TrafficLight } from "@/components/school/TrafficLight";
import { GalleryGrid } from "@/components/s6/GalleryGrid";
import { SlideDraftEditor } from "@/components/s6/SlideDraftEditor";
import { PresentationStage } from "@/components/s6/PresentationStage";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/s6")({
  component: S6Page,
});

type Tab = "gallery" | "slides" | "stage";

function S6Page() {
  const navigate = useNavigate();
  const { ready, session: stored } = useStoredSession({ requireRole: "participant" });

  const fetchSnapshot = useServerFn(getSessionSnapshot);
  const fetchState = useServerFn(getMyS6State);

  const [tab, setTab] = useState<Tab>("gallery");

  const { data: snap } = useQuery({
    queryKey: ["snapshot", stored?.userId],
    queryFn: () => fetchSnapshot({ data: { userId: stored!.userId } }),
    enabled: !!stored?.userId,
    refetchInterval: 10_000,
  });

  const { data: state } = useQuery({
    queryKey: ["s6-state", stored?.userId],
    queryFn: () => fetchState({ data: { userId: stored!.userId } }),
    enabled: !!stored?.userId,
    refetchInterval: 15_000,
  });

  if (!ready || !stored) return <div className="min-h-screen" />;
  if (snap && !snap.ok) {
    clearStoredSession();
    navigate({ to: "/" });
    return null;
  }

  const currentStage = snap?.ok ? snap.session.current_stage : 1;
  if (snap?.ok && currentStage < 6) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <Lock className="mx-auto mb-3 h-8 w-8 text-muted-foreground" aria-hidden />
        <h1 className="mb-2 font-display text-xl font-bold">6교시가 아직 열리지 않았습니다</h1>
        <p className="mb-4 text-sm text-muted-foreground">강사가 스테이지를 열면 진입할 수 있어요.</p>
        <Button asChild variant="outline"><Link to="/home">홈으로</Link></Button>
      </main>
    );
  }

  const confirmed = state?.ok ? state.confirmed : false;


  const tabs: Array<{ id: Tab; label: string; icon: typeof LayoutGrid }> = [
    { id: "gallery", label: "1. 갤러리", icon: LayoutGrid },
    { id: "slides", label: "2. 내 발표 슬라이드", icon: Presentation },
    { id: "stage", label: "3. 발표 진행", icon: Mic },
  ];

  return (
    <main className="min-h-screen pb-24">
      <header className="border-b-2 border-primary/15 bg-card/60 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="h-9 w-9 p-0">
              <Link to="/home" aria-label="홈으로"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <div>
              <p className="font-display text-sm font-bold text-primary">S6 · 6교시 — 갤러리 발표</p>
              <p className="text-xs text-muted-foreground">
                갤러리 → 슬라이드 편집·확정 → 청중 코멘트
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TrafficLight userId={stored.userId} />
            <Nametag nickname={stored.nickname} role="participant" />
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 py-5">
        <div className="mb-4 flex flex-wrap gap-2">
          {tabs.map((t) => {
            const active = tab === t.id;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-xs font-semibold transition-all",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-primary/30 bg-card text-primary hover:bg-primary/5",
                )}
              >
                <Icon className="h-3 w-3" aria-hidden />
                {t.label}
                {t.id === "slides" && confirmed && (
                  <CheckCircle2 className="h-3 w-3" aria-hidden />
                )}
              </button>
            );
          })}
        </div>

        {tab === "gallery" && <GalleryGrid userId={stored.userId} />}
        {tab === "slides" && (
          <SlideDraftEditor userId={stored.userId} nickname={stored.nickname} />
        )}
        {tab === "stage" && <PresentationStage userId={stored.userId} />}
      </section>
    </main>
  );
}
