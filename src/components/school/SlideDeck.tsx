import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Play, X } from "lucide-react";
import { toast } from "sonner";

import { setCurrentSlide } from "@/lib/session.functions";
import { SLIDES } from "@/lib/slides";
import { ScaledSlide } from "@/components/school/ScaledSlide";
import { Button } from "@/components/ui/button";

type Props = {
  userId: string;
  currentSlideIndex: number | null;
  snapshotKey: readonly unknown[];
};

/**
 * 강사 전용 강의 슬라이드 컨트롤러.
 * 낙관적 로컬 인덱스로 빠른 연속 클릭에도 스택 없이 반영.
 */
export function InstructorSlideDeck({ userId, currentSlideIndex, snapshotKey }: Props) {
  const queryClient = useQueryClient();
  const changeSlide = useServerFn(setCurrentSlide);

  const total = SLIDES.length;
  // 서버 값과 낙관적 값 중 최신 것을 로컬 상태로 유지
  const [localIndex, setLocalIndex] = useState<number | null>(currentSlideIndex);
  const lastServerRef = useRef<number | null>(currentSlideIndex);

  // 서버 값이 바뀌면 로컬 값을 동기화 (사용자 최신 값 우선)
  useEffect(() => {
    if (currentSlideIndex !== lastServerRef.current) {
      lastServerRef.current = currentSlideIndex;
      setLocalIndex(currentSlideIndex);
    }
  }, [currentSlideIndex]);

  const active = localIndex !== null;
  const idx = active ? Math.min(localIndex!, total - 1) : 0;
  const slide = SLIDES[idx];

  const mut = useMutation({
    mutationFn: (slideIndex: number | null) =>
      changeSlide({ data: { userId, slideIndex } }),
    onSuccess: (res) => {
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      queryClient.invalidateQueries({ queryKey: snapshotKey });
    },
    onError: () => toast.error("슬라이드 전송에 실패했습니다."),
  });

  function push(next: number | null) {
    setLocalIndex(next);
    mut.mutate(next);
  }

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        if (idx < total - 1) push(idx + 1);
      } else if (e.key === "ArrowLeft") {
        if (idx > 0) push(idx - 1);
      } else if (e.key === "Escape") {
        push(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, idx, total]);


  if (!active) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-primary/30 bg-card/70 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-bold text-foreground">강의 슬라이드</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              강의 모드를 시작하면 참가자 화면에 슬라이드가 자동으로 노출됩니다.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => mut.mutate(0)}
            disabled={mut.isPending}
            className="gap-1.5"
          >
            <Play className="h-4 w-4" aria-hidden />
            강의 시작
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border-2 border-primary/30 bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-primary px-2.5 py-1 text-xs font-bold text-primary-foreground">
            강의 모드 ON
          </span>
          <span className="text-sm text-muted-foreground">
            {idx + 1} / {total} · <span className="font-mono">{slide.id}</span>
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            onClick={() => mut.mutate(Math.max(0, idx - 1))}
            disabled={mut.isPending || idx === 0}
            aria-label="이전 슬라이드"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            onClick={() => mut.mutate(Math.min(total - 1, idx + 1))}
            disabled={mut.isPending || idx === total - 1}
            aria-label="다음 슬라이드"
          >
            다음
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => mut.mutate(null)}
            disabled={mut.isPending}
            className="gap-1"
            aria-label="강의 종료"
          >
            <X className="h-4 w-4" />
            종료
          </Button>
        </div>
      </div>
      <ScaledSlide slide={slide} index={idx} total={total} />
      <p className="mt-2 text-xs text-muted-foreground">
        키보드: ← 이전, → 다음, Esc 종료. 참가자 화면은 최대 5초 이내 반영됩니다.
      </p>
    </div>
  );
}

/**
 * 참가자용 강의 오버레이. current_slide_index != null 이면 전체 화면 노출.
 */
export function ParticipantSlideOverlay({ slideIndex }: { slideIndex: number }) {
  const idx = Math.max(0, Math.min(slideIndex, SLIDES.length - 1));
  const slide = SLIDES[idx];
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-primary/95 backdrop-blur">
      <div className="flex items-center justify-between px-4 py-2 text-chalk">
        <span className="text-xs font-bold uppercase tracking-widest text-accent">
          강의 진행 중
        </span>
        <span className="rounded-full bg-chalk/15 px-2.5 py-1 font-mono text-xs">
          {idx + 1} / {SLIDES.length}
        </span>
      </div>
      <div className="flex flex-1 items-center justify-center px-4 pb-4">
        <div className="w-full max-w-[1400px]">
          <ScaledSlide slide={slide} index={idx} total={SLIDES.length} />
        </div>
      </div>
      <p className="pb-3 text-center text-xs text-chalk/70">
        강사가 슬라이드를 넘기면 자동으로 반영됩니다.
      </p>
    </div>
  );
}
