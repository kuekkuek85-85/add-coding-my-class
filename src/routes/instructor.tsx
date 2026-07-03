import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { LogOut, Users, KeyRound, CircleAlert, CircleX, CircleCheck, RotateCcw } from "lucide-react";

import { getSessionSnapshot, setCurrentStage, resetSessionData } from "@/lib/session.functions";
import { getInstructorS1Summary } from "@/lib/s1.functions";
import { getInstructorS2Summary } from "@/lib/s2.functions";
import { getSessionS3Overview } from "@/lib/s3.functions";
import { getSessionS4Overview } from "@/lib/s4.functions";
import { getSessionS5Overview } from "@/lib/s5.functions";
import { getSessionS6Overview } from "@/lib/s6.functions";
import { listSessionHelpSignals } from "@/lib/help.functions";
import { clearStoredSession, useStoredSession } from "@/lib/local-session";
import { Nametag } from "@/components/school/Nametag";
import { STAGES, TimetableCard, type StageStatus } from "@/components/school/TimetableCard";
import { StageControls } from "@/components/school/StageControls";
import { ParticipantGrid } from "@/components/school/ParticipantGrid";
import { InstructorSlideDeck } from "@/components/school/SlideDeck";
import { PresenterQueueAdmin } from "@/components/s6/PresenterQueueAdmin";
import { RetrospectiveWall } from "@/components/s7/RetrospectiveWall";
import { SessionCloseControl } from "@/components/s7/SessionCloseControl";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

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
  const fetchS2 = useServerFn(getInstructorS2Summary);
  const fetchS3 = useServerFn(getSessionS3Overview);
  const fetchS4 = useServerFn(getSessionS4Overview);
  const fetchS5 = useServerFn(getSessionS5Overview);
  const fetchS6 = useServerFn(getSessionS6Overview);
  const fetchHelp = useServerFn(listSessionHelpSignals);

  const snapshotKey = ["snapshot", stored?.userId];
  const s1Key = ["instructor-s1", stored?.userId];
  const s2Key = ["instructor-s2", stored?.userId];
  const s3Key = ["instructor-s3", stored?.userId];
  const s4Key = ["instructor-s4", stored?.userId];
  const s5Key = ["instructor-s5", stored?.userId];
  const s6Key = ["instructor-s6", stored?.userId];
  const helpKey = ["instructor-help", stored?.userId];

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

  const { data: s2 } = useQuery({
    queryKey: s2Key,
    queryFn: () => fetchS2({ data: { userId: stored!.userId } }),
    enabled: !!stored?.userId,
    refetchInterval: 5_000,
  });

  const { data: s3 } = useQuery({
    queryKey: s3Key,
    queryFn: () => fetchS3({ data: { userId: stored!.userId } }),
    enabled: !!stored?.userId,
    refetchInterval: 15_000,
  });

  const { data: s4 } = useQuery({
    queryKey: s4Key,
    queryFn: () => fetchS4({ data: { userId: stored!.userId } }),
    enabled: !!stored?.userId,
    refetchInterval: 15_000,
  });

  const { data: s5 } = useQuery({
    queryKey: s5Key,
    queryFn: () => fetchS5({ data: { userId: stored!.userId } }),
    enabled: !!stored?.userId,
    refetchInterval: 15_000,
  });

  const { data: s6 } = useQuery({
    queryKey: s6Key,
    queryFn: () => fetchS6({ data: { userId: stored!.userId } }),
    enabled: !!stored?.userId,
    refetchInterval: 10_000,
  });



  const { data: help } = useQuery({
    queryKey: helpKey,
    queryFn: () => fetchHelp({ data: { userId: stored!.userId } }),
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

  const resetFn = useServerFn(resetSessionData);
  const resetMutation = useMutation({
    mutationFn: () => resetFn({ data: { userId: stored!.userId } }),
    onSuccess: (res) => {
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("세션 데이터가 초기화되었습니다.");
      queryClient.invalidateQueries();
    },
    onError: () => toast.error("초기화에 실패했습니다."),
  });

  if (!ready || !stored) return <div className="min-h-screen" />;

  if (data && !data.ok) {
    clearStoredSession();
    navigate({ to: "/" });
    return null;
  }

  const participants = (data?.ok ? data.members : []).filter((m) => m.role === "participant");
  const currentStage = data?.ok ? data.session.current_stage : 1;

  const s2Progress = s2?.ok ? s2.progress : [];
  const s2Min = s2?.ok ? s2.min : 2;


  const helpSignals = help?.ok ? help.signals : [];
  const helpMap = new Map(helpSignals.map((h) => [h.userId, h]));
  const activeHelp = helpSignals
    .filter((h) => h.level !== "green")
    .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""))
    .slice(0, 5);

  const s1Progress = s1?.ok ? s1.progress : [];
  const s1Total = s1?.ok ? s1.totalCheckpoints : 0;
  const morningEarnedMap = new Map<string, boolean>();
  for (const p of participants) {
    const cp = s1Progress.find((x) => x.userId === p.id);
    const sp = s2Progress.find((x) => x.userId === p.id);
    const done = s1Total > 0 && (cp?.checked ?? 0) >= s1Total && !!sp?.passed;
    morningEarnedMap.set(p.id, done);
  }


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
        {/* 오늘의 시간표 */}
        <div className="mt-6">
          <h2 className="mb-3 font-display text-xl font-bold text-foreground">오늘의 시간표</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {STAGES.map((s) => (
              <TimetableCard key={s.code} stage={s} status={statusFor(s.no)} />
            ))}
          </div>
        </div>

        {/* 도움 요청 스트림 */}
        <div className="mt-6">
          <HelpStream signals={activeHelp} total={participants.length} />
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
            instructorUserId={stored.userId}
            participants={participants}
            currentStage={currentStage}
            s1Progress={s1Progress}
            s1Total={s1Total}
            s2Progress={s2Progress}
            s2Min={s2Min}
            s3Progress={s3?.ok ? s3.progress : []}
            s4Progress={s4?.ok ? s4.progress : []}
            s5Progress={s5?.ok ? s5.progress : []}
            s6Progress={s6?.ok ? s6.progress : []}
            helpMap={helpMap}
            morningEarnedMap={morningEarnedMap}
          />
        </div>

        {/* S6 발표 진행 (6교시일 때만 노출) */}
        {currentStage >= 6 && (
          <div className="mt-6">
            <PresenterQueueAdmin userId={stored.userId} />
          </div>
        )}

        {/* 오늘의 회고 모음 + 연수 마무리 (S6 이후 언제든 확인 가능) */}
        {currentStage >= 6 && (
          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <RetrospectiveWall userId={stored.userId} />
            <SessionCloseControl userId={stored.userId} />
          </div>
        )}
      </section>
    </main>
  );
}

type HelpRow = {
  userId: string;
  nickname: string;
  level: "green" | "yellow" | "red";
  note: string | null;
  updatedAt: string | null;
};

function HelpStream({ signals, total }: { signals: HelpRow[]; total: number }) {
  const empty = signals.length === 0;
  return (
    <div
      className={cn(
        "rounded-2xl border-2 p-4 shadow-sm",
        empty
          ? "border-emerald-500/30 bg-emerald-50/60"
          : "border-amber-500/40 bg-amber-50/70",
      )}
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 font-display text-sm font-bold text-primary">
          {empty ? (
            <CircleCheck className="h-4 w-4 text-emerald-600" aria-hidden />
          ) : (
            <CircleAlert className="h-4 w-4 text-amber-600" aria-hidden />
          )}
          도움 요청 (신호등)
        </div>
        <span className="text-xs text-muted-foreground">
          {empty ? `${total}명 모두 초록` : `최근 ${signals.length}건`}
        </span>
      </div>
      {empty ? (
        <p className="text-sm text-muted-foreground">
          현재 노랑·빨강 신호가 없습니다.
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {signals.map((s) => {
            const isRed = s.level === "red";
            const Icon = isRed ? CircleX : CircleAlert;
            return (
              <li
                key={s.userId}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm",
                  isRed
                    ? "border-rose-300 bg-rose-100/70 text-rose-950"
                    : "border-amber-300 bg-amber-100/70 text-amber-950",
                )}
              >
                <Icon
                  className={cn("h-4 w-4", isRed ? "text-rose-600" : "text-amber-600")}
                  aria-hidden
                />
                <span className="font-semibold">{s.nickname}</span>
                <span className="text-xs opacity-70">
                  {isRed ? "막혔어요" : "잠깐 봐주세요"}
                </span>
                {s.note && <span className="ml-auto truncate text-xs">{s.note}</span>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}


