import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, User, FileText, ChevronRight } from "lucide-react";

import { getGallery, getParticipantBundle } from "@/lib/s6.functions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function GalleryGrid({ userId }: { userId: string }) {
  const fetchGallery = useServerFn(getGallery);
  const { data } = useQuery({
    queryKey: ["s6-gallery", userId],
    queryFn: () => fetchGallery({ data: { userId } }),
    refetchInterval: 15_000,
  });

  const items = data?.ok ? data.gallery : [];
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border-2 border-primary/15 bg-card p-4 shadow-sm">
        <div className="flex items-center gap-2 text-primary">
          <FileText className="h-4 w-4" aria-hidden />
          <h3 className="font-display text-sm font-bold">
            참가자 갤러리 · {items.length}명
          </h3>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          동료들의 PRD·프롬프트·수정 프롬프트를 자유롭게 살펴보세요.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
          아직 공개된 참가자 산출물이 없습니다.
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {items.map((it) => (
            <li
              key={it.userId}
              className="rounded-2xl border-2 border-primary/15 bg-card p-4 shadow-sm"
            >
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2 font-display text-sm font-bold text-primary">
                  <User className="h-4 w-4" aria-hidden />
                  {it.nickname}
                </div>
                {it.deckConfirmed ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                    <CheckCircle2 className="h-3 w-3" aria-hidden />
                    슬라이드 확정
                  </span>
                ) : it.revisedConfirmed ? (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
                    S5 통과
                  </span>
                ) : (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                    진행 중
                  </span>
                )}
              </div>
              <p className="mb-1 text-[11px] font-semibold text-muted-foreground">문제</p>
              <p className="mb-2 line-clamp-2 text-sm text-foreground/90">
                {it.prdProblem || "-"}
              </p>
              <p className="mb-1 text-[11px] font-semibold text-muted-foreground">
                첫 프롬프트의 할 일
              </p>
              <p className="mb-3 line-clamp-2 text-sm text-foreground/85">
                {it.promptTask || "-"}
              </p>
              <Dialog open={openId === it.userId} onOpenChange={(o) => setOpenId(o ? it.userId : null)}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="w-full gap-1">
                    펼쳐보기
                    <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                  </Button>
                </DialogTrigger>
                {openId === it.userId && (
                  <BundleDialog userId={userId} targetId={it.userId} />
                )}
              </Dialog>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function BundleDialog({ userId, targetId }: { userId: string; targetId: string }) {
  const fetchBundle = useServerFn(getParticipantBundle);
  const { data } = useQuery({
    queryKey: ["s6-bundle", userId, targetId],
    queryFn: () => fetchBundle({ data: { userId, targetId } }),
  });

  if (!data) return (
    <DialogContent className="max-w-2xl">
      <DialogHeader><DialogTitle>불러오는 중…</DialogTitle></DialogHeader>
    </DialogContent>
  );
  if (!data.ok) return (
    <DialogContent className="max-w-2xl">
      <DialogHeader><DialogTitle>불러오지 못했어요</DialogTitle></DialogHeader>
      <p className="text-sm text-muted-foreground">{data.error}</p>
    </DialogContent>
  );

  const { nickname, prd, prompt, revised, cases } = data;
  return (
    <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="font-display text-lg text-primary">
          {nickname}의 산출물
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-4 text-sm">
        <Section title="PRD">
          <Field label="문제">{prd?.problem}</Field>
          <Field label="사용자">{prd?.users}</Field>
          <Field label="핵심 기능">{prd?.features}</Field>
          <Field label="비기능">{prd?.nonfunctional}</Field>
          <Field label="성공 지표">{prd?.success_metric}</Field>
        </Section>
        <Section title="첫 프롬프트">
          <Field label="역할">{prompt?.role}</Field>
          <Field label="컨텍스트">{prompt?.context}</Field>
          <Field label="할 일">{prompt?.task}</Field>
          <Field label="비기능">{prompt?.nonfunctional}</Field>
        </Section>
        <Section title={`테스트 케이스 · 실행 결과 (${cases.length}건)`}>
          {cases.length === 0 ? (
            <p className="text-xs text-muted-foreground">테스트 케이스 없음</p>
          ) : (
            <ul className="space-y-2">
              {cases.map((c, i) => (
                <li key={i} className="rounded-lg border border-border/60 bg-muted/30 p-2 text-xs">
                  <p className="font-semibold text-primary">{c.title}</p>
                  <p>주어진: {c.given}</p>
                  <p>할 때: {c.when_step}</p>
                  <p>그러면: {c.then_step}</p>
                  <p className="mt-1">
                    결과:{" "}
                    <span className="font-semibold">
                      {c.result?.status ?? "미기록"}
                    </span>
                    {c.result?.note ? ` · ${c.result.note}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Section>
        <Section title="수정 프롬프트">
          <Field label="대상">{revised?.target}</Field>
          <Field label="근거">{revised?.evidence}</Field>
          <Field label="유지">{revised?.keep_list}</Field>
          <Field label="추가">{revised?.add_list}</Field>
          <Field label="제약">{revised?.constraints}</Field>
        </Section>
      </div>
    </DialogContent>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border-2 border-primary/15 bg-card p-3">
      <h4 className="mb-2 font-display text-sm font-bold text-primary">{title}</h4>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children?: string | null }) {
  const value = (children ?? "").trim();
  return (
    <div className="text-xs">
      <span className="mr-1 font-semibold text-muted-foreground">{label}:</span>
      <span className="whitespace-pre-wrap text-foreground/90">{value || "-"}</span>
    </div>
  );
}
