import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { LogOut, Users, KeyRound } from "lucide-react";

import { getSessionSnapshot, setCurrentStage } from "@/lib/session.functions";
import { getInstructorS1Summary } from "@/lib/s1.functions";
import { getInstructorS2Summary } from "@/lib/s2.functions";
import { clearStoredSession, useStoredSession } from "@/lib/local-session";
import { Nametag } from "@/components/school/Nametag";
import { STAGES, TimetableCard, type StageStatus } from "@/components/school/TimetableCard";
import { StageControls } from "@/components/school/StageControls";
import { ParticipantGrid } from "@/components/school/ParticipantGrid";
import { InstructorSlideDeck } from "@/components/school/SlideDeck";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/instructor")({
  component: InstructorHome,
});

function InstructorHome() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { ready, session: stored } = useStoredSession({ requireRole: "instructor" });
  const fetchSnapshot = useServerFn(getSessionSnapshot);
  const changeStage = useServerFn(setCurrentStage);
  const fetchS1 = useServerFn(getInstructorS1Summary);

  const snapshotKey = ["snapshot", stored?.userId];
  const s1Key = ["instructor-s1", stored?.userId];

  const { data } = useQuery({
    queryKey: snapshotKey,
    queryFn: () => fetchSnapshot({ data: { userId: stored!.userId } }),
    enabled: !!stored?.userId,
    refetchInterval: 5_000,
  });

  const { data: s1 } = useQuery({
    queryKey: s1Key,
    queryFn: () => fetchS1({ data: { userId: stored!.userId } }),
    enabled: !!stored?.userId,
    refetchInterval: 5_000,
  });

  const stageMutation = useMutation({
    mutationFn: (stageNo: number) =>
      changeStage({ data: { userId: stored!.userId, stageNo } }),
    onSuccess: (res, stageNo) => {
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`${stageNo}교시가 열렸습니다.`);
      queryClient.invalidateQueries({ queryKey: snapshotKey });
    },
    onError: () => toast.error("스테이지 변경에 실패했습니다."),
  });

  if (!ready || !stored) return <div className="min-h-screen" />;

  if (data && !data.ok) {
    clearStoredSession();
    navigate({ to: "/" });
    return null;
  }

  const participants = (data?.ok ? data.members : []).filter((m) => m.role === "participant");
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
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div>
            <p className="font-display text-sm font-bold text-primary">내 수업에 코딩 한 스푼 · 강사석</p>
            <p className="text-xs text-muted-foreground">
              {data?.ok ? data.session.name : "심화반 연수"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Nametag nickname={stored.nickname} role="instructor" />
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

      <section className="mx-auto max-w-6xl px-4 py-6">
        {/* 세션 정보 & 접속자 */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="chalkboard p-6 lg:col-span-2">
            <p className="mb-2 text-xs uppercase tracking-widest text-accent">참가자 입장 코드</p>
            <div className="flex items-baseline gap-3">
              <KeyRound className="h-6 w-6 text-accent" aria-hidden />
              {data?.ok ? (
                <span className="font-display text-4xl font-bold tracking-[0.2em] text-chalk sm:text-5xl">
                  {data.session.participant_code}
                </span>
              ) : (
                <span className="font-display text-2xl font-medium text-chalk/60">
                  불러오는 중…
                </span>
              )}
            </div>
            <p className="mt-3 text-sm text-chalk/80">
              참가자에게 이 코드를 안내하세요. 강사 코드는 별도로 보관합니다.
            </p>
          </div>

          <div className="rounded-2xl border-2 border-primary/20 bg-card p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-primary">
              <Users className="h-4 w-4" aria-hidden />
              <h2 className="font-display text-sm font-bold">
                접속 참가자 {participants.length}명
              </h2>
            </div>
            {participants.length === 0 ? (
              <p className="text-sm text-muted-foreground">아직 접속한 참가자가 없습니다.</p>
            ) : (
              <ul className="flex flex-wrap gap-1.5">
                {participants.map((p) => (
                  <li
                    key={p.id}
                    className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                  >
                    {p.nickname}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* 스테이지 개폐 컨트롤 */}
        <div className="mt-6">
          <StageControls
            currentStage={currentStage}
            maxStage={STAGES.length}
            busy={stageMutation.isPending}
            onChange={(next) => stageMutation.mutate(next)}
          />
        </div>

        {/* 강의 슬라이드 */}
        <div className="mt-6">
          <InstructorSlideDeck
            userId={stored.userId}
            currentSlideIndex={data?.ok ? data.session.current_slide_index : null}
            snapshotKey={snapshotKey}
          />
        </div>

        {/* 참가자 진행 그리드 */}
        <div className="mt-8">
          <div className="mb-3">
            <h2 className="font-display text-xl font-bold text-foreground">참가자 진행 현황</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              14명 × 6교시 그리드. 도장은 통과한 스테이지를 나타냅니다.
            </p>
          </div>
          <ParticipantGrid
            participants={participants}
            currentStage={currentStage}
            s1Progress={s1?.ok ? s1.progress : []}
            s1Total={s1?.ok ? s1.totalCheckpoints : 0}
          />
        </div>

        {/* 시간표(참고) */}
        <div className="mt-8">
          <h2 className="mb-3 font-display text-xl font-bold text-foreground">오늘의 시간표</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {STAGES.map((s) => (
              <TimetableCard key={s.code} stage={s} status={statusFor(s.no)} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

