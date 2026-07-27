import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSlideTheme } from "@/lib/slide-theme";

/** 한 글자 = 한 <span> 으로 쪼개 무지개색을 순환 적용하기 위한 헬퍼. */
function RainbowText({ text, className }: { text: string; className?: string }) {
  return (
    <span className={cn("bamti-rainbow", className)}>
      {Array.from(text).map((ch, i) =>
        ch === " " ? (
          <span key={i} style={{ color: "inherit", WebkitTextStroke: 0, textShadow: "none" }}>
            {"\u00A0"}
          </span>
        ) : (
          <span key={i}>{ch}</span>
        ),
      )}
    </span>
  );
}

/**
 * 1920×1080 좌표계로 렌더링한 뒤 컨테이너에 맞춰 축소되는 슬라이드 미리보기.
 */
export function SlidePreview({
  heading,
  body,
  page,
  total,
  presenterName,
  deployedUrl,
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
  deployedUrl?: string | null;
  width?: number;
  height?: number;
  variant?: "default" | "cover";
  className?: string;
}) {
  const scale = Math.min(width / 1920, height / 1080);
  const theme = useSlideTheme();
  const isBamti = theme === "bamti";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border-2 shadow-sm",
        isBamti ? "border-black/70 bg-[#fefe6e]" : "border-primary/20 bg-card",
        className,
      )}
      style={{ width, height }}
    >
      <div
        className={cn(
          "slide-content",
          isBamti ? "slide-bamti" : "bg-gradient-to-br from-card to-accent/20 text-foreground",
        )}
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
            <p
              className={cn(
                "slide-kicker",
                isBamti ? "bamti-chip inline-block self-start rounded-full px-6 py-2" : "text-primary",
              )}
            >
              내 수업에 코딩 한 스푼
            </p>
            <div>
              {isBamti ? (
                <h1 className="slide-title-lg font-bold">
                  <RainbowText text={heading || "발표 제목"} />
                </h1>
              ) : (
                <h1 className="slide-title-lg font-display font-bold text-foreground">
                  {heading || "발표 제목"}
                </h1>
              )}
              {presenterName && (
                <p
                  className={cn(
                    "slide-subtitle mt-8",
                    isBamti ? "text-black/85" : "text-muted-foreground",
                  )}
                >
                  발표자 · {presenterName}
                </p>
              )}
              {deployedUrl && (
                <a
                  href={deployedUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className={cn(
                    "slide-body-lg mt-10 inline-flex max-w-full items-center gap-4 rounded-2xl px-8 py-5 font-semibold underline decoration-2 underline-offset-4",
                    isBamti
                      ? "bamti-bubble hover:brightness-95"
                      : "bg-primary/10 text-primary hover:bg-primary/15",
                  )}
                >
                  <ExternalLink className="h-10 w-10 shrink-0" aria-hidden />
                  <span className="break-all">{deployedUrl}</span>
                </a>
              )}
            </div>
            <div className="flex items-end justify-between">
              <p className={cn("slide-chrome", isBamti ? "text-black/70" : "text-primary")}>
                S6 · 갤러리 발표
              </p>
              <p
                className={cn(
                  "slide-page",
                  isBamti ? "bamti-chip rounded-full px-4 py-1" : "text-muted-foreground",
                )}
              >
                {page} / {total}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex h-full w-full flex-col p-24">
            <div className="flex items-center justify-between">
              <span
                className={cn(
                  "slide-chrome rounded-full px-6 py-3",
                  isBamti ? "bamti-chip" : "bg-primary/10 text-primary",
                )}
              >
                {page}교시 발표
              </span>
              <span
                className={cn(
                  "slide-page",
                  isBamti ? "bamti-chip rounded-full px-4 py-1" : "text-muted-foreground",
                )}
              >
                {page} / {total}
              </span>
            </div>
            <div className="mt-10 flex-1">
              {isBamti ? (
                <h2 className="slide-title font-bold">
                  <RainbowText text={heading || "슬라이드 제목"} />
                </h2>
              ) : (
                <h2 className="slide-title font-display font-bold text-foreground">
                  {heading || "슬라이드 제목"}
                </h2>
              )}
              <div className="mt-10 max-w-[1400px]">
                {isBamti ? (
                  <div className="bamti-body-plate">
                    <p className="slide-body whitespace-pre-wrap">
                      {body || "본문을 입력해 주세요."}
                    </p>
                  </div>
                ) : (
                  <p className="slide-body whitespace-pre-wrap text-foreground/85">
                    {body || "본문을 입력해 주세요."}
                  </p>
                )}
              </div>
            </div>
            {presenterName && (
              <p className={cn("slide-chrome", isBamti ? "text-black/75" : "text-primary")}>
                발표자 · {presenterName}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
