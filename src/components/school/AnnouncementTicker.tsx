import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Megaphone } from "lucide-react";
import { listSessionBroadcasts } from "@/lib/messages.functions";

/** 상단 헤더 가운데에 강사가 보낸 공지(broadcast)를 2초마다 순환 */
export function AnnouncementTicker({ userId }: { userId: string }) {
  const fetchFn = useServerFn(listSessionBroadcasts);
  const { data } = useQuery({
    queryKey: ["session-broadcasts", userId],
    queryFn: () => fetchFn({ data: { userId } }),
    refetchInterval: 15000,
    enabled: !!userId,
  });

  const messages = (data?.ok ? data.messages : []) as Array<{ id: string; body: string }>;
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (messages.length <= 1) return;
    const t = setInterval(() => {
      setIdx((i) => (i + 1) % messages.length);
    }, 2000);
    return () => clearInterval(t);
  }, [messages.length]);

  useEffect(() => {
    if (idx >= messages.length) setIdx(0);
  }, [messages.length, idx]);

  if (messages.length === 0) {
    return (
      <div className="hidden min-w-0 flex-1 justify-center md:flex">
        <div className="flex items-center gap-2 rounded-full border border-primary/15 bg-white/60 px-3 py-1.5 text-xs text-muted-foreground">
          <Megaphone className="h-3.5 w-3.5 text-primary/60" aria-hidden />
          <span>강사 공지가 도착하면 여기에 표시됩니다</span>
        </div>
      </div>
    );
  }

  const current = messages[idx] ?? messages[0];
  // 마크다운 이미지 제거 · 링크는 URL 텍스트로 표시 · 개행은 공백
  const text = current.body
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return (
    <div className="hidden min-w-0 flex-1 justify-center md:flex">
      <div
        key={current.id}
        className="ticker-fade flex max-w-xl items-center gap-2 rounded-full border border-amber-300 bg-amber-50/90 px-3 py-1.5 text-xs font-medium text-amber-900 shadow-sm"
        title={text}
      >
        <Megaphone className="h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden />
        <span className="truncate">{text || "(내용 없음)"}</span>
        {messages.length > 1 && (
          <span className="shrink-0 rounded-full bg-amber-200/70 px-1.5 py-0.5 text-[10px] text-amber-900/80">
            {idx + 1}/{messages.length}
          </span>
        )}
      </div>
    </div>
  );
}
