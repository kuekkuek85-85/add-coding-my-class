import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * S1(글쌤봇 따라하기) 체크포인트 + 오전 "내 수업이라면?" 30초 메모 관련 서버 함수.
 * - 참가자: 자신의 체크포인트 토글, 메모 작성/조회
 * - 강사: 참가자별 S1 통과 개수 요약
 */

const uuid = z.string().uuid();

async function getUser(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("app_users")
    .select("id, role, session_id")
    .eq("id", userId)
    .maybeSingle();
  return data;
}

export const getMyS1State = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string }) => z.object({ userId: uuid }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const user = await getUser(data.userId);
    if (!user) return { ok: false as const, error: "세션이 만료되었습니다." };

    const [{ data: checkpoints }, { data: progress }, { data: memos }] = await Promise.all([
      supabaseAdmin
        .from("checkpoints")
        .select("id, seq, label, hint")
        .eq("stage_no", 1)
        .order("seq", { ascending: true }),
      supabaseAdmin
        .from("checkpoint_progress")
        .select("checkpoint_id, checked_at")
        .eq("user_id", user.id),
      supabaseAdmin
        .from("morning_memos")
        .select("id, stage_no, text, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    return {
      ok: true as const,
      checkpoints: checkpoints ?? [],
      checkedIds: (progress ?? []).map((p) => p.checkpoint_id),
      memos: memos ?? [],
    };
  });

export const toggleCheckpoint = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string; checkpointId: string; on: boolean }) =>
    z.object({ userId: uuid, checkpointId: uuid, on: z.boolean() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const user = await getUser(data.userId);
    if (!user) return { ok: false as const, error: "세션이 만료되었습니다." };
    if (user.role !== "participant") {
      return { ok: false as const, error: "참가자만 체크할 수 있습니다." };
    }

    if (data.on) {
      const { error } = await supabaseAdmin
        .from("checkpoint_progress")
        .upsert(
          { user_id: user.id, checkpoint_id: data.checkpointId },
          { onConflict: "user_id,checkpoint_id" },
        );
      if (error) return { ok: false as const, error: "저장에 실패했습니다." };
    } else {
      const { error } = await supabaseAdmin
        .from("checkpoint_progress")
        .delete()
        .eq("user_id", user.id)
        .eq("checkpoint_id", data.checkpointId);
      if (error) return { ok: false as const, error: "저장에 실패했습니다." };
    }

    return { ok: true as const };
  });

export const addMemo = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string; stageNo: number; text: string }) =>
    z
      .object({
        userId: uuid,
        stageNo: z.number().int().min(1).max(2),
        text: z.string().trim().min(1, "메모 내용을 입력하세요").max(280, "280자 이내로 작성해 주세요"),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const user = await getUser(data.userId);
    if (!user) return { ok: false as const, error: "세션이 만료되었습니다." };
    if (user.role !== "participant") {
      return { ok: false as const, error: "참가자만 메모를 작성할 수 있습니다." };
    }

    const { data: inserted, error } = await supabaseAdmin
      .from("morning_memos")
      .insert({
        user_id: user.id,
        session_id: user.session_id,
        stage_no: data.stageNo,
        text: data.text.trim(),
      })
      .select("id")
      .single();

    if (error || !inserted) return { ok: false as const, error: "메모 저장에 실패했습니다." };
    return { ok: true as const, id: inserted.id };
  });

export const deleteMemo = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string; memoId: string }) =>
    z.object({ userId: uuid, memoId: uuid }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const user = await getUser(data.userId);
    if (!user) return { ok: false as const, error: "세션이 만료되었습니다." };

    const { error } = await supabaseAdmin
      .from("morning_memos")
      .delete()
      .eq("id", data.memoId)
      .eq("user_id", user.id); // ownership guard
    if (error) return { ok: false as const, error: "삭제에 실패했습니다." };
    return { ok: true as const };
  });

/**
 * 강사용: 세션 내 모든 참가자의 S1 체크포인트 통과 개수와 오전 메모 개수.
 */
export const getInstructorS1Summary = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string }) => z.object({ userId: uuid }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const caller = await getUser(data.userId);
    if (!caller) return { ok: false as const, error: "세션이 만료되었습니다." };
    if (caller.role !== "instructor") {
      return { ok: false as const, error: "강사만 조회할 수 있습니다." };
    }

    const [{ data: checkpoints }, { data: members }] = await Promise.all([
      supabaseAdmin.from("checkpoints").select("id").eq("stage_no", 1),
      supabaseAdmin
        .from("app_users")
        .select("id, nickname")
        .eq("session_id", caller.session_id)
        .eq("role", "participant"),
    ]);

    const total = checkpoints?.length ?? 0;
    const userIds = (members ?? []).map((m) => m.id);

    const [{ data: progress }, { data: memos }] = await Promise.all([
      userIds.length
        ? supabaseAdmin
            .from("checkpoint_progress")
            .select("user_id, checkpoint_id")
            .in("user_id", userIds)
        : Promise.resolve({ data: [] as { user_id: string; checkpoint_id: string }[] }),
      userIds.length
        ? supabaseAdmin
            .from("morning_memos")
            .select("user_id")
            .in("user_id", userIds)
        : Promise.resolve({ data: [] as { user_id: string }[] }),
    ]);

    const checkedByUser = new Map<string, number>();
    for (const row of progress ?? []) {
      checkedByUser.set(row.user_id, (checkedByUser.get(row.user_id) ?? 0) + 1);
    }
    const memoByUser = new Map<string, number>();
    for (const row of memos ?? []) {
      memoByUser.set(row.user_id, (memoByUser.get(row.user_id) ?? 0) + 1);
    }

    return {
      ok: true as const,
      totalCheckpoints: total,
      progress: (members ?? []).map((m) => ({
        userId: m.id,
        checked: checkedByUser.get(m.id) ?? 0,
        memoCount: memoByUser.get(m.id) ?? 0,
      })),
    };
  });
