import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, Lock, Send, Sparkles } from "lucide-react";

import { useStoredSession, clearStoredSession } from "@/lib/local-session";
import { getSessionSnapshot } from "@/lib/session.functions";
import {
  getMyPrdDraft,
  submitPrdV1,
  submitPrdV2,
} from "@/lib/s3.functions";
import { Button } from "@/components/ui/button";
import { Nametag } from "@/components/school/Nametag";
import { TrafficLight } from "@/components/school/TrafficLight";
import { PrdForm } from "@/components/s3/PrdForm";
import { GrillPanel } from "@/components/s3/GrillPanel";
import { ReviewGivePanel } from "@/components/s3/ReviewGivePanel";
import { ReviewReceivedList } from "@/components/s3/ReviewReceivedList";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/s3")({
  component: S3Page,
});

type Tab = "write" | "grill" | "review" | "final";

function S3Page() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { ready, session: stored } = useStoredSession({ requireRole: "participant" });

  const fetchSnapshot = useServerFn(getSessionSnapshot);
  const fetchDraft = useServerFn(getMyPrdDraft);
  const submitV1 = useServerFn(submitPrdV1);
  const submitV2 = useServerFn(submitPrdV2);

  const [tab, setTab] = useState<Tab>("write");

  const { data: snap } = useQuery({
    queryKey: ["snapshot", stored?.userId],
    queryFn: () => fetchSnapshot({ data: { userId: stored!.userId } }),
    enabled: !!stored?.userId,
    refetchInterval: 10_000,
  });

  const draftKey = ["s3-draft", stored?.userId];
  const { data: draft } = useQuery({
    queryKey: draftKey,
    queryFn: () => fetchDraft({ data: { userId: stored!.userId } }),
    enabled: !!stored?.userId,
    refetchInterval: 15_000,
  });

  const submitV1Mut = useMutation({
    mutationFn: () => submitV1({ data: { userId: stored!.userId } }),
    onSuccess: (res) => {
      if (!res.ok) return toast.error(res.error);
      toast.success("1차 제출 완료 — Grill Me가 열렸습니다.");
      qc.invalidateQueries({ queryKey: draftKey });
      setTab("grill");
    },
  });

  const submitV2Mut = useMutation({
    mutationFn: () => submitV2({ data: { userId: stored!.userId } }),
    onSuccess: (res) => {
      if (!res.ok) return toast.error(res.error);
      toast.success("2차 제출 완료 — S3 게이트를 통과했습니다.");
      qc.invalidateQueries({ queryKey: draftKey });
    },
  });

  if (!ready || !stored) return <div className="min-h-screen" />;

  if (snap && !snap.ok) {
    clearStoredSession();
    navigate({ to: "/" });
    return null;
  }

  const currentStage = snap?.ok ? snap.session.current_stage : 1;
  if (snap?.ok && currentStage < 3) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <Lock className="mx-auto mb-3 h-8 w-8 text-muted-foreground" aria-hidden />
        <h1 className="mb-2 font-display text-xl font-bold">3교시가 아직 열리지 않았습니다</h1>
        <p className="mb-4 text-sm text-muted-foreground">강사가 스테이지를 열면 진입할 수 있어요.</p>
        <Button asChild variant="outline"><Link to="/home">홈으로</Link></Button>
      </main>
    );
  }

  const v1 = !!draft?.ok && !!draft.submittedV1At;
  const v2 = !!draft?.ok && !!draft.submittedV2At;

  const tabs: Array<{ id: Tab; label: string; enabled: boolean }> = [
    { id: "write", label: "1. 작성", enabled: true },
    { id: "grill", label: "2. Grill Me", enabled: v1 },
    { id: "review", label: "3. 동료 리뷰", enabled: v1 },
    { id: "final", label: "4. 2차 제출", enabled: v1 },
  ];

  return (
    <main className="min-h-screen pb-24">
      <header className="border-b-2 border-primary/15 bg-card/60 backdrop-blur">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="h-9 w-9 p-0">
              <Link to="/home" aria-label="홈으로"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <div>
              <p className="font-display text-sm font-bold text-primary">S3 · 3교시 — PRD 작성·검증</p>
              <p className="text-xs text-muted-foreground">1차 제출 → Grill Me → 동료 리뷰 → 2차 제출</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TrafficLight userId={stored.userId} />
            <Nametag nickname={stored.nickname} role="participant" />
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-4 py-5">
        {/* 진행 상태 */}
        <div className="mb-4 flex flex-wrap gap-2">
          {tabs.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                disabled={!t.enabled}
                onClick={() => setTab(t.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-xs font-semibold transition-all",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : t.enabled
                      ? "border-primary/30 bg-card text-primary hover:bg-primary/5"
                      : "border-border/40 bg-muted text-muted-foreground opacity-60",
                )}
              >
                {t.id === "grill" && v1 && <Sparkles className="h-3 w-3" aria-hidden />}
                {t.id === "final" && v2 && <CheckCircle2 className="h-3 w-3" aria-hidden />}
                {t.label}
              </button>
            );
          })}
        </div>

        {tab === "write" && (
          <>
            <PrdForm userId={stored.userId} readOnly={v2} />
            <div className="mt-4 flex items-center justify-between rounded-2xl border-2 border-primary/20 bg-card p-4">
              <p className="text-sm text-muted-foreground">
                {v1 ? "1차 제출 완료 — Grill Me와 동료 리뷰가 열렸습니다." : "6개 섹션을 모두 채우면 1차 제출할 수 있어요."}
              </p>
              <Button
                disabled={v1 || submitV1Mut.isPending}
                onClick={() => submitV1Mut.mutate()}
              >
                <Send className="mr-1 h-4 w-4" aria-hidden />
                {v1 ? "1차 제출 완료" : "1차 제출"}
              </Button>
            </div>
          </>
        )}

        {tab === "grill" && (
          <GrillPanel userId={stored.userId} enabled={v1} />
        )}

        {tab === "review" && (
          <ReviewGivePanel userId={stored.userId} />
        )}

        {tab === "final" && (
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border-2 border-primary/20 bg-card p-5">
              <h3 className="mb-2 font-display text-lg font-bold text-primary">내가 받은 리뷰</h3>
              <p className="mb-3 text-xs text-muted-foreground">
                리뷰를 참고해 PRD를 다듬은 뒤 2차 제출해 주세요. "작성" 탭에서 수정할 수 있습니다.
              </p>
              <ReviewReceivedList userId={stored.userId} />
            </div>

            <div className="flex items-center justify-between rounded-2xl border-2 border-primary/30 bg-accent/30 p-4">
              <div>
                <p className="font-display text-sm font-bold text-primary">2차 제출</p>
                <p className="text-xs text-muted-foreground">
                  1차 제출 완료 + 받은 리뷰 1건 이상 있으면 S3 게이트가 통과됩니다.
                </p>
              </div>
              <Button
                disabled={!v1 || v2 || submitV2Mut.isPending}
                onClick={() => submitV2Mut.mutate()}
              >
                <CheckCircle2 className="mr-1 h-4 w-4" aria-hidden />
                {v2 ? "2차 제출 완료" : "2차 제출"}
              </Button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
