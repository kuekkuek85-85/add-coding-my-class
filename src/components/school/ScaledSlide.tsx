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
        ) : slide.kind === "compare" && slide.compare ? (
          <>
            <h2 className="slide-title font-display font-bold text-chalk">
              {slide.title}
            </h2>
            <div className="mt-12 grid grid-cols-2 gap-10">
              <CompareColumn
                label={slide.compare.left.label}
                items={slide.compare.left.items}
                tone="do"
              />
              <CompareColumn
                label={slide.compare.right.label}
                items={slide.compare.right.items}
                tone="dont"
              />
            </div>
          </>
        ) : slide.kind === "stat" && slide.stats ? (
          <>
            <h2 className="slide-title font-display font-bold text-chalk">
              {slide.title}
            </h2>
            <div className="mt-12 grid grid-cols-3 gap-8">
              {slide.stats.map((s, i) => (
                <div
                  key={i}
                  className="flex min-h-[380px] flex-col justify-between rounded-3xl border-2 border-accent/40 bg-chalk/10 p-10"
                >
                  <p className="slide-title font-display font-black text-accent">
                    {s.value}
                  </p>
                  <div>
                    <p className="slide-body-lg font-display font-bold text-chalk">
                      {s.label}
                    </p>
                    {s.caption && (
                      <p className="slide-caption mt-4 text-chalk/70">{s.caption}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
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
                {slide.bullets.map((raw, i) => {
                  const b = typeof raw === "string" ? { title: raw } : raw;
                  return (
                    <li key={i} className="flex items-start gap-6">
                      <span
                        className={cn(
                          "mt-2 inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full font-display font-bold",
                          slide.kind === "steps"
                            ? "bg-accent text-primary"
                            : "bg-chalk/15 text-accent",
                        )}
                        style={{ fontSize: 30 }}
                        aria-hidden
                      >
                        {slide.kind === "steps" ? i + 1 : "·"}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="slide-body-lg font-display font-bold text-chalk">
                          {b.title}
                        </p>
                        {b.caption && (
                          <p className="slide-body mt-2 text-chalk/75">
                            {b.caption}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
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

function CompareColumn({
  label,
  items,
  tone,
}: {
  label: string;
  items: string[];
  tone: "do" | "dont";
}) {
  const isDo = tone === "do";
  return (
    <div
      className={cn(
        "flex min-h-[560px] flex-col rounded-3xl border-2 p-10",
        isDo
          ? "border-accent/50 bg-chalk/10"
          : "border-chalk/25 bg-chalk/5",
      )}
    >
      <div className="mb-6 flex items-center gap-4">
        <span
          className={cn(
            "inline-flex h-12 w-12 items-center justify-center rounded-full font-display font-black",
            isDo ? "bg-accent text-primary" : "bg-chalk/25 text-chalk",
          )}
          style={{ fontSize: 26 }}
          aria-hidden
        >
          {isDo ? "O" : "X"}
        </span>
        <p
          className={cn(
            "slide-subtitle font-display font-bold",
            isDo ? "text-accent" : "text-chalk/85",
          )}
        >
          {label}
        </p>
      </div>
      <ul className="flex flex-1 flex-col gap-5">
        {items.map((it, i) => (
          <li key={i} className="flex items-start gap-4">
            <span
              className={cn(
                "mt-4 inline-block h-3 w-3 shrink-0 rounded-full",
                isDo ? "bg-accent" : "bg-chalk/50",
              )}
              aria-hidden
            />
            <span className="slide-body text-chalk">{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
