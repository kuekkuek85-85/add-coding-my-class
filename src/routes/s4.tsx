import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, Lock, Sparkles } from "lucide-react";

import { useStoredSession, clearStoredSession } from "@/lib/local-session";
import { getSessionSnapshot } from "@/lib/session.functions";
import { getMyS4State, confirmMyS4Prompt } from "@/lib/s4.functions";
import { Button } from "@/components/ui/button";
import { Nametag } from "@/components/school/Nametag";
import { TrafficLight } from "@/components/school/TrafficLight";
import { PrdReadOnly } from "@/components/s4/PrdReadOnly";
import { TestCaseList } from "@/components/s4/TestCaseList";
import { TddHintPanel } from "@/components/s4/TddHintPanel";
import { FirstPromptBuilder } from "@/components/s4/FirstPromptBuilder";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/s4")({
  component: S4Page,
});

type Tab = "cases" | "hints" | "prompt";

function S4Page() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { ready, session: stored } = useStoredSession({ requireRole: "participant" });

  const fetchSnapshot = useServerFn(getSessionSnapshot);
  const fetchState = useServerFn(getMyS4State);
  const confirm = useServerFn(confirmMyS4Prompt);

  const [tab, setTab] = useState<Tab>("cases");

  const { data: snap } = useQuery({
    queryKey: ["snapshot", stored?.userId],
    queryFn: () => fetchSnapshot({ data: { userId: stored!.userId } }),
    enabled: !!stored?.userId,
    refetchInterval: 10_000,
  });

  const stateKey = ["s4-state", stored?.userId];
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
      toast.success("첫 프롬프트 확정 — S4 게이트를 통과했습니다.");
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
  if (snap?.ok && currentStage < 4) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <Lock className="mx-auto mb-3 h-8 w-8 text-muted-foreground" aria-hidden />
        <h1 className="mb-2 font-display text-xl font-bold">4교시가 아직 열리지 않았습니다</h1>
        <p className="mb-4 text-sm text-muted-foreground">강사가 스테이지를 열면 진입할 수 있어요.</p>
        <Button asChild variant="outline"><Link to="/home">홈으로</Link></Button>
      </main>
    );
  }

  const completeCases = state?.ok ? state.completeCases : 0;
  const canBuildPrompt = state?.ok ? state.canBuildPrompt : false;
  const confirmed = state?.ok ? state.confirmed : false;
  const prd = state?.ok ? state.prd : null;

  const tabs: Array<{ id: Tab; label: string; enabled: boolean }> = [
    { id: "cases", label: "1. 테스트 케이스", enabled: true },
    { id: "hints", label: "2. TDD 도우미", enabled: completeCases >= 1 },
    { id: "prompt", label: "3. 첫 프롬프트", enabled: canBuildPrompt },
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
              <p className="font-display text-sm font-bold text-primary">S4 · 4교시 — TDD + 첫 프롬프트</p>
              <p className="text-xs text-muted-foreground">테스트 케이스 3개 이상 → 첫 프롬프트 조립·확정</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TrafficLight userId={stored.userId} />
            <Nametag nickname={stored.nickname} role="participant" />
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-4 py-5">
        <div className="mb-4">
          <PrdReadOnly prd={prd} />
        </div>

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
                {t.id === "hints" && completeCases >= 1 && <Sparkles className="h-3 w-3" aria-hidden />}
                {t.id === "prompt" && confirmed && <CheckCircle2 className="h-3 w-3" aria-hidden />}
                {t.label}
              </button>
            );
          })}
        </div>

        {tab === "cases" && <TestCaseList userId={stored.userId} locked={confirmed} />}
        {tab === "hints" && <TddHintPanel userId={stored.userId} enabled={completeCases >= 1} />}
        {tab === "prompt" && (
          <FirstPromptBuilder
            userId={stored.userId}
            onConfirmClick={() => confirmMut.mutate()}
            confirmDisabled={!canBuildPrompt || confirmed}
            confirmBusy={confirmMut.isPending}
            confirmLabel={confirmed ? "확정 완료" : "첫 프롬프트 확정"}
          />
        )}
      </section>
    </main>
  );
}
