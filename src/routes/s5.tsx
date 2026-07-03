import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, Lock, MessageSquare, ClipboardList } from "lucide-react";

import { useStoredSession, clearStoredSession } from "@/lib/local-session";
import { getSessionSnapshot } from "@/lib/session.functions";
import { getMyS5State, confirmMyS5Revised } from "@/lib/s5.functions";
import { Button } from "@/components/ui/button";
import { Nametag } from "@/components/school/Nametag";
import { TrafficLight } from "@/components/school/TrafficLight";
import { ChecklistPanel } from "@/components/s5/ChecklistPanel";
import { DeployedUrlCard } from "@/components/s5/DeployedUrlCard";
import { QaGivePanel } from "@/components/s5/QaGivePanel";
import { QaReceivedList } from "@/components/s5/QaReceivedList";
import { RevisedPromptBuilder } from "@/components/s5/RevisedPromptBuilder";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/s5")({
  component: S5Page,
});

type Tab = "check" | "qa" | "received" | "revised";

function S5Page() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { ready, session: stored } = useStoredSession({ requireRole: "participant" });

  const fetchSnapshot = useServerFn(getSessionSnapshot);
  const fetchState = useServerFn(getMyS5State);
  const confirm = useServerFn(confirmMyS5Revised);

  const [tab, setTab] = useState<Tab>("check");

  const { data: snap } = useQuery({
    queryKey: ["snapshot", stored?.userId],
    queryFn: () => fetchSnapshot({ data: { userId: stored!.userId } }),
    enabled: !!stored?.userId,
    refetchInterval: 10_000,
  });

  const stateKey = ["s5-state", stored?.userId];
  const { data: state } = useQuery({
    queryKey: stateKey,
    queryFn: () => fetchState({ data: { userId: stored!.userId } }),
    enabled: !!stored?.userId,
    refetchInterval: 15_000,
  });

  const confirmMut = useMutation({
    mutationFn: () => confirm({ data: { userId: stored!.userId } }),
    onSuccess: (res) => {
      if (!res.ok) return toast.error(res.error);
      toast.success("수정 프롬프트 확정 — S5 게이트를 통과했습니다.");
      qc.invalidateQueries({ queryKey: stateKey });
    },
  });

  if (!ready || !stored) return <div className="min-h-screen" />;
  if (snap && !snap.ok) {
    clearStoredSession();
    navigate({ to: "/" });
    return null;
  }

  const currentStage = snap?.ok ? snap.session.current_stage : 1;
  if (snap?.ok && currentStage < 5) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <Lock className="mx-auto mb-3 h-8 w-8 text-muted-foreground" aria-hidden />
        <h1 className="mb-2 font-display text-xl font-bold">5교시가 아직 열리지 않았습니다</h1>
        <p className="mb-4 text-sm text-muted-foreground">강사가 스테이지를 열면 진입할 수 있어요.</p>
        <Button asChild variant="outline"><Link to="/home">홈으로</Link></Button>
      </main>
    );
  }

  const s4Confirmed = state?.ok ? state.s4Confirmed : false;
  const allChecked = state?.ok ? state.allChecked : false;
  const revisedComplete = state?.ok ? state.revisedComplete : false;
  const confirmed = state?.ok ? state.confirmed : false;
  const qaGiven = state?.ok ? state.qaGivenCount > 0 : false;

  if (!s4Confirmed) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <Lock className="mx-auto mb-3 h-8 w-8 text-muted-foreground" aria-hidden />
        <h1 className="mb-2 font-display text-xl font-bold">S4 확정이 필요합니다</h1>
        <p className="mb-4 text-sm text-muted-foreground">
          4교시에서 첫 프롬프트를 확정한 뒤 S5를 진행할 수 있어요.
        </p>
        <Button asChild variant="outline"><Link to="/s4">S4로 이동</Link></Button>
      </main>
    );
  }

  const tabs: Array<{ id: Tab; label: string; enabled: boolean }> = [
    { id: "check", label: "1. 실행 체크", enabled: true },
    { id: "qa", label: "2. 교차 QA(주기)", enabled: true },
    { id: "received", label: "3. 받은 QA", enabled: true },
    { id: "revised", label: "4. 수정 프롬프트", enabled: allChecked },
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
              <p className="font-display text-sm font-bold text-primary">S5 · 5교시 — 교차 QA + 개선</p>
              <p className="text-xs text-muted-foreground">
                실행 체크 → 교차 QA → 받은 리뷰 → 수정 프롬프트 확정
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TrafficLight userId={stored.userId} />
            <Nametag nickname={stored.nickname} role="participant" />
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-4 py-5">
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
                {t.id === "qa" && qaGiven && <MessageSquare className="h-3 w-3" aria-hidden />}
                {t.id === "check" && allChecked && <ClipboardList className="h-3 w-3" aria-hidden />}
                {t.id === "revised" && confirmed && <CheckCircle2 className="h-3 w-3" aria-hidden />}
                {t.label}
              </button>
            );
          })}
        </div>

        {tab === "check" && <ChecklistPanel userId={stored.userId} locked={confirmed} />}
        {tab === "qa" && <QaGivePanel userId={stored.userId} />}
        {tab === "received" && (
          <div className="rounded-2xl border-2 border-primary/20 bg-card p-5 shadow-sm">
            <h3 className="mb-2 font-display text-lg font-bold text-primary">내가 받은 교차 QA</h3>
            <p className="mb-3 text-xs text-muted-foreground">
              동료의 관찰을 참고해 다음 탭에서 <b>수정 프롬프트</b>를 조립합니다.
            </p>
            <QaReceivedList userId={stored.userId} />
          </div>
        )}
        {tab === "revised" && (
          <RevisedPromptBuilder
            userId={stored.userId}
            onConfirmClick={() => confirmMut.mutate()}
            confirmDisabled={!allChecked || !revisedComplete || confirmed}
            confirmBusy={confirmMut.isPending}
            confirmLabel={confirmed ? "확정 완료" : "수정 프롬프트 확정"}
          />
        )}
      </section>
    </main>
  );
}
