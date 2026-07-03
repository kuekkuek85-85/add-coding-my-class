import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Sparkles, Save, Lock, CheckCircle2, Info } from "lucide-react";

import {
  getMyS6State,
  saveMySlides,
  confirmMySlides,
  generateSlideDraft,
  type Slide,
} from "@/lib/s6.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { SlidePreview } from "./SlidePreview";

const SECTION_LABELS = [
  "1. 표지",
  "2. 문제 정의",
  "3. 첫 PRD 프롬프트",
  "4. 실행에서 배운 것",
  "5. 개선한 프롬프트",
  "6. 다음에 해볼 것",
];

function emptySlides(): Slide[] {
  return Array.from({ length: 6 }, () => ({ heading: "", body: "" }));
}

export function SlideDraftEditor({
  userId,
  nickname,
}: {
  userId: string;
  nickname: string;
}) {
  const qc = useQueryClient();
  const fetchState = useServerFn(getMyS6State);
  const save = useServerFn(saveMySlides);
  const confirm = useServerFn(confirmMySlides);
  const generate = useServerFn(generateSlideDraft);

  const stateKey = ["s6-state", userId];
  const { data: state } = useQuery({
    queryKey: stateKey,
    queryFn: () => fetchState({ data: { userId } }),
    refetchInterval: 15_000,
  });

  const locked = state?.ok ? state.confirmed : false;
  const [title, setTitle] = useState("");
  const [slides, setSlides] = useState<Slide[]>(emptySlides());
  const [dirty, setDirty] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    if (state?.ok) {
      setTitle(state.title ?? "");
      setSlides(
        state.slides.length === 6 ? (state.slides as Slide[]) : emptySlides(),
      );
      setDirty(false);
    }
  }, [state?.ok, state && state.ok ? state.confirmed : false, state && state.ok ? state.draftGeneratedAt : null]);

  const saveMut = useMutation({
    mutationFn: () => save({ data: { userId, title, slides } }),
    onSuccess: (res) => {
      if (!res.ok) return toast.error(res.error);
      setDirty(false);
      qc.invalidateQueries({ queryKey: stateKey });
    },
  });

  const confirmMut = useMutation({
    mutationFn: () => confirm({ data: { userId } }),
    onSuccess: (res) => {
      if (!res.ok) return toast.error(res.error);
      toast.success("발표 준비 완료 — 슬라이드가 확정됐습니다.");
      qc.invalidateQueries({ queryKey: stateKey });
    },
  });

  const genMut = useMutation({
    mutationFn: () => generate({ data: { userId } }),
    onSuccess: (res) => {
      if (!res.ok) return toast.error(res.error);
      toast.success("AI 초안이 도착했습니다. 반드시 편집·확정 후 발표합니다.");
      qc.invalidateQueries({ queryKey: stateKey });
    },
  });

  const isComplete = useMemo(
    () =>
      slides.length === 6 &&
      slides.every((s) => s.heading.trim() && s.body.trim()),
    [slides],
  );

  function updateSlide(i: number, patch: Partial<Slide>) {
    setSlides((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
    setDirty(true);
  }

  const activeSlide = slides[activeIdx] ?? { heading: "", body: "" };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border-2 border-primary/20 bg-card p-5 shadow-sm">
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50/70 p-3 text-xs text-amber-900">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>
            <b>AI 초안은 참고용</b>입니다. 초안을 만든 뒤 반드시 각 슬라이드 문장을 직접 편집하고,
            &quot;발표 준비 완료&quot;를 눌러야 발표에 사용됩니다.
          </p>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex-1 min-w-[200px]">
            <Label htmlFor="deck-title">발표 제목</Label>
            <Input
              id="deck-title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setDirty(true);
              }}
              placeholder="예: 힌트 3단계 챗봇 만들기"
              disabled={locked}
              maxLength={200}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => genMut.mutate()}
            disabled={locked || genMut.isPending}
            className="gap-1.5"
          >
            <Sparkles className="h-4 w-4" aria-hidden />
            {genMut.isPending ? "생성 중…" : "AI 초안 만들기"}
          </Button>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_360px]">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {SECTION_LABELS.map((lab, i) => {
              const s = slides[i];
              const filled = !!(s?.heading.trim() && s?.body.trim());
              const active = activeIdx === i;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveIdx(i)}
                  className={`inline-flex items-center gap-1 rounded-full border-2 px-2.5 py-1 text-xs font-semibold transition-all ${
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : filled
                        ? "border-primary/40 bg-accent/40 text-primary"
                        : "border-border/50 bg-card text-muted-foreground"
                  }`}
                >
                  {filled && <CheckCircle2 className="h-3 w-3" aria-hidden />}
                  {lab}
                </button>
              );
            })}
          </div>

          <div className="rounded-2xl border-2 border-primary/20 bg-card p-4 shadow-sm">
            <Label className="text-xs text-muted-foreground">
              {SECTION_LABELS[activeIdx]} · 슬라이드 제목 (10자 내외 권장)
            </Label>
            <Input
              value={activeSlide.heading}
              onChange={(e) => updateSlide(activeIdx, { heading: e.target.value })}
              placeholder="한 줄 헤드라인"
              disabled={locked}
              maxLength={200}
              className="mt-1"
            />
            <Label className="mt-3 text-xs text-muted-foreground">본문 (2~4문장)</Label>
            <Textarea
              value={activeSlide.body}
              onChange={(e) => updateSlide(activeIdx, { body: e.target.value })}
              placeholder="발표할 내용을 직접 다듬어 주세요"
              disabled={locked}
              rows={7}
              maxLength={1500}
              className="mt-1"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              onClick={() => saveMut.mutate()}
              disabled={locked || !dirty || saveMut.isPending}
              variant="outline"
              className="gap-1.5"
            >
              <Save className="h-4 w-4" aria-hidden />
              {saveMut.isPending ? "저장 중…" : "저장"}
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (dirty) saveMut.mutate();
                confirmMut.mutate();
              }}
              disabled={locked || !isComplete || confirmMut.isPending}
              className="gap-1.5"
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              {locked
                ? "확정 완료"
                : confirmMut.isPending
                  ? "확정 중…"
                  : "발표 준비 완료"}
            </Button>
            {locked && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">
                <Lock className="h-3 w-3" aria-hidden />
                확정된 슬라이드는 편집할 수 없어요
              </span>
            )}
            <span className="ml-auto text-xs text-muted-foreground">
              6장 중 {slides.filter((s) => s.heading.trim() && s.body.trim()).length}장 채움
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground">미리보기</p>
          <SlidePreview
            heading={activeSlide.heading}
            body={activeSlide.body}
            page={activeIdx + 1}
            total={6}
            presenterName={nickname}
            variant={activeIdx === 0 ? "cover" : "default"}
            width={340}
            height={191}
          />
          <div className="grid grid-cols-3 gap-2">
            {slides.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActiveIdx(i)}
                className={`overflow-hidden rounded-lg border-2 ${
                  activeIdx === i ? "border-primary" : "border-border/40"
                }`}
                aria-label={`슬라이드 ${i + 1}로 이동`}
              >
                <SlidePreview
                  heading={s.heading}
                  body={s.body}
                  page={i + 1}
                  total={6}
                  presenterName={nickname}
                  variant={i === 0 ? "cover" : "default"}
                  width={110}
                  height={62}
                  className="border-0 shadow-none"
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
