import { useState } from "react";
import { Stamp, CircleDot, Lock, StickyNote, ShieldCheck, ShieldAlert, CircleAlert, CircleX, FileCheck2, MessagesSquare, Mic, Presentation } from "lucide-react";
import { cn } from "@/lib/utils";
import { STAGES } from "./TimetableCard";
import { ParticipantDetailDialog } from "./ParticipantDetailDialog";

export type S1Progress = {
  userId: string;
  checked: number;
  memoCount: number;
};

export type S2Progress = {
  userId: string;
  cases: number;
  passed: boolean;
};

export type S3Progress = {
  userId: string;
  v1: boolean;
  v2: boolean;
  reviewGiven: boolean;
  reviewReceived: number;
};

export type S4Progress = {
  userId: string;
  completeCases: number;
  promptFilled: boolean;
  confirmed: boolean;
};

export type S5Progress = {
  userId: string;
  totalCases: number;
  checkedCases: number;
  qaGiven: boolean;
  qaReceived: number;
  revisedFilled: boolean;
  confirmed: boolean;
};

export type S6Progress = {
  userId: string;
  slidesConfirmed: boolean;
  slidesFilled: boolean;
  queueState: "waiting" | "current" | "done" | null;
  orderIndex: number | null;
  commentsReceived: number;
};

export type HelpRow = {
  userId: string;
  level: "green" | "yellow" | "red";
  note: string | null;
};

/**
 * 강사 대시보드: 참가자 × 6교시 그리드.
 * S1 셀은 체크포인트 통과 개수(N/M)를, 오전 메모 개수를 사이드에 표시한다.
 * 이름 왼쪽에 신호등 뱃지, 오른쪽에 오전 완료 도장.
 */
export function ParticipantGrid({
  instructorUserId,
  participants,
  currentStage,
  s1Progress,
  s1Total,
  s2Progress,
  s2Min,
  s3Progress,
  s4Progress,
  s5Progress,
  s6Progress,
  helpMap,
  morningEarnedMap,
}: {
  instructorUserId: string;
  participants: Array<{ id: string; nickname: string }>;
  currentStage: number;
  s1Progress?: S1Progress[];
  s1Total?: number;
  s2Progress?: S2Progress[];
  s2Min?: number;
  s3Progress?: S3Progress[];
  s4Progress?: S4Progress[];
  s5Progress?: S5Progress[];
  s6Progress?: S6Progress[];
  helpMap?: Map<string, HelpRow>;
  morningEarnedMap?: Map<string, boolean>;
}) {
  const [detail, setDetail] = useState<{
    userId: string;
    nickname: string;
    stageNo: number;
  } | null>(null);
  if (participants.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-border/70 p-8 text-center">
        <p className="text-sm text-muted-foreground">
          아직 접속한 참가자가 없습니다. 참가자가 입장하면 여기에 표시됩니다.
        </p>
      </div>
    );
  }

  const progressMap = new Map<string, S1Progress>();
  for (const p of s1Progress ?? []) progressMap.set(p.userId, p);
  const total = s1Total ?? 0;

  const s2Map = new Map<string, S2Progress>();
  for (const p of s2Progress ?? []) s2Map.set(p.userId, p);
  const s2Threshold = s2Min ?? 2;

  const s3Map = new Map<string, S3Progress>();
  for (const p of s3Progress ?? []) s3Map.set(p.userId, p);

  const s4Map = new Map<string, S4Progress>();
  for (const p of s4Progress ?? []) s4Map.set(p.userId, p);

  const s5Map = new Map<string, S5Progress>();
  for (const p of s5Progress ?? []) s5Map.set(p.userId, p);

  const s6Map = new Map<string, S6Progress>();
  for (const p of s6Progress ?? []) s6Map.set(p.userId, p);




  return (
    <div className="overflow-x-auto rounded-2xl border-2 border-primary/15 bg-card">
      <table className="w-full min-w-[620px] text-sm">
        <thead>
          <tr className="border-b border-border/70 bg-muted/40 text-xs">
            <th className="px-3 py-2 text-left font-semibold text-muted-foreground">
              참가 교사
            </th>
            <th className="px-2 py-2 text-center font-semibold text-muted-foreground">
              메모
            </th>
            {STAGES.map((s) => (
              <th
                key={s.code}
                className="px-2 py-2 text-center font-semibold text-muted-foreground"
                title={s.title}
              >
                {s.code}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {participants.map((p) => {
            const pr = progressMap.get(p.id);
            const s2 = s2Map.get(p.id);
            const help = helpMap?.get(p.id);
            const morning = morningEarnedMap?.get(p.id) ?? false;
            const helpLevel: "green" | "yellow" | "red" = help?.level ?? "green";
            const helpDot =
              helpLevel === "red"
                ? "bg-rose-500"
                : helpLevel === "yellow"
                  ? "bg-amber-400"
                  : "bg-emerald-500";
            const HelpIcon =
              helpLevel === "red" ? CircleX : helpLevel === "yellow" ? CircleAlert : null;
            return (
              <tr key={p.id} className="border-b border-border/40 last:border-0">
                <td className="px-3 py-2.5 font-medium text-foreground">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn("inline-block h-2.5 w-2.5 shrink-0 rounded-full", helpDot)}
                      aria-label={`신호등 ${helpLevel}`}
                      title={help?.note ?? undefined}
                    />
                    {HelpIcon && (
                      <HelpIcon
                        className={cn(
                          "h-3.5 w-3.5",
                          helpLevel === "red" ? "text-rose-600" : "text-amber-600",
                        )}
                        aria-hidden
                      />
                    )}
                    <span>{p.nickname}</span>
                    {morning && (
                      <span
                        className="inline-flex items-center gap-0.5 rounded-full border border-primary/40 bg-accent/40 px-1.5 py-0.5 text-[10px] font-bold text-primary"
                        title="중간 도장 완료"
                      >
                        <Stamp className="h-3 w-3" aria-hidden />
                      </span>
                    )}
                  </div>
                </td>

                <td className="px-2 py-2 text-center">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs",
                      (pr?.memoCount ?? 0) > 0
                        ? "bg-accent/40 text-primary"
                        : "bg-muted text-muted-foreground",
                    )}
                    aria-label={`S1 메모 ${pr?.memoCount ?? 0}건`}
                  >
                    <StickyNote className="h-3 w-3" aria-hidden />
                    {pr?.memoCount ?? 0}
                  </span>
                </td>
                {STAGES.map((s) => {
                  const st: "done" | "open" | "locked" =
                    s.no < currentStage ? "done" : s.no === currentStage ? "open" : "locked";
                  const showS1Count = s.no === 1 && total > 0 && st !== "locked";
                  const showS2Gate = s.no === 2 && st !== "locked";
                  const s3 = s3Map.get(p.id);
                  const showS3 = s.no === 3 && (st !== "locked" || s3?.v1 || s3?.v2);
                  const s4 = s4Map.get(p.id);
                  const showS4 = s.no === 4 && (st !== "locked" || (s4?.completeCases ?? 0) > 0 || s4?.confirmed);
                  const s5 = s5Map.get(p.id);
                  const showS5 =
                    s.no === 5 &&
                    (st !== "locked" || (s5?.checkedCases ?? 0) > 0 || s5?.confirmed || s5?.qaGiven);
                  const s6 = s6Map.get(p.id);
                  const showS6 =
                    s.no === 6 &&
                    (st !== "locked" || s6?.slidesConfirmed || s6?.slidesFilled || !!s6?.queueState);
                  return (
                    <td key={s.code} className="px-2 py-2 text-center">
                      {showS1Count ? (
                        <S1Cell checked={pr?.checked ?? 0} total={total} status={st} />
                      ) : showS2Gate ? (
                        <S2Cell
                          cases={s2?.cases ?? 0}
                          min={s2Threshold}
                          passed={s2?.passed ?? false}
                        />
                      ) : showS3 ? (
                        <S3Cell
                          v1={!!s3?.v1}
                          v2={!!s3?.v2}
                          reviewGiven={!!s3?.reviewGiven}
                          reviewReceived={s3?.reviewReceived ?? 0}
                          status={st}
                        />
                      ) : showS4 ? (
                        <S4Cell
                          completeCases={s4?.completeCases ?? 0}
                          promptFilled={!!s4?.promptFilled}
                          confirmed={!!s4?.confirmed}
                          status={st}
                        />
                      ) : showS5 ? (
                        <S5Cell
                          totalCases={s5?.totalCases ?? 0}
                          checkedCases={s5?.checkedCases ?? 0}
                          qaGiven={!!s5?.qaGiven}
                          revisedFilled={!!s5?.revisedFilled}
                          confirmed={!!s5?.confirmed}
                          status={st}
                        />
                      ) : showS6 ? (
                        <S6Cell
                          slidesConfirmed={!!s6?.slidesConfirmed}
                          slidesFilled={!!s6?.slidesFilled}
                          queueState={s6?.queueState ?? null}
                          commentsReceived={s6?.commentsReceived ?? 0}
                          status={st}
                        />
                      ) : (
                        <StageCell status={st} />
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function S1Cell({
  checked,
  total,
  status,
}: {
  checked: number;
  total: number;
  status: "done" | "open" | "locked";
}) {
  const complete = checked >= total && total > 0;
  return (
    <span
      className={cn(
        "inline-flex min-w-[46px] items-center justify-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
        complete
          ? "bg-primary text-primary-foreground"
          : checked > 0
            ? "bg-accent/50 text-primary"
            : status === "open"
              ? "bg-muted text-muted-foreground"
              : "bg-muted text-muted-foreground",
      )}
      aria-label={`S1 체크포인트 ${checked}/${total}`}
    >
      {complete && <Stamp className="h-3 w-3" aria-hidden />}
      {checked}/{total}
    </span>
  );
}

function S2Cell({ cases, min, passed }: { cases: number; min: number; passed: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex min-w-[52px] items-center justify-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
        passed
          ? "bg-primary text-primary-foreground"
          : cases > 0
            ? "bg-accent/50 text-primary"
            : "bg-muted text-muted-foreground",
      )}
      aria-label={`S2 테스트 케이스 ${cases}/${min} ${passed ? "통과" : "미통과"}`}
    >
      {passed ? (
        <ShieldCheck className="h-3 w-3" aria-hidden />
      ) : (
        <ShieldAlert className="h-3 w-3" aria-hidden />
      )}
      {cases}/{min}
    </span>
  );
}

function StageCell({ status }: { status: "done" | "open" | "locked" }) {
  return (
    <span
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-full text-xs",
        status === "done" && "bg-accent/50 text-primary",
        status === "open" && "bg-primary text-primary-foreground",
        status === "locked" && "bg-muted text-muted-foreground",
      )}
      aria-label={
        status === "done" ? "완료(도장)" : status === "open" ? "진행 중" : "잠김"
      }
    >
      {status === "done" ? (
        <Stamp className="h-3.5 w-3.5" aria-hidden />
      ) : status === "open" ? (
        <CircleDot className="h-3.5 w-3.5" aria-hidden />
      ) : (
        <Lock className="h-3 w-3" aria-hidden />
      )}
    </span>
  );
}

function S3Cell({
  v1,
  v2,
  reviewGiven,
  reviewReceived,
  status,
}: {
  v1: boolean;
  v2: boolean;
  reviewGiven: boolean;
  reviewReceived: number;
  status: "done" | "open" | "locked";
}) {
  if (v2) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground"
        aria-label="S3 2차 제출 완료"
        title="S3 게이트 통과"
      >
        <Stamp className="h-3 w-3" aria-hidden />
        v2
      </span>
    );
  }
  if (v1) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full bg-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-900"
        aria-label={`S3 1차 제출 · 받은 리뷰 ${reviewReceived}건${reviewGiven ? " · 리뷰 완료" : ""}`}
        title={`받은 리뷰 ${reviewReceived}건${reviewGiven ? ", 내가 리뷰 완료" : ""}`}
      >
        <FileCheck2 className="h-3 w-3" aria-hidden />
        v1
        {reviewGiven && <MessagesSquare className="ml-0.5 h-3 w-3" aria-hidden />}
      </span>
    );
  }
  return <StageCell status={status} />;
}

function S4Cell({
  completeCases,
  promptFilled,
  confirmed,
  status,
}: {
  completeCases: number;
  promptFilled: boolean;
  confirmed: boolean;
  status: "done" | "open" | "locked";
}) {
  if (confirmed) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground"
        aria-label="S4 프롬프트 확정 완료"
        title="S4 게이트 통과"
      >
        <Stamp className="h-3 w-3" aria-hidden />
        확정
      </span>
    );
  }
  if (completeCases >= 3 || promptFilled) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full bg-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-900"
        aria-label={`S4 테스트 케이스 ${completeCases}개${promptFilled ? " · 프롬프트 작성" : ""}`}
        title={`테스트 케이스 ${completeCases}개${promptFilled ? ", 프롬프트 작성" : ""}`}
      >
        <FileCheck2 className="h-3 w-3" aria-hidden />
        {completeCases}건
      </span>
    );
  }
  if (completeCases > 0) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full bg-accent/60 px-2 py-0.5 text-xs font-semibold text-primary"
        aria-label={`S4 테스트 케이스 ${completeCases}개`}
      >
        {completeCases}/3
      </span>
    );
  }
  return <StageCell status={status} />;
}

function S5Cell({
  totalCases,
  checkedCases,
  qaGiven,
  revisedFilled,
  confirmed,
  status,
}: {
  totalCases: number;
  checkedCases: number;
  qaGiven: boolean;
  revisedFilled: boolean;
  confirmed: boolean;
  status: "done" | "open" | "locked";
}) {
  if (confirmed) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground"
        aria-label="S5 수정 프롬프트 확정 완료"
        title="S5 게이트 통과"
      >
        <Stamp className="h-3 w-3" aria-hidden />
        확정
      </span>
    );
  }
  const allChecked = totalCases > 0 && checkedCases >= totalCases;
  if (allChecked || revisedFilled || qaGiven) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full bg-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-900"
        aria-label={`S5 체크 ${checkedCases}/${totalCases}${qaGiven ? " · QA 완료" : ""}${revisedFilled ? " · 수정 프롬프트 작성" : ""}`}
        title={`체크 ${checkedCases}/${totalCases}${qaGiven ? ", QA 완료" : ""}${revisedFilled ? ", 수정 프롬프트 작성" : ""}`}
      >
        <FileCheck2 className="h-3 w-3" aria-hidden />
        {checkedCases}/{totalCases || 0}
        {qaGiven && <MessagesSquare className="ml-0.5 h-3 w-3" aria-hidden />}
      </span>
    );
  }
  if (checkedCases > 0) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full bg-accent/60 px-2 py-0.5 text-xs font-semibold text-primary"
        aria-label={`S5 체크 ${checkedCases}/${totalCases}`}
      >
        {checkedCases}/{totalCases || 0}
      </span>
    );
  }
  return <StageCell status={status} />;
}




function S6Cell({
  slidesConfirmed,
  slidesFilled,
  queueState,
  commentsReceived,
  status,
}: {
  slidesConfirmed: boolean;
  slidesFilled: boolean;
  queueState: "waiting" | "current" | "done" | null;
  commentsReceived: number;
  status: "done" | "open" | "locked";
}) {
  if (queueState === "done") {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground"
        aria-label={`S6 발표 완료 · 코멘트 ${commentsReceived}건`}
        title={`발표 완료 · 코멘트 ${commentsReceived}건`}
      >
        <Stamp className="h-3 w-3" aria-hidden />
        발표
      </span>
    );
  }
  if (queueState === "current") {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full bg-amber-300 px-2 py-0.5 text-xs font-semibold text-amber-950"
        aria-label="지금 발표 중"
      >
        <Mic className="h-3 w-3" aria-hidden />
        발표 중
      </span>
    );
  }
  if (slidesConfirmed) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full bg-accent/60 px-2 py-0.5 text-xs font-semibold text-primary"
        aria-label="슬라이드 확정 · 발표 대기"
        title="슬라이드 확정 완료"
      >
        <Presentation className="h-3 w-3" aria-hidden />
        슬라이드
      </span>
    );
  }
  if (slidesFilled) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full bg-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-900"
        aria-label="슬라이드 6장 채움"
      >
        <FileCheck2 className="h-3 w-3" aria-hidden />
        6/6
      </span>
    );
  }
  return <StageCell status={status} />;
}
