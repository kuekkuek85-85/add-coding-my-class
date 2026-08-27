import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, ExternalLink, ShieldAlert, Users } from "lucide-react";

import { getAlumniGallery, isAlumniVisible } from "@/lib/alumni.functions";
import { useStoredSession } from "@/lib/local-session";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/alumni")({
  component: AlumniPage,
  head: () => ({
    meta: [
      { title: "선배 사례 갤러리 · 내 수업에 코딩 한 스푼" },
      {
        name: "description",
        content:
          "이전 기수 선생님들이 만든 수업 도구 사례를 익명으로 열람합니다. PRD와 프롬프트, 배포 링크를 함께 봅니다.",
      },
      { property: "og:title", content: "선배 사례 갤러리 · 내 수업에 코딩 한 스푼" },
      {
        property: "og:description",
        content: "이전 기수 선생님들의 수업 도구 사례를 익명으로 열람하는 읽기 전용 갤러리입니다.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Item = {
  key: string;
  displayName: string;
  title: string;
  problem: string;
  prd: {
    problem: string;
    users: string;
    features: string;
    nonfunctional: string;
    success_metric: string;
    out_of_scope: string;
  } | null;
  firstPrompt: string;
  revisedPrompt: string;
  deployedUrl: string | null;
  subject: string;
};

function AlumniPage() {
  const navigate = useNavigate();
  const { ready, session: stored } = useStoredSession();
  const fetchFn = useServerFn(getAlumniGallery);
  const checkVisible = useServerFn(isAlumniVisible);
  const [subject, setSubject] = useState<string>("전체");
  const [detail, setDetail] = useState<Item | null>(null);

  const { data: visibleData } = useQuery({
    queryKey: ["alumni-visible", stored?.userId],
    queryFn: () => checkVisible({ data: { userId: stored!.userId } }),
    enabled: !!stored?.userId,
  });
  const visible = visibleData?.ok ? visibleData.visible : undefined;

  const { data, isLoading } = useQuery({
    queryKey: ["alumni-gallery", stored?.userId],
    queryFn: () => fetchFn({ data: { userId: stored!.userId } }),
    enabled: !!stored?.userId && visible === true,
  });

  useEffect(() => {
    if (!ready || visible === undefined) return;
    if (!visible) {
      const to = stored?.role === "instructor" ? "/instructor" : "/home";
      navigate({ to });
    }
  }, [ready, visible, stored?.role, navigate]);

  // 훅은 항상 조기 return보다 위에서 호출되어야 합니다.
  const items = useMemo(
    () => ((data?.ok ? data.items : []) as Item[]),
    [data],
  );
  const subjects = useMemo(
    () => (data?.ok ? ((data as { subjects?: string[] }).subjects ?? []) : []),
    [data],
  );
  const filtered = useMemo(
    () => items.filter((i) => subject === "전체" || i.subject === subject),
    [items, subject],
  );

  if (!ready || visible === undefined) return <div className="min-h-screen" />;

  const homeTo = stored?.role === "instructor" ? "/instructor" : "/home";




  return (
    <main className="min-h-screen pb-20">
      <header className="border-b-2 border-primary/15 bg-card/60 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-3">
          <Button asChild variant="ghost" size="sm" className="h-9 w-9 p-0">
            <Link to={homeTo} aria-label="홈으로">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="font-display text-sm font-bold text-primary">선배 사례 갤러리</h1>
            <p className="text-xs text-muted-foreground">
              이전 기수 선생님들의 산출물 · 읽기 전용
            </p>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 py-5">
        <a
          href="https://padlet.com/jangpyungms3/padlet-a63xkdomobt223lf"
          target="_blank"
          rel="noreferrer noopener"
          className="mb-4 flex items-center gap-2 rounded-2xl border-2 border-primary/30 bg-primary/5 p-3 text-sm text-primary transition-colors hover:bg-primary/10"
        >
          <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
          <span className="font-semibold">전체 참고: 패들렛 사례 모음</span>
        </a>

        <div className="mb-4 flex items-start gap-2 rounded-2xl border-2 border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>
            타 학교 선생님 산출물입니다. <b>캡처·외부 공유 금지</b>. 수업 아이디어를 얻는
            용도로만 살펴봐 주세요.
          </p>
        </div>


        {subjects.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground">교과</span>
            {["전체", ...subjects].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSubject(s)}
                className={cn(
                  "rounded-full border-2 px-3 py-1 text-xs font-semibold transition-colors",
                  subject === s
                    ? "border-amber-500 bg-amber-500 text-white"
                    : "border-border/70 bg-card text-muted-foreground hover:border-amber-400",
                )}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {isLoading ? (
          <p className="text-sm text-muted-foreground">불러오는 중…</p>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
            아직 열람할 선배 사례가 없습니다.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((it) => (
              <button
                key={it.key}
                type="button"
                onClick={() => setDetail(it)}
                className="flex h-full flex-col gap-2 rounded-2xl border-2 border-primary/25 bg-card p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-md"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                    <Users className="h-3 w-3" aria-hidden />
                    {it.displayName}
                  </span>
                  {it.deployedUrl && (
                    <span className="text-[10px] font-semibold text-emerald-700">배포됨</span>
                  )}
                </div>
                <h2 className="font-display text-base font-bold text-foreground">
                  {it.title || "(제목 없음)"}
                </h2>
                <span className="inline-flex w-fit rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                  {it.subject}
                </span>
                <p className="line-clamp-4 text-xs text-muted-foreground">
                  {it.problem || "PRD 문제 정의가 없습니다."}
                </p>
                {it.deployedUrl && (
                  <a
                    href={it.deployedUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    onClick={(e) => e.stopPropagation()}
                    className="mt-auto inline-flex items-center gap-1 text-xs font-semibold text-primary underline underline-offset-2"
                  >
                    <ExternalLink className="h-3 w-3" aria-hidden />
                    웹 앱 열기
                  </a>
                )}
              </button>
            ))}
          </div>
        )}
      </section>

      <Dialog open={detail !== null} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {detail?.displayName} · {detail?.title || "(제목 없음)"}
            </DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-4 text-sm">
              <p className="rounded-lg border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900">
                타 학교 선생님 산출물입니다. 캡처·외부 공유 금지.
              </p>
              {detail.deployedUrl && (
                <a
                  href={detail.deployedUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1 font-semibold text-primary underline underline-offset-2"
                >
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  {detail.deployedUrl}
                </a>
              )}
              {detail.prd ? (
                <dl className="grid gap-3">
                  {(
                    [
                      ["문제", detail.prd.problem],
                      ["사용자", detail.prd.users],
                      ["핵심 기능", detail.prd.features],
                      ["비기능", detail.prd.nonfunctional],
                      ["성공 지표", detail.prd.success_metric],
                      ["범위 밖", detail.prd.out_of_scope],
                    ] as const
                  ).map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-primary/70">
                        {label}
                      </dt>
                      <dd className="mt-0.5 whitespace-pre-wrap text-foreground">
                        {value || "—"}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="text-muted-foreground">PRD 기록이 없습니다.</p>
              )}
              {detail.firstPrompt && (
                <div>
                  <h3 className="mb-1 font-display text-sm font-bold text-primary">
                    초안 PRD 프롬프트
                  </h3>
                  <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-muted/50 p-3 text-xs">
                    {detail.firstPrompt}
                  </pre>
                </div>
              )}
              {detail.revisedPrompt && (
                <div>
                  <h3 className="mb-1 font-display text-sm font-bold text-primary">
                    수정 PRD 프롬프트
                  </h3>
                  <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-muted/50 p-3 text-xs">
                    {detail.revisedPrompt}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
