import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Target } from "lucide-react";

import { listMissions } from "@/lib/missions.functions";
import { Button } from "@/components/ui/button";
import type { StoredSession } from "@/lib/local-session";
import { MissionComposer } from "./MissionComposer";

/** 헤더/홈에 놓는 미션 게시판 진입 링크 + 등록 버튼. */
export function MissionEntryButton({ session }: { session: StoredSession }) {
  const fetchFn = useServerFn(listMissions);
  const { data } = useQuery({
    queryKey: ["missions-list", session.userId],
    queryFn: () => fetchFn({ data: { userId: session.userId, status: "all" } }),
    refetchInterval: 15_000,
  });
  const active = data && "ok" in data && data.ok
    ? data.missions.filter((m) => m.status === "open" || m.status === "in_progress").length
    : 0;

  return (
    <Button asChild size="sm" variant="outline" className="relative h-9 gap-1">
      <Link to="/missions">
        <Target className="h-4 w-4" />
        <span className="hidden sm:inline">도움 미션</span>
        {active > 0 && (
          <span className="ml-1 rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white">
            {active}
          </span>
        )}
      </Link>
    </Button>
  );
}

/** 신호등 노랑/빨강 전환 훅에서 여는 모달을 재사용하기 위한 컨트롤러 */
export function useMissionComposerModal(session: StoredSession) {
  const [open, setOpen] = useState(false);
  const [defaultRaw, setDefaultRaw] = useState<string>("");
  return {
    open,
    openWith: (raw?: string) => { setDefaultRaw(raw ?? ""); setOpen(true); },
    close: () => setOpen(false),
    element: (
      <MissionComposer
        session={session}
        open={open}
        onOpenChange={setOpen}
        defaultRaw={defaultRaw}
      />
    ),
  };
}
