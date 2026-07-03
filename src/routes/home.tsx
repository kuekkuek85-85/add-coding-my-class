import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { LogOut } from "lucide-react";

import { getSessionSnapshot } from "@/lib/session.functions";
import { clearStoredSession, useStoredSession } from "@/lib/local-session";
import { Nametag } from "@/components/school/Nametag";
import { STAGES, TimetableCard, type StageStatus } from "@/components/school/TimetableCard";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/home")({
  component: ParticipantHome,
});

function ParticipantHome() {
  const navigate = useNavigate();
  const { ready, session: stored } = useStoredSession({ requireRole: "participant" });
  const fetchSnapshot = useServerFn(getSessionSnapshot);

  const { data } = useQuery({
    queryKey: ["snapshot", stored?.userId],
    queryFn: () => fetchSnapshot({ data: { userId: stored!.userId } }),
    enabled: !!stored?.userId,
    refetchInterval: 15_000,
  });

  if (!ready || !stored) return <div className="min-h-screen" />;

  if (data && !data.ok) {
    clearStoredSession();
    navigate({ to: "/" });
    return null;
  }

  const currentStage = data?.ok ? data.session.current_stage : 1;

  function handleLogout() {
    clearStoredSession();
    navigate({ to: "/" });
  }

  function statusFor(stageNo: number): StageStatus {
    if (stageNo < currentStage) return "done";
    if (stageNo === currentStage) return "open";
    return "locked";
  }

  return (
    <main className="min-h-screen">
      <header className="border-b-2 border-primary/15 bg-card/60 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div>
            <p className="font-display text-sm font-bold text-primary">내 수업에 코딩 한 스푼</p>
            <p className="text-xs text-muted-foreground">
              {data?.ok ? data.session.name : "심화반 연수"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Nametag nickname={stored.nickname} role="participant" />
            <Button
              size="sm"
              variant="ghost"
              onClick={handleLogout}
              aria-label="로그아웃"
              className="h-9 w-9 p-0"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 py-6">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold text-foreground">오늘의 시간표</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            게이트를 통과하면 다음 교시가 열립니다. 순서대로 하나씩.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {STAGES.map((s) => (
            <TimetableCard
              key={s.code}
              stage={s}
              status={statusFor(s.no)}
              onClick={() => {
                const st = statusFor(s.no);
                if (st === "locked") {
                  toast("아직 열리지 않았습니다.");
                } else {
                  toast(`${s.code} · ${s.title} — 준비 중입니다.`);
                }
              }}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
