import { cn } from "@/lib/utils";

/**
 * 1920×1080 좌표계로 렌더링한 뒤 컨테이너에 맞춰 축소되는 슬라이드 미리보기.
 * width/height 는 축소된 결과 크기(px). 내부는 실제 1920×1080 이후 scale.
 */
export function SlidePreview({
  heading,
  body,
  page,
  total,
  presenterName,
  width = 320,
  height = 180,
  variant = "default",
  className,
}: {
  heading: string;
  body: string;
  page: number;
  total: number;
  presenterName?: string;
  width?: number;
  height?: number;
  variant?: "default" | "cover";
  className?: string;
}) {
  const scale = Math.min(width / 1920, height / 1080);
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border-2 border-primary/20 bg-card shadow-sm",
        className,
      )}
      style={{ width, height }}
    >
      <div
        className="slide-content bg-gradient-to-br from-card to-accent/20 text-foreground"
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: `translate(-50%, -50%) scale(${scale})`,
          transformOrigin: "center center",
        }}
      >
        {variant === "cover" ? (
          <div className="flex h-full w-full flex-col justify-between p-24">
            <p className="slide-kicker text-primary">내 수업에 코딩 한 스푼</p>
            <div>
              <h1 className="slide-title-lg font-display font-bold text-foreground">
                {heading || "발표 제목"}
              </h1>
              {presenterName && (
                <p className="slide-subtitle mt-8 text-muted-foreground">
                  발표자 · {presenterName}
                </p>
              )}
            </div>
            <div className="flex items-end justify-between">
              <p className="slide-chrome text-primary">S6 · 갤러리 발표</p>
              <p className="slide-page text-muted-foreground">
                {page} / {total}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex h-full w-full flex-col p-24">
            <div className="flex items-center justify-between">
              <span className="slide-chrome rounded-full bg-primary/10 px-6 py-3 text-primary">
                {page}교시 발표
              </span>
              <span className="slide-page text-muted-foreground">
                {page} / {total}
              </span>
            </div>
            <div className="mt-10 flex-1">
              <h2 className="slide-title font-display font-bold text-foreground">
                {heading || "슬라이드 제목"}
              </h2>
              <div className="mt-10 max-w-[1400px]">
                <p className="slide-body whitespace-pre-wrap text-foreground/85">
                  {body || "본문을 입력해 주세요."}
                </p>
              </div>
            </div>
            {presenterName && (
              <p className="slide-chrome text-primary">발표자 · {presenterName}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
