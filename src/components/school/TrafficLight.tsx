import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CircleCheck, CircleAlert, CircleX } from "lucide-react";
import { toast } from "sonner";

import { getMyHelpSignal, setMyHelpSignal } from "@/lib/help.functions";
import { cn } from "@/lib/utils";

type Level = "green" | "yellow" | "red";

const OPTIONS: Array<{
  level: Level;
  label: string;
  icon: typeof CircleCheck;
  tone: string;
  ring: string;
}> = [
  {
    level: "green",
    label: "잘 되고 있어요",
    icon: CircleCheck,
    tone: "bg-emerald-500 text-white",
    ring: "ring-emerald-600",
  },
  {
    level: "yellow",
    label: "잠깐 봐주세요",
    icon: CircleAlert,
    tone: "bg-amber-400 text-amber-950",
    ring: "ring-amber-600",
  },
  {
    level: "red",
    label: "막혔어요",
    icon: CircleX,
    tone: "bg-rose-500 text-white",
    ring: "ring-rose-600",
  },
];

/**
 * 참가자용 신호등 도움 요청 버튼.
 * - 색 + 아이콘 + 텍스트 병행(색약 접근성)
 * - 낙관적 업데이트 후 서버 upsert
 * - 강사석은 5초 간격으로 반영
 */
export function TrafficLight({ userId }: { userId: string }) {
  const fetchFn = useServerFn(getMyHelpSignal);
  const saveFn = useServerFn(setMyHelpSignal);

  const { data } = useQuery({
    queryKey: ["help-signal", userId],
    queryFn: () => fetchFn({ data: { userId } }),
    refetchOnWindowFocus: false,
  });

  const [local, setLocal] = useState<Level | null>(null);
  useEffect(() => {
    if (data?.ok && local === null) setLocal(data.level);
  }, [data, local]);

  const current: Level = local ?? (data?.ok ? data.level : "green");

  const mut = useMutation({
    mutationFn: (level: Level) => saveFn({ data: { userId, level } }),
    onSuccess: (res) => {
      if (!res.ok) toast.error(res.error);
    },
    onError: () => toast.error("저장에 실패했습니다."),
  });

  function choose(next: Level) {
    setLocal(next);
    mut.mutate(next);
  }

  return (
    <div
      className="flex items-center gap-1.5 rounded-full border-2 border-primary/15 bg-card/70 p-1 shadow-sm"
      role="radiogroup"
      aria-label="도움 요청 신호등"
    >
      {OPTIONS.map((opt) => {
        const active = current === opt.level;
        const Icon = opt.icon;
        return (
          <button
            key={opt.level}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={opt.label}
            title={opt.label}
            onClick={() => choose(opt.level)}
            className={cn(
              "inline-flex h-9 min-w-9 items-center justify-center gap-1 rounded-full px-2 text-xs font-semibold transition-all",
              active
                ? cn(opt.tone, "ring-2 ring-offset-1 ring-offset-card", opt.ring, "scale-105")
                : "bg-muted text-muted-foreground hover:bg-muted/70",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">
              {opt.level === "green" ? "초록" : opt.level === "yellow" ? "노랑" : "빨강"}
            </span>
          </button>
        );
      })}
    </div>
  );
}
