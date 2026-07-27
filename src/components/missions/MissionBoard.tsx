import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Users, MessageSquare, Sparkles } from "lucide-react";

import { listMissions } from "@/lib/missions.functions";
import type { MissionListItem, MissionStatus } from "@/lib/missions.functions";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { StoredSession } from "@/lib/local-session";
import { StatusBadge } from "./mission-shared";
import { MissionDetailDialog } from "./MissionDetailDialog";
import { MissionComposer } from "./MissionComposer";

export function MissionBoard({ session }: { session: StoredSession }) {
  const fetchFn = useServerFn(listMissions);
  const { data } = useQuery({
    queryKey: ["missions-list", session.userId],
    queryFn: () => fetchFn({ data: { userId: session.userId, status: "all" } }),
    refetchInterval: 5_000,
  });
  const missions: MissionListItem[] = data && "ok" in data && data.ok ? data.missions : [];

  const [selected, setSelected] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);

  function filter(status: MissionStatus[]) {
    return missions.filter((m) => status.includes(m.status));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl font-bold">🎯 도움 미션 게시판</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            막힌 친구를 함께 도와요. 여러 명이 붙어도 좋고, 각자 해결책을 제출할 수 있어요.
          </p>
        </div>
        <Button onClick={() => setComposerOpen(true)}>
          <Sparkles className="mr-1 h-4 w-4" /> 나도 미션 올리기
        </Button>
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">
            진행중 · 대기 <Badge variant="secondary" className="ml-1">{filter(["open", "in_progress"]).length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="resolved">
            해결됨 <Badge variant="secondary" className="ml-1">{filter(["resolved"]).length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="all">전체</TabsTrigger>
        </TabsList>
        <TabsContent value="active" className="mt-3">
          <MissionGrid items={filter(["open", "in_progress"])} onSelect={setSelected} />
        </TabsContent>
        <TabsContent value="resolved" className="mt-3">
          <MissionGrid items={filter(["resolved"])} onSelect={setSelected} />
        </TabsContent>
        <TabsContent value="all" className="mt-3">
          <MissionGrid items={missions} onSelect={setSelected} />
        </TabsContent>
      </Tabs>

      <MissionDetailDialog session={session} missionId={selected} onClose={() => setSelected(null)} />
      <MissionComposer session={session} open={composerOpen} onOpenChange={setComposerOpen} />
    </div>
  );
}

function MissionGrid({
  items,
  onSelect,
}: {
  items: MissionListItem[];
  onSelect: (id: string) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-muted p-8 text-center text-sm text-muted-foreground">
        해당 상태의 미션이 없어요.
      </div>
    );
  }
  return (
    <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {items.map((m) => (
        <li key={m.id}>
          <button
            onClick={() => onSelect(m.id)}
            className="group w-full rounded-2xl border-2 border-primary/15 bg-card p-4 text-left shadow-sm transition hover:border-primary/40 hover:shadow-md"
          >
            <div className="mb-2 flex items-center gap-2">
              <StatusBadge status={m.status} />
              <span className="text-xs text-muted-foreground">
                {m.requesterNickname}{m.requesterRole === "instructor" && " · 강사"}
              </span>
              <span className="ml-auto text-xs text-muted-foreground">
                {new Date(m.updatedAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            <p className="line-clamp-2 font-display font-semibold text-foreground group-hover:text-primary">
              {m.title}
            </p>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{m.summary}</p>
            {m.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {m.tags.slice(0, 4).map((t, i) => (
                  <Badge key={i} variant="outline" className="text-[10px]">{t}</Badge>
                ))}
              </div>
            )}
            <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> {m.helperCount}명 참여</span>
              {m.submittedCount > 0 && (
                <span className="inline-flex items-center gap-1 text-sky-700">
                  <MessageSquare className="h-3 w-3" /> 제출 {m.submittedCount}
                </span>
              )}
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}
