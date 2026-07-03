import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronLeft, ChevronRight, Minimize2, X } from "lucide-react";

import { getPresentationState } from "@/lib/s6.functions";
import { Button } from "@/components/ui/button";
import { SlidePreview } from "@/components/s6/SlidePreview";

/**
 * 강사 화면에서 현재 발표자의 슬라이드를 큰 화면(오버레이/전체화면)으로 띄운다.
 * ← → : 슬라이드 이동, Esc : 닫기.
 */
export function PresentationFullscreen({
  userId,
  onClose,
}: {
  userId: string;
  onClose: () => void;
}) {
  const fetchState = useServerFn(getPresentationState);
  const { data } = useQuery({
    queryKey: ["s6-presentation", userId],
    queryFn: () => fetchState({ data: { userId } }),
    refetchInterval: 3_000,
  });

  const overlayRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 1280, h: 720 });
  const [index, setIndex] = useState(0);

  // 브라우저 전체화면 진입/이탈
  useEffect(() => {
    const el = overlayRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().catch(() => {
        /* 사용자 제스처가 아니면 실패할 수 있음 — 무시하고 오버레이만 유지 */
      });
    }
    const onFsChange = () => {
      if (!document.fullscreenElement) onClose();
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFsChange);
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    };
  }, [onClose]);

  const current = data?.ok ? data.current : null;
  const deck = data?.ok ? data.currentDeck : null;
  const slides = deck?.slides ?? [];
  const total = slides.length;

  useEffect(() => {
    setIndex(0);
  }, [current?.userId]);

  const goPrev = useCallback(
    () => setIndex((i) => Math.max(0, i - 1)),
    [],
  );
  const goNext = useCallback(
    () => setIndex((i) => Math.min(Math.max(0, total - 1), i + 1)),
    [total],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        goNext();
      } else if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goPrev, goNext, onClose]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => {
      const availW = el.clientWidth;
      const availH = el.clientHeight;
      const scale = Math.min(availW / 16, availH / 9);
      setSize({ w: Math.floor(scale * 16), h: Math.floor(scale * 9) });
    };
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
    return () => ro.disconnect();
  }, []);

  const clamped = Math.min(Math.max(index, 0), Math.max(0, total - 1));
  const s = slides[clamped];
  const isCover = clamped === 0;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[80] flex flex-col bg-black text-white"
      role="dialog"
      aria-label="발표 슬라이드 전체화면"
    >
      <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-black/60 px-4 py-2 text-sm">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-semibold">
            {current ? current.nickname : "발표자 대기 중"}
          </span>
          {deck && (
            <span className="hidden truncate text-white/80 sm:inline">
              · {deck.title}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs">
          {total > 0 && (
            <span className="rounded-full bg-white/10 px-2.5 py-0.5 font-semibold">
              {clamped + 1} / {total}
            </span>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-8 gap-1 text-white hover:bg-white/10"
            onClick={onClose}
            aria-label="닫기 (Esc)"
          >
            <Minimize2 className="h-4 w-4" aria-hidden />
            닫기
          </Button>
        </div>
      </div>

      <div ref={stageRef} className="relative flex flex-1 items-center justify-center overflow-hidden">
        {current && deck && s ? (
          <SlidePreview
            heading={s.heading}
            body={s.body}
            page={clamped + 1}
            total={total}
            presenterName={current.nickname}
            deployedUrl={isCover ? deck.deployedUrl : null}
            width={size.w}
            height={size.h}
          variant={isCover ? "cover" : "default"}
            className="border-white/10 shadow-2xl"
          />
        ) : (
          <div className="flex flex-col items-center gap-3 text-white/70">
            <X className="h-10 w-10" aria-hidden />
            <p className="text-lg font-semibold">현재 발표자가 없습니다.</p>
            <p className="text-sm">
              큐에서 발표자를 지정하면 이 화면에 슬라이드가 뜹니다.
            </p>
          </div>
        )}

        {total > 1 && (
          <>
            <button
              type="button"
              onClick={goPrev}
              disabled={clamped === 0}
              className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white transition-opacity hover:bg-white/20 disabled:opacity-30"
              aria-label="이전 슬라이드"
            >
              <ChevronLeft className="h-6 w-6" aria-hidden />
            </button>
            <button
              type="button"
              onClick={goNext}
              disabled={clamped >= total - 1}
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white transition-opacity hover:bg-white/20 disabled:opacity-30"
              aria-label="다음 슬라이드"
            >
              <ChevronRight className="h-6 w-6" aria-hidden />
            </button>
          </>
        )}
      </div>

      <div className="border-t border-white/10 bg-black/60 px-4 py-2 text-center text-[11px] text-white/60">
        ← → 이동 · Space 다음 · Esc 닫기
      </div>
    </div>
  );
}
