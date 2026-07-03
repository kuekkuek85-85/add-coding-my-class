import { useEffect, useState } from "react";
import { Stamp } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * 오전 완료 도장.
 * S1 체크포인트 5/5 + S2 미니 게이트 통과 시 표시.
 * 첫 통과 순간에만 도장 애니메이션(회전+확대) 재생.
 */
export function MorningStamp({
  earned,
  className,
}: {
  earned: boolean;
  className?: string;
}) {
  const [animateOnce, setAnimateOnce] = useState(false);
  const [prev, setPrev] = useState<boolean | null>(null);

  useEffect(() => {
    if (prev === null) {
      setPrev(earned);
      return;
    }
    if (!prev && earned) {
      setAnimateOnce(true);
      const t = setTimeout(() => setAnimateOnce(false), 900);
      return () => clearTimeout(t);
    }
    setPrev(earned);
  }, [earned, prev]);

  if (!earned) return null;

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-2xl border-2 border-primary/40 bg-accent/30 px-4 py-3 shadow-sm",
        className,
      )}
      aria-live="polite"
    >
      <div>
        <p className="font-display text-xs font-bold uppercase tracking-widest text-primary/70">
          중간 도장 완료
        </p>
        <p className="mt-0.5 font-display text-base font-bold text-primary">
          S1 · S2 게이트 통과 — 쉬는 시간 뒤에 다시 뵐게요.
        </p>
      </div>
      <div
        className={cn(
          "inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-4 border-primary bg-card text-primary",
          animateOnce && "animate-stamp",
        )}
        aria-hidden
      >
        <Stamp className="h-7 w-7" />
      </div>
    </div>
  );
}
