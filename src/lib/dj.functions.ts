import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { extractYoutubeId } from "./dj-utils";

const userIdSchema = z.string().uuid();

async function loadCaller(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: caller } = await supabaseAdmin
    .from("app_users")
    .select("id, nickname, role, session_id")
    .eq("id", userId)
    .maybeSingle();
  return { supabaseAdmin, caller };
}

export type DjTrack = {
  id: string;
  videoId: string;
  youtubeUrl: string;
  title: string;
  requesterId: string;
  requesterNickname: string;
  requesterRole: "participant" | "instructor";
  playedAt: string | null;
  createdAt: string;
  orderIndex: number;
};

export const listDjQueue = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string }) =>
    z.object({ userId: userIdSchema }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin, caller } = await loadCaller(data.userId);
    if (!caller) return { ok: false as const, error: "세션이 만료되었습니다." };

    const { data: rows } = await supabaseAdmin
      .from("dj_queue")
      .select("*")
      .eq("session_id", caller.session_id)
      .order("played_at", { ascending: true, nullsFirst: true })
      .order("order_index", { ascending: true })
      .order("created_at", { ascending: true });

    const tracks: DjTrack[] = (rows ?? []).map((r) => ({
      id: r.id as string,
      videoId: r.video_id as string,
      youtubeUrl: r.youtube_url as string,
      title: (r.title as string) ?? "",
      requesterId: r.requester_id as string,
      requesterNickname: r.requester_nickname as string,
      requesterRole: r.requester_role as "participant" | "instructor",
      playedAt: (r.played_at as string | null) ?? null,
      createdAt: r.created_at as string,
      orderIndex: r.order_index as number,
    }));

    return { ok: true as const, tracks };
  });

export const enqueueDjTrack = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { userId: string; url: string; title?: string; playNow?: boolean }) =>
      z
        .object({
          userId: userIdSchema,
          url: z.string().trim().min(1, "URL을 입력하세요").max(500),
          title: z.string().trim().max(120).optional(),
          playNow: z.boolean().optional(),
        })
        .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin, caller } = await loadCaller(data.userId);
    if (!caller) return { ok: false as const, error: "세션이 만료되었습니다." };

    const videoId = extractYoutubeId(data.url);
    if (!videoId) {
      return { ok: false as const, error: "유튜브 링크를 인식하지 못했습니다." };
    }

    // 강사만 즉시 재생 순서 강제 가능
    const playNow = data.playNow && caller.role === "instructor";

    let orderIndex = 0;
    if (playNow) {
      const { data: minRow } = await supabaseAdmin
        .from("dj_queue")
        .select("order_index")
        .eq("session_id", caller.session_id)
        .is("played_at", null)
        .order("order_index", { ascending: true })
        .limit(1)
        .maybeSingle();
      orderIndex = (minRow?.order_index ?? 0) - 1;
    } else {
      const { data: maxRow } = await supabaseAdmin
        .from("dj_queue")
        .select("order_index")
        .eq("session_id", caller.session_id)
        .is("played_at", null)
        .order("order_index", { ascending: false })
        .limit(1)
        .maybeSingle();
      orderIndex = (maxRow?.order_index ?? 0) + 1;
    }

    const { data: inserted, error } = await supabaseAdmin
      .from("dj_queue")
      .insert({
        session_id: caller.session_id,
        requester_id: caller.id,
        requester_nickname: caller.nickname,
        requester_role: caller.role,
        youtube_url: data.url,
        video_id: videoId,
        title: data.title ?? "",
        order_index: orderIndex,
      })
      .select("id")
      .single();

    if (error || !inserted) {
      return { ok: false as const, error: "큐에 추가하지 못했습니다." };
    }
    return { ok: true as const, trackId: inserted.id as string, playNow: !!playNow };
  });

export const removeDjTrack = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string; trackId: string }) =>
    z.object({ userId: userIdSchema, trackId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin, caller } = await loadCaller(data.userId);
    if (!caller) return { ok: false as const, error: "세션이 만료되었습니다." };

    const { data: track } = await supabaseAdmin
      .from("dj_queue")
      .select("id, requester_id, session_id")
      .eq("id", data.trackId)
      .maybeSingle();
    if (!track || track.session_id !== caller.session_id) {
      return { ok: false as const, error: "곡을 찾을 수 없습니다." };
    }
    if (caller.role !== "instructor" && track.requester_id !== caller.id) {
      return { ok: false as const, error: "본인이 신청한 곡만 삭제할 수 있습니다." };
    }
    await supabaseAdmin.from("dj_queue").delete().eq("id", data.trackId);
    return { ok: true as const };
  });

export const markDjTrackPlayed = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string; trackId: string }) =>
    z.object({ userId: userIdSchema, trackId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin, caller } = await loadCaller(data.userId);
    if (!caller) return { ok: false as const, error: "세션이 만료되었습니다." };
    if (caller.role !== "instructor") {
      return { ok: false as const, error: "강사만 재생 상태를 갱신할 수 있습니다." };
    }
    await supabaseAdmin
      .from("dj_queue")
      .update({ played_at: new Date().toISOString() })
      .eq("id", data.trackId)
      .eq("session_id", caller.session_id);
    return { ok: true as const };
  });
