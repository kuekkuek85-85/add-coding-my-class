import { useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { listMissions } from "@/lib/missions.functions";
import type { StoredSession } from "@/lib/local-session";

/**
 * 새 미션 · 참여 · 해결 제출 · 채택 이벤트를 5초 폴링으로 감지해
 * 우측 하단 토스트로 알림.
 */
export function MissionToastListener({ session }: { session: StoredSession }) {
  const fetchFn = useServerFn(listMissions);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const seenRef = useRef<Map<string, { status: string; helperCount: number; submittedCount: number }> | null>(null);
  const bootedRef = useRef(false);

  const { data } = useQuery({
    queryKey: ["missions-list", session.userId],
    queryFn: () => fetchFn({ data: { userId: session.userId, status: "all" } }),
    refetchInterval: 5_000,
  });

  useEffect(() => {
    if (!data || !("ok" in data) || !data.ok) return;
    const current = new Map(
      data.missions.map((m) => [m.id, {
        status: m.status,
        helperCount: m.helperCount,
        submittedCount: m.submittedCount,
      }]),
    );
    if (!bootedRef.current) {
      seenRef.current = current;
      bootedRef.current = true;
      return;
    }
    const prev = seenRef.current ?? new Map();

    for (const m of data.missions) {
      const before = prev.get(m.id);
      const openIt = () => navigate({ to: "/missions" }).then(() => qc.invalidateQueries({ queryKey: ["missions-list"] }));
      if (!before) {
        // 새 미션. 본인이 올린 건 알림 제외.
        if (m.requesterNickname !== session.nickname) {
          toast("🎯 새 도움 미션", {
            description: `${m.requesterNickname}: ${m.title}`,
            position: "bottom-right",
            duration: 6000,
            action: { label: "보기", onClick: openIt },
          });
        }
      } else {
        if (m.submittedCount > before.submittedCount) {
          toast("✅ 해결책 제출", {
            description: `${m.title} — 확인해 보세요.`,
            position: "bottom-right",
            duration: 5000,
            action: { label: "보기", onClick: openIt },
          });
        } else if (m.helperCount > before.helperCount) {
          toast("🖐️ 새 헬퍼 참여", {
            description: m.title,
            position: "bottom-right",
            duration: 4000,
          });
        }
        if (before.status !== "resolved" && m.status === "resolved") {
          toast.success("🏆 미션 해결됨", {
            description: m.title,
            position: "bottom-right",
            duration: 5000,
          });
        }
      }
    }
    seenRef.current = current;
  }, [data, navigate, qc, session.nickname]);

  return null;
}
