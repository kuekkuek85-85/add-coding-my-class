import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Target } from "lucide-react";

import { getInstructorMissionsOverview } from "@/lib/missions.functions";
import type { MissionStatus } from "@/lib/missions.functions";
import { StatusBadge } from "./mission-shared";
import { MissionDetailDialog } from "./MissionDetailDialog";
import { Button } from "@/components/ui/button";
import type { StoredSession } from "@/lib/local-session";

export function InstructorMissionsPanel({ session }: { session: StoredSession }) {
  const fetchFn = useServerFn(getInstructorMissionsOverview);
  const { data } = useQuery({
    queryKey: ["missions-overview", session.userId],
    queryFn: () => fetchFn({ data: { userId: session.userId } }),
    refetchInterval: 5_000,
  });
  const [selected, setSelected] = useState<string | null>(null);

  const ok = data && "ok" in data && data.ok === true && "counts" in data
    ? (data as { counts: { open: number; inProgress: number; resolved: number; cancelled: number }; recent: Array<{ id: string; title: string; status: string; updatedAt: string; requesterNickname: string }> })
    : null;

  return (
    <div className="rounded-2xl border-2 border-primary/20 bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 font-display text-sm font-bold text-primary">
          <Target className="h-4 w-4" /> 도움 미션
        </div>
        <Button asChild size="sm" variant="outline" className="h-8">
          <Link to="/missions">전체 게시판 열기</Link>
        </Button>
      </div>

      <div className="mb-3 grid grid-cols-4 gap-2 text-center">
        <Counter label="대기중" value={ok?.counts.open ?? 0} tone="amber" />
        <Counter label="진행중" value={ok?.counts.inProgress ?? 0} tone="sky" />
        <Counter label="해결됨" value={ok?.counts.resolved ?? 0} tone="emerald" />
        <Counter label="종료" value={ok?.counts.cancelled ?? 0} tone="slate" />
      </div>

      {!ok || ok.recent.length === 0 ? (
        <p className="text-sm text-muted-foreground">아직 등록된 미션이 없어요.</p>
      ) : (
        <ul className="space-y-1.5">
          {ok.recent.map((m) => (
            <li key={m.id}>
              <button
                onClick={() => setSelected(m.id)}
                className="flex w-full items-center gap-2 rounded-lg border bg-background px-3 py-2 text-left text-sm transition hover:bg-muted/40"
              >
                <StatusBadge status={m.status as MissionStatus} className="shrink-0" />
                <span className="truncate font-medium">{m.title}</span>
                <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                  {m.requesterNickname}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <MissionDetailDialog session={session} missionId={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function Counter({
  label, value, tone,
}: { label: string; value: number; tone: "amber" | "sky" | "emerald" | "slate" }) {
  const cls = {
    amber: "border-amber-300 bg-amber-50 text-amber-900",
    sky: "border-sky-300 bg-sky-50 text-sky-900",
    emerald: "border-emerald-300 bg-emerald-50 text-emerald-900",
    slate: "border-slate-300 bg-slate-50 text-slate-700",
  }[tone];
  return (
    <div className={`rounded-lg border p-2 ${cls}`}>
      <div className="font-display text-2xl font-bold leading-none">{value}</div>
      <div className="text-[11px]">{label}</div>
    </div>
  );
}
