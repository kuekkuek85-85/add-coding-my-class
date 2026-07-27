import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { useStoredSession } from "@/lib/local-session";
import { Button } from "@/components/ui/button";
import { MissionBoard } from "@/components/missions/MissionBoard";
import { MessageCenter } from "@/components/messages/MessageCenter";
import { MissionToastListener } from "@/components/missions/MissionToastListener";

export const Route = createFileRoute("/missions")({
  head: () => ({
    meta: [
      { title: "도움 미션 게시판 · 내 수업에 코딩 한 스푼" },
      { name: "description", content: "막힌 동료의 상황을 미션 카드로 정리하고 함께 해결하는 협업 게시판" },
      { property: "og:title", content: "도움 미션 게시판" },
      { property: "og:description", content: "동료 학습으로 문제를 함께 푸는 도움 미션 보드" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MissionsRoute,
});

function MissionsRoute() {
  const navigate = useNavigate();
  const { ready, session } = useStoredSession();
  if (!ready) return <div className="min-h-screen" />;
  if (!session) { navigate({ to: "/" }); return null; }

  const backTo = session.role === "instructor" ? "/instructor" : "/home";

  return (
    <main className="min-h-screen">
      <header className="border-b-2 border-primary/15 bg-card/60 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <Button asChild size="sm" variant="ghost">
            <Link to={backTo}><ArrowLeft className="mr-1 h-4 w-4" />돌아가기</Link>
          </Button>
          <div className="ml-auto text-xs text-muted-foreground">
            {session.nickname} · {session.role === "instructor" ? "강사" : "참가자"}
          </div>
        </div>
      </header>
      <section className="mx-auto max-w-5xl px-4 py-6">
        <MissionBoard session={session} />
      </section>
      <MessageCenter session={session} />
      <MissionToastListener session={session} />
    </main>
  );
}
