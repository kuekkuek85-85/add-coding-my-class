import { StickyNote, ShieldCheck, FileText, MessageSquare, ListChecks, Presentation, Mic, ExternalLink } from "lucide-react";

export type PortfolioLike = {
  ok: true;
  session: { id: string; name: string; closedAt: string | null };
  nickname: string;
  s1: {
    total: number;
    done: number;
    checkpoints: Array<{ id: string; seq: number; label: string; done: boolean }>;
    memos: Array<{ stageNo: number; text: string; createdAt: string }>;
  };
  s2: {
    cases: Array<{ title: string; given_when: string; expected_then: string; created_at: string }>;
    passed: boolean;
    min: number;
  };
  s3: {
    prd: {
      problem?: string | null;
      users?: string | null;
      features?: string | null;
      nonfunctional?: string | null;
      success_metric?: string | null;
      out_of_scope?: string | null;
    } | null;
    passed: boolean;
  };
  s4: {
    prompt: {
      role?: string | null;
      context?: string | null;
      task?: string | null;
      nonfunctional?: string | null;
      confirmed_at?: string | null;
    } | null;
    cases: Array<{
      title: string;
      given: string;
      when_step: string;
      then_step: string;
      result: { status: string; note: string | null } | null;
    }>;
    confirmed: boolean;
  };
  s5: {
    revised: {
      target?: string | null;
      evidence?: string | null;
      keep_list?: string | null;
      add_list?: string | null;
      constraints?: string | null;
    } | null;
    checkedCount: number;
    totalCases: number;
    confirmed: boolean;
  };
  s6: {
    title: string;
    slides: unknown[];
    confirmed: boolean;
    queueState: "waiting" | "current" | "done" | null;
    presentedAt: string | null;
    comments: Array<{
      good: string;
      question: string | null;
      createdAt: string;
      commenterNickname: string;
    }>;
  };
  stamps: {
    s1: boolean;
    s2: boolean;
    s3: boolean;
    s4: boolean;
    s5: boolean;
    s6: boolean;
  };
};

export function PortfolioSummary({ portfolio }: { portfolio: PortfolioLike }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Card
        code="S1"
        title="기본 기능 떠올리기"
        icon={ShieldCheck}
        done={portfolio.stamps.s1}
      >
        <p className="text-xs text-muted-foreground">
          체크포인트 {portfolio.s1.done}/{portfolio.s1.total} 통과
        </p>
        {portfolio.s1.memos.length > 0 && (
          <ul className="mt-2 space-y-1">
            {portfolio.s1.memos.slice(0, 5).map((m, i) => (
              <li
                key={i}
                className="flex gap-1.5 rounded-lg bg-accent/40 px-2 py-1 text-xs text-foreground"
              >
                <StickyNote className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
                <span>{m.text}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card
        code="S2"
        title="확장 테스트 케이스"
        icon={ListChecks}
        done={portfolio.stamps.s2}
      >
        <p className="text-xs text-muted-foreground">
          테스트 케이스 {portfolio.s2.cases.length}개 (필요 {portfolio.s2.min}개)
        </p>
        <ol className="mt-2 space-y-1 text-xs">
          {portfolio.s2.cases.slice(0, 5).map((c, i) => (
            <li key={i} className="rounded-lg border border-border/60 px-2 py-1">
              <b>{c.title}</b>
              <div className="text-muted-foreground">
                Given/When {c.given_when} · Then {c.expected_then}
              </div>
            </li>
          ))}
        </ol>
      </Card>

      <Card
        code="S3"
        title="PRD"
        icon={FileText}
        done={portfolio.stamps.s3}
      >
        {portfolio.s3.prd ? (
          <dl className="space-y-1 text-xs">
            <Row k="문제" v={portfolio.s3.prd.problem} />
            <Row k="사용자" v={portfolio.s3.prd.users} />
            <Row k="핵심 기능" v={portfolio.s3.prd.features} />
            <Row k="성공 지표" v={portfolio.s3.prd.success_metric} />
          </dl>
        ) : (
          <p className="text-xs text-muted-foreground">아직 PRD가 없습니다.</p>
        )}
      </Card>

      <Card
        code="S4"
        title="첫 프롬프트"
        icon={MessageSquare}
        done={portfolio.stamps.s4}
      >
        {portfolio.s4.prompt ? (
          <dl className="space-y-1 text-xs">
            <Row k="역할" v={portfolio.s4.prompt.role} />
            <Row k="컨텍스트" v={portfolio.s4.prompt.context} />
            <Row k="할 일" v={portfolio.s4.prompt.task} />
            <Row k="비기능" v={portfolio.s4.prompt.nonfunctional} />
          </dl>
        ) : (
          <p className="text-xs text-muted-foreground">아직 첫 프롬프트가 없습니다.</p>
        )}
      </Card>

      <Card
        code="S5"
        title="실행 체크 & 수정 프롬프트"
        icon={ListChecks}
        done={portfolio.stamps.s5}
      >
        <p className="text-xs text-muted-foreground">
          체크리스트 {portfolio.s5.checkedCount}/{portfolio.s5.totalCases}건 기록
        </p>
        {portfolio.s5.revised ? (
          <dl className="mt-2 space-y-1 text-xs">
            <Row k="대상" v={portfolio.s5.revised.target} />
            <Row k="근거" v={portfolio.s5.revised.evidence} />
            <Row k="추가" v={portfolio.s5.revised.add_list} />
            <Row k="제약" v={portfolio.s5.revised.constraints} />
          </dl>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">
            아직 수정 프롬프트가 없습니다.
          </p>
        )}
      </Card>

      <Card
        code="S6"
        title="발표 슬라이드 & 코멘트"
        icon={Presentation}
        done={portfolio.stamps.s6}
      >
        {portfolio.s6.title && (
          <p className="text-sm font-semibold text-foreground">
            <Mic className="mr-1 inline h-3 w-3" aria-hidden />
            {portfolio.s6.title}
          </p>
        )}
        {Array.isArray(portfolio.s6.slides) && portfolio.s6.slides.length > 0 && (
          <ol className="mt-2 space-y-1 text-xs">
            {portfolio.s6.slides.map((s, i) => (
              <li key={i} className="rounded-lg border border-border/60 px-2 py-1">
                <b>{i + 1}. {(s as { heading?: string }).heading || "(제목 없음)"}</b>
                <div className="text-muted-foreground">
                  {(s as { body?: string }).body || ""}
                </div>
              </li>
            ))}
          </ol>
        )}
        {portfolio.s6.comments.length > 0 && (
          <div className="mt-3">
            <p className="mb-1 text-xs font-semibold text-primary">
              받은 좋은 점 · 질문 ({portfolio.s6.comments.length}건)
            </p>
            <ul className="space-y-1 text-xs">
              {portfolio.s6.comments.map((c, i) => (
                <li
                  key={i}
                  className="rounded-lg bg-emerald-50 px-2 py-1 text-emerald-950"
                >
                  <b>{c.commenterNickname}</b> — {c.good}
                  {c.question && (
                    <div className="mt-0.5 text-emerald-800/80">
                      질문/제안: {c.question}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>
    </div>
  );
}


function Card({
  code,
  title,
  icon: Icon,
  done,
  children,
}: {
  code: string;
  title: string;
  icon: typeof StickyNote;
  done: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border-2 border-primary/20 bg-card p-4 shadow-sm">
      <div className="mb-2 flex items-center gap-2">
        <span
          className={
            done
              ? "inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground"
              : "inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground"
          }
        >
          {code}
        </span>
        <Icon className="h-4 w-4 text-primary/80" aria-hidden />
        <h3 className="font-display text-sm font-bold text-foreground">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function Row({ k, v }: { k: string; v: string | null | undefined }) {
  if (!v || v.trim() === "") return null;
  return (
    <div className="flex gap-1">
      <dt className="min-w-[52px] font-semibold text-primary/80">{k}</dt>
      <dd className="text-foreground">{v}</dd>
    </div>
  );
}
