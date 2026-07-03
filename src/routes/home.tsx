import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { LogOut, Award } from "lucide-react";

import { getSessionSnapshot } from "@/lib/session.functions";
import { clearStoredSession, useStoredSession } from "@/lib/local-session";
import { Nametag } from "@/components/school/Nametag";
import { STAGES, TimetableCard, type StageStatus } from "@/components/school/TimetableCard";
import { getMyS1State } from "@/lib/s1.functions";
import { getMyS2State } from "@/lib/s2.functions";
import { getMyS4State } from "@/lib/s4.functions";
import { getMyS6State } from "@/lib/s6.functions";
import { getMyCompletion } from "@/lib/s7.functions";
import { ParticipantSlideOverlay } from "@/components/school/SlideDeck";
import { TrafficLight } from "@/components/school/TrafficLight";
import { MorningStamp } from "@/components/school/MorningStamp";
import { CompletionStamp, type StampSet } from "@/components/s7/CompletionStamp";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/home")({
  component: ParticipantHome,
});

function ParticipantHome() {
  const navigate = useNavigate();
  const { ready, session: stored } = useStoredSession({ requireRole: "participant" });
  const fetchSnapshot = useServerFn(getSessionSnapshot);
  const fetchS1 = useServerFn(getMyS1State);
  const fetchS2 = useServerFn(getMyS2State);
  const fetchS4 = useServerFn(getMyS4State);
  const fetchS6 = useServerFn(getMyS6State);
  const fetchCompletion = useServerFn(getMyCompletion);

  const { data } = useQuery({
    queryKey: ["snapshot", stored?.userId],
    queryFn: () => fetchSnapshot({ data: { userId: stored!.userId } }),
    enabled: !!stored?.userId,
    refetchInterval: 5_000,
  });

  const { data: s1 } = useQuery({
    queryKey: ["s1-state", stored?.userId],
    queryFn: () => fetchS1({ data: { userId: stored!.userId } }),
    enabled: !!stored?.userId,
    refetchInterval: 15_000,
  });

  const { data: s2 } = useQuery({
    queryKey: ["s2-state", stored?.userId],
    queryFn: () => fetchS2({ data: { userId: stored!.userId } }),
    enabled: !!stored?.userId,
    refetchInterval: 15_000,
  });

  const { data: s4 } = useQuery({
    queryKey: ["s4-state", stored?.userId],
    queryFn: () => fetchS4({ data: { userId: stored!.userId } }),
    enabled: !!stored?.userId,
    refetchInterval: 15_000,
  });

  const { data: s6 } = useQuery({
    queryKey: ["s6-state", stored?.userId],
    queryFn: () => fetchS6({ data: { userId: stored!.userId } }),
    enabled: !!stored?.userId,
    refetchInterval: 15_000,
  });

  const { data: completion } = useQuery({
    queryKey: ["s7-completion", stored?.userId],
    queryFn: () => fetchCompletion({ data: { userId: stored!.userId } }),
    enabled: !!stored?.userId,
    refetchInterval: 20_000,
  });

  if (!ready || !stored) return <div className="min-h-screen" />;

  if (data && !data.ok) {
    clearStoredSession();
    navigate({ to: "/" });
    return null;
  }

  const currentStage = data?.ok ? data.session.current_stage : 1;
  const currentSlideIndex = data?.ok ? data.session.current_slide_index : null;
  const s2Passed = s2?.ok ? s2.passed : false;
  const s4Confirmed = s4?.ok ? s4.confirmed : false;
  const s5Confirmed = s6?.ok ? s6.s5Confirmed : false;
  const s1Checked = s1?.ok ? s1.checkedIds.length : 0;
  const s1Total = s1?.ok ? s1.checkpoints.length : 0;
  const morningEarned = s1Total > 0 && s1Checked >= s1Total && s2Passed;

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
  const c: CompletionOk | null =
    completion && (completion as { ok: boolean }).ok
      ? (completion as unknown as CompletionOk)
      : null;
  const sessionClosed = !!c?.session.closedAt;


  function handleLogout() {
    clearStoredSession();
    navigate({ to: "/" });
  }

  function statusFor(stageNo: number): StageStatus {
    // S3는 S2 미니 게이트(테스트 케이스 2건) 통과 전까지 강제로 잠금
    if (stageNo === 3 && !s2Passed) return "locked";
    // S5는 S4 게이트(PRD 프롬프트 확정) 통과 전까지 강제로 잠금
    if (stageNo === 5 && !s4Confirmed) return "locked";
    // S6는 S5 게이트(수정 PRD 프롬프트 확정) 통과 전까지 강제로 잠금
    if (stageNo === 6 && !s5Confirmed) return "locked";
    if (stageNo < currentStage) return "done";
    if (stageNo === currentStage) return "open";
    return "locked";
  }


  return (
    <main className="min-h-screen">
      {currentSlideIndex !== null && (
        <ParticipantSlideOverlay slideIndex={currentSlideIndex} />
      )}
      <header className="border-b-2 border-primary/15 bg-card/60 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="font-display text-sm font-bold text-primary">내 수업에 코딩 한 스푼</p>
            <p className="text-xs text-muted-foreground">
              {data?.ok ? data.session.name : "심화반 연수"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <TrafficLight userId={stored.userId} />
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
        {sessionClosed && (
          <div className="mb-4 rounded-2xl border-2 border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            강사가 연수를 종료했습니다. 산출물은 계속 열람할 수 있지만 편집은
            잠깁니다.
          </div>
        )}

        {c && (
          <div className="mb-6">
            <CompletionStamp
              stamps={c.stamps}
              stampCount={c.stampCount}
              retroSubmitted={c.retroSubmitted}
              allDone={c.allDone}
              nickname={c.nickname}
              sessionName={c.session.name}
              completedAt={c.completedAt}
              closedAt={c.session.closedAt}
            />
            <div className="mt-3 flex justify-end">
              <Button asChild variant="outline" size="sm">
                <Link to="/portfolio">
                  <Award className="mr-1 h-3.5 w-3.5" aria-hidden />
                  내 산출물 모아보기 · 회고 · 수료증
                </Link>
              </Button>
            </div>
          </div>
        )}

        <MorningStamp earned={morningEarned} className="mb-6" />




        <div className="mb-4">
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
                  if (s.no === 3 && !s2Passed) {
                    toast(`S2 게이트 미통과 — 테스트 케이스를 2개 이상 작성해야 열립니다.`);
                  } else if (s.no === 5 && !s4Confirmed) {
                    toast(`S4 게이트 미통과 — 4교시 PRD 프롬프트 확정 후 열립니다.`);
                  } else if (s.no === 6 && !s5Confirmed) {
                    toast(`S5 게이트 미통과 — 5교시 수정 PRD 프롬프트 확정 후 열립니다.`);
                  } else {
                    toast("아직 열리지 않았습니다.");
                  }
                } else if (s.no === 3) {
                  navigate({ to: "/s3" });
                } else if (s.no === 4) {
                  navigate({ to: "/s4" });
                } else if (s.no === 5) {
                  navigate({ to: "/s5" });
                } else if (s.no === 6) {
                  navigate({ to: "/s6" });
                }
              }}
            />
          ))}
        </div>
      </section>

    </main>
  );
}
