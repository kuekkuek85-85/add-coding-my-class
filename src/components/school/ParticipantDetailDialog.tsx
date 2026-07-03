import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, XCircle, MinusCircle, ExternalLink } from "lucide-react";
import { SlidePreview } from "@/components/s6/SlidePreview";


import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getParticipantStageDetail } from "@/lib/instructor-detail.functions";
import { STAGES } from "@/components/school/TimetableCard";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instructorUserId: string;
  targetUserId: string | null;
  targetNickname: string;
  stageNo: number | null;
};

export function ParticipantDetailDialog({
  open,
  onOpenChange,
  instructorUserId,
  targetUserId,
  targetNickname,
  stageNo,
}: Props) {
  const fetchDetail = useServerFn(getParticipantStageDetail);
  const { data, isFetching } = useQuery({
    queryKey: ["instructor-detail", instructorUserId, targetUserId, stageNo],
    queryFn: () =>
      fetchDetail({
        data: {
          userId: instructorUserId,
          targetUserId: targetUserId!,
          stageNo: stageNo!,
        },
      }),
    enabled: open && !!targetUserId && !!stageNo,
  });

  const stageMeta = STAGES.find((s) => s.no === stageNo);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {targetNickname} · {stageMeta ? `${stageMeta.code} ${stageMeta.title}` : `${stageNo}교시`}
          </DialogTitle>
          <DialogDescription>
            참가자의 산출물을 읽기 전용으로 봅니다.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-2">
          {isFetching && !data && (
            <p className="p-4 text-sm text-muted-foreground">불러오는 중…</p>
          )}
          {data && !data.ok && (
            <p className="p-4 text-sm text-destructive">{data.error}</p>
          )}
          {data && data.ok && data.stage === 1 && <S1View s1={data.s1} />}
          {data && data.ok && data.stage === 2 && <S2View s2={data.s2} />}
          {data && data.ok && data.stage === 3 && <S3View s3={data.s3} />}
          {data && data.ok && data.stage === 4 && <S4View s4={data.s4} />}
          {data && data.ok && data.stage === 5 && <S5View s5={data.s5} />}
          {data && data.ok && data.stage === 6 && <S6View s6={data.s6} />}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-4">
      <h3 className="mb-2 font-display text-sm font-bold text-primary">{title}</h3>
      {children}
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-primary/70">
        {label}
      </p>
      <p className="whitespace-pre-wrap rounded-lg border border-border/40 bg-muted/30 p-2 text-sm text-foreground">
        {value.trim() || "(비어 있음)"}
      </p>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <p className="rounded-lg border border-dashed border-border/60 bg-muted/30 p-3 text-center text-xs text-muted-foreground">
      {text}
    </p>
  );
}

function DeployedUrlBanner({ url }: { url: string | null | undefined }) {
  const trimmed = (url ?? "").trim();
  if (!trimmed) {
    return (
      <p className="rounded-lg border border-dashed border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        아직 배포 URL이 제출되지 않았습니다.
      </p>
    );
  }
  return (
    <a
      href={trimmed}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 rounded-lg border-2 border-primary/30 bg-primary/5 px-3 py-2 text-sm font-semibold text-primary transition hover:border-primary hover:bg-primary/10"
    >
      <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
      <span className="truncate">{trimmed}</span>
    </a>
  );
}


function S1View({
  s1,
}: {
  s1: {
    checkpoints: Array<{ id: string; seq: number; label: string; hint: string; checked: boolean }>;
    memos: Array<{ text: string; createdAt: string | null }>;
  };
}) {
  return (
    <div>
      <Section title="체크포인트">
        <ol className="flex flex-col gap-1.5">
          {s1.checkpoints.map((c) => (
            <li
              key={c.id}
              className={cn(
                "flex items-start gap-2 rounded-lg border p-2 text-sm",
                c.checked
                  ? "border-emerald-300 bg-emerald-50"
                  : "border-border/60 bg-background",
              )}
            >
              {c.checked ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <MinusCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <div>
                <p className="font-semibold text-foreground">
                  {c.seq}. {c.label}
                </p>
                {c.hint && <p className="text-xs text-muted-foreground">{c.hint}</p>}
              </div>
            </li>
          ))}
        </ol>
      </Section>
      <Section title={`메모 (${s1.memos.length})`}>
        {s1.memos.length === 0 ? (
          <Empty text="작성한 메모가 없습니다." />
        ) : (
          <ul className="flex flex-col gap-1.5">
            {s1.memos.map((m, i) => (
              <li
                key={i}
                className="whitespace-pre-wrap rounded-lg border border-border/40 bg-muted/30 p-2 text-sm"
              >
                {m.text}
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

function S2View({
  s2,
}: {
  s2: {
    cases: Array<{ id: string; title: string; given_when: string; expected_then: string }>;
  };
}) {
  return (
    <Section title={`테스트 케이스 (${s2.cases.length})`}>
      {s2.cases.length === 0 ? (
        <Empty text="작성한 테스트 케이스가 없습니다." />
      ) : (
        <ol className="flex flex-col gap-2">
          {s2.cases.map((c, i) => (
            <li key={c.id} className="rounded-lg border border-border/60 bg-background p-3">
              <p className="mb-1 text-sm font-bold text-foreground">
                {i + 1}. {c.title || "(제목 없음)"}
              </p>
              <Field label="상황 (Given/When)" value={c.given_when} />
              <Field label="기대 (Expected/Then)" value={c.expected_then} />
            </li>
          ))}
        </ol>
      )}
    </Section>
  );
}

type Review = { partnerNickname: string; good: string; question: string; suggestion: string };

function ReviewList({ items, empty }: { items: Review[]; empty: string }) {
  if (items.length === 0) return <Empty text={empty} />;
  return (
    <ul className="flex flex-col gap-2">
      {items.map((r, i) => (
        <li key={i} className="rounded-lg border border-border/60 bg-background p-3">
          <p className="mb-1 text-xs font-semibold text-primary">↔ {r.partnerNickname}</p>
          <Field label="좋은 점" value={r.good} />
          <Field label="질문" value={r.question} />
          <Field label="제안" value={r.suggestion} />
        </li>
      ))}
    </ul>
  );
}

function S3View({
  s3,
}: {
  s3: {
    prd: {
      problem: string;
      users: string;
      features: string;
      nonfunctional: string;
      success_metric: string;
      out_of_scope: string;
      submittedV1At: string | null;
      submittedV2At: string | null;
    } | null;
    reviewsGiven: Review[];
    reviewsReceived: Review[];
  };
}) {
  return (
    <div>
      <Section
        title={`PRD${s3.prd?.submittedV2At ? " (v2 제출)" : s3.prd?.submittedV1At ? " (v1 제출)" : " (미제출)"}`}
      >
        {!s3.prd ? (
          <Empty text="아직 PRD 초안이 없습니다." />
        ) : (
          <div>
            <Field label="문제" value={s3.prd.problem} />
            <Field label="사용자" value={s3.prd.users} />
            <Field label="핵심 기능" value={s3.prd.features} />
            <Field label="비기능" value={s3.prd.nonfunctional} />
            <Field label="성공 지표" value={s3.prd.success_metric} />
            <Field label="범위 밖" value={s3.prd.out_of_scope} />
          </div>
        )}
      </Section>
      <Section title={`받은 리뷰 (${s3.reviewsReceived.length})`}>
        <ReviewList items={s3.reviewsReceived} empty="아직 받은 리뷰가 없습니다." />
      </Section>
      <Section title={`내가 준 리뷰 (${s3.reviewsGiven.length})`}>
        <ReviewList items={s3.reviewsGiven} empty="아직 준 리뷰가 없습니다." />
      </Section>
    </div>
  );
}

function S4View({
  s4,
}: {
  s4: {
    cases: Array<{
      id: string;
      title: string;
      given: string;
      when_step: string;
      then_step: string;
    }>;
    prompt: {
      role: string;
      context: string;
      task: string;
      nonfunctional: string;
      confirmedAt: string | null;
    } | null;
  };
}) {
  return (
    <div>
      <Section title={`테스트 케이스 (${s4.cases.length})`}>
        {s4.cases.length === 0 ? (
          <Empty text="작성한 4교시 테스트 케이스가 없습니다." />
        ) : (
          <ol className="flex flex-col gap-2">
            {s4.cases.map((c, i) => (
              <li key={c.id} className="rounded-lg border border-border/60 bg-background p-3">
                <p className="mb-1 text-sm font-bold text-foreground">
                  {i + 1}. {c.title || "(제목 없음)"}
                </p>
                <Field label="주어진" value={c.given} />
                <Field label="할 때" value={c.when_step} />
                <Field label="그러면" value={c.then_step} />
              </li>
            ))}
          </ol>
        )}
      </Section>
      <Section title={`첫 프롬프트${s4.prompt?.confirmedAt ? " (확정)" : ""}`}>
        {!s4.prompt ? (
          <Empty text="아직 프롬프트를 작성하지 않았습니다." />
        ) : (
          <div>
            <Field label="역할" value={s4.prompt.role} />
            <Field label="컨텍스트" value={s4.prompt.context} />
            <Field label="해야 할 일" value={s4.prompt.task} />
            <Field label="비기능 요구" value={s4.prompt.nonfunctional} />
          </div>
        )}
      </Section>
    </div>
  );
}

const STATUS_LABEL = { pass: "통과", partial: "부분", fail: "실패" } as const;
const STATUS_CLS = {
  pass: "border-emerald-300 bg-emerald-50 text-emerald-800",
  partial: "border-amber-300 bg-amber-50 text-amber-800",
  fail: "border-rose-300 bg-rose-50 text-rose-800",
} as const;

type QaReview = { partnerNickname: string; good: string; issue: string; suggestion: string };

function S5View({
  s5,
}: {
  s5: {
    results: Array<{
      testCaseId: string;
      source: "s2" | "s4";
      status: "pass" | "fail" | "partial";
      note: string;
      title: string;
    }>;
    revised: {
      target: string;
      evidence: string;
      keep_list: string;
      add_list: string;
      constraints: string;
      confirmedAt: string | null;
    } | null;
    qaGiven: QaReview[];
    qaReceived: QaReview[];
  };
}) {
  return (
    <div>
      <Section title={`실행 체크리스트 결과 (${s5.results.length})`}>
        {s5.results.length === 0 ? (
          <Empty text="아직 기록된 결과가 없습니다." />
        ) : (
          <ul className="flex flex-col gap-1.5">
            {s5.results.map((r) => {
              const Icon =
                r.status === "pass" ? CheckCircle2 : r.status === "partial" ? MinusCircle : XCircle;
              return (
                <li
                  key={`${r.source}:${r.testCaseId}`}
                  className={cn("rounded-lg border-2 p-2 text-sm", STATUS_CLS[r.status])}
                >
                  <p className="flex items-center gap-1.5 font-semibold">
                    <span className="rounded-full bg-white/60 px-1.5 py-0.5 text-[10px] font-bold">
                      {r.source.toUpperCase()}
                    </span>
                    <Icon className="h-3.5 w-3.5" aria-hidden />
                    {STATUS_LABEL[r.status]} · {r.title}
                  </p>
                  {r.note && (
                    <p className="mt-1 whitespace-pre-wrap pl-1 text-xs">{r.note}</p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Section>
      <Section title={`수정 프롬프트${s5.revised?.confirmedAt ? " (확정)" : ""}`}>
        {!s5.revised ? (
          <Empty text="아직 수정 프롬프트를 작성하지 않았습니다." />
        ) : (
          <div>
            <Field label="다음 대상" value={s5.revised.target} />
            <Field label="근거" value={s5.revised.evidence} />
            <Field label="유지" value={s5.revised.keep_list} />
            <Field label="추가/보완" value={s5.revised.add_list} />
            <Field label="제약" value={s5.revised.constraints} />
          </div>
        )}
      </Section>
      <Section title={`받은 QA (${s5.qaReceived.length})`}>
        {s5.qaReceived.length === 0 ? (
          <Empty text="아직 받은 QA가 없습니다." />
        ) : (
          <ul className="flex flex-col gap-2">
            {s5.qaReceived.map((r, i) => (
              <li key={i} className="rounded-lg border border-border/60 bg-background p-3">
                <p className="mb-1 text-xs font-semibold text-primary">← {r.partnerNickname}</p>
                <Field label="좋은 점" value={r.good} />
                <Field label="문제" value={r.issue} />
                <Field label="제안" value={r.suggestion} />
              </li>
            ))}
          </ul>
        )}
      </Section>
      <Section title={`내가 준 QA (${s5.qaGiven.length})`}>
        {s5.qaGiven.length === 0 ? (
          <Empty text="아직 준 QA가 없습니다." />
        ) : (
          <ul className="flex flex-col gap-2">
            {s5.qaGiven.map((r, i) => (
              <li key={i} className="rounded-lg border border-border/60 bg-background p-3">
                <p className="mb-1 text-xs font-semibold text-primary">→ {r.partnerNickname}</p>
                <Field label="좋은 점" value={r.good} />
                <Field label="문제" value={r.issue} />
                <Field label="제안" value={r.suggestion} />
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

function S6View({
  s6,
}: {
  s6: {
    deck: { title: string; slides: unknown; confirmedAt: string | null } | null;
    queue: {
      state: "waiting" | "current" | "done" | null;
      orderIndex: number | null;
      startedAt: string | null;
      finishedAt: string | null;
    } | null;
    comments: Array<{ partnerNickname: string; good: string; question: string }>;
  };
}) {
  return (
    <div>
      <Section title={`슬라이드${s6.deck?.confirmedAt ? " (확정)" : ""}`}>
        {!s6.deck ? (
          <Empty text="아직 슬라이드가 없습니다." />
        ) : (
          <div>
            <Field label="제목" value={s6.deck.title} />
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg border border-border/40 bg-muted/30 p-2 text-xs">
              {JSON.stringify(s6.deck.slides ?? {}, null, 2)}
            </pre>
          </div>
        )}
      </Section>
      <Section title="발표 큐">
        {!s6.queue ? (
          <Empty text="큐에 등록되지 않았습니다." />
        ) : (
          <p className="rounded-lg border border-border/60 bg-background p-2 text-sm">
            상태: <b>{s6.queue.state ?? "-"}</b> · 순서:{" "}
            <b>{s6.queue.orderIndex ?? "-"}</b>
          </p>
        )}
      </Section>
      <Section title={`받은 코멘트 (${s6.comments.length})`}>
        {s6.comments.length === 0 ? (
          <Empty text="아직 받은 코멘트가 없습니다." />
        ) : (
          <ul className="flex flex-col gap-2">
            {s6.comments.map((c, i) => (
              <li key={i} className="rounded-lg border border-border/60 bg-background p-3">
                <p className="mb-1 text-xs font-semibold text-primary">← {c.partnerNickname}</p>
                <Field label="좋은 점" value={c.good} />
                <Field label="질문" value={c.question} />
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
