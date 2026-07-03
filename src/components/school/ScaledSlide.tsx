import { useEffect, useRef, useState } from "react";
import type { SlideDef } from "@/lib/slides";
import { cn } from "@/lib/utils";

type Props = {
  slide: SlideDef;
  index: number;
  total: number;
  className?: string;
};

/**
 * 1920x1080 고정 캔버스에 슬라이드를 렌더링하고 부모 컨테이너 크기에 맞춰
 * transform: scale로 축소한다. 모바일부터 프로젝터 화면까지 동일 코드로 표시.
 */
export function ScaledSlide({ slide, index, total, className }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      const sx = rect.width / 1920;
      const sy = rect.height / 1080;
      setScale(Math.min(sx, sy));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={wrapRef}
      className={cn(
        "relative w-full overflow-hidden rounded-2xl bg-primary shadow-2xl",
        className,
      )}
      style={{ aspectRatio: "16 / 9" }}
    >
      <div
        className="slide-canvas absolute left-1/2 top-1/2"
        style={{
          width: 1920,
          height: 1080,
          marginLeft: -960,
          marginTop: -540,
          transform: `scale(${scale})`,
          transformOrigin: "center center",
        }}
      >
        <SlideBody slide={slide} index={index} total={total} />
      </div>
    </div>
  );
}

function SlideBody({ slide, index, total }: { slide: SlideDef; index: number; total: number }) {
  return (
    <div className="slide-content relative flex h-full w-full flex-col bg-primary text-chalk">
      {/* 상단 chrome */}
      <div className="flex items-center justify-between px-24 pt-16">
        <div className="flex items-center gap-4">
          <span className="inline-block h-3 w-16 rounded-full bg-accent" aria-hidden />
          <span
            className="slide-chrome font-display font-bold uppercase tracking-[0.25em] text-accent"
          >
            내 수업에 코딩 한 스푼 · 심화반
          </span>
        </div>
        <span className="slide-page rounded-full bg-chalk/15 px-6 py-2 font-mono text-chalk">
          {index + 1} / {total}
        </span>
      </div>

      {/* 본문 */}
      <div className="flex flex-1 flex-col justify-center px-24">
        {slide.kicker && (
          <p className="slide-kicker mb-8 font-display font-bold text-accent">
            {slide.kicker}
          </p>
        )}

        {slide.kind === "title" ? (
          <>
            <h1 className="slide-title-lg font-display font-black text-chalk">
              {slide.title}
            </h1>
            {slide.subtitle && (
              <p className="slide-subtitle mt-10 max-w-[1400px] text-chalk/85">
                {slide.subtitle}
              </p>
            )}
          </>
        ) : slide.kind === "quote" ? (
          <>
            <p className="slide-title font-display font-bold text-chalk">
              {slide.title}
            </p>
            {slide.subtitle && (
              <p className="slide-body-lg mt-12 max-w-[1500px] text-chalk/85">
                {slide.subtitle}
              </p>
            )}
            {slide.caption && (
              <p className="slide-caption mt-10 text-accent">{slide.caption}</p>
            )}
          </>
        ) : slide.kind === "closing" ? (
          <>
            <h2 className="slide-title font-display font-bold text-chalk">
              {slide.title}
            </h2>
            {slide.subtitle && (
              <p className="slide-body-lg mt-10 max-w-[1500px] text-chalk/85">
                {slide.subtitle}
              </p>
            )}
          </>
        ) : (
          <>
            <h2 className="slide-title font-display font-bold text-chalk">
              {slide.title}
            </h2>
            {slide.subtitle && (
              <p className="slide-body-lg mt-6 max-w-[1500px] text-chalk/85">
                {slide.subtitle}
              </p>
            )}
            {slide.bullets && slide.bullets.length > 0 && (
              <ul className="mt-12 flex flex-col gap-6">
                {slide.bullets.map((b, i) => (
                  <li key={i} className="flex items-start gap-6">
                    <span
                      className={cn(
                        "mt-3 inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-display font-bold",
                        slide.kind === "steps"
                          ? "bg-accent text-primary"
                          : "bg-chalk/15 text-accent",
                      )}
                      style={{ fontSize: 28 }}
                      aria-hidden
                    >
                      {slide.kind === "steps" ? i + 1 : "·"}
                    </span>
                    <span className="slide-body-lg text-chalk">{b}</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>

      {/* 하단 footer */}
      <div className="flex items-center justify-between px-24 pb-16">
        <span className="slide-footer text-chalk/60">
          강사석에서만 페이지가 넘어갑니다.
        </span>
        <span className="slide-footer font-mono text-chalk/60">
          {slide.id}
        </span>
      </div>
    </div>
  );
}
