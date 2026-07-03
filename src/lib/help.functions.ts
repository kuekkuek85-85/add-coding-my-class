import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * 신호등(도움 요청) — 참가자가 초록/노랑/빨강 상태를 상시 알린다.
 * 참가자당 최신 상태 1건만 유지(upsert). 강사석에서 5초 이내 반영.
 */

const uuid = z.string().uuid();
const levelSchema = z.enum(["green", "yellow", "red"]);

async function getUser(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("app_users")
    .select("id, role, session_id")
    .eq("id", userId)
    .maybeSingle();
  return data;
}

export const getMyHelpSignal = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string }) => z.object({ userId: uuid }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const user = await getUser(data.userId);
    if (!user) return { ok: false as const, error: "세션이 만료되었습니다." };

    const { data: row } = await supabaseAdmin
      .from("help_signals")
      .select("level, note, updated_at")
      .eq("user_id", user.id)
      .maybeSingle();

    return {
      ok: true as const,
      level: (row?.level ?? "green") as "green" | "yellow" | "red",
      note: row?.note ?? null,
      updatedAt: row?.updated_at ?? null,
    };
  });

export const setMyHelpSignal = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { userId: string; level: "green" | "yellow" | "red"; note?: string | null }) =>
      z
        .object({
          userId: uuid,
          level: levelSchema,
          note: z.string().trim().max(140).optional().nullable(),
        })
        .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const user = await getUser(data.userId);
    if (!user) return { ok: false as const, error: "세션이 만료되었습니다." };
    if (user.role !== "participant") {
      return { ok: false as const, error: "참가자만 신호등을 켤 수 있습니다." };
    }

    const { error } = await supabaseAdmin
      .from("help_signals")
      .upsert(
        {
          user_id: user.id,
          session_id: user.session_id,
          level: data.level,
          note: data.note ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

    if (error) return { ok: false as const, error: "신호 저장에 실패했습니다." };
    return { ok: true as const, level: data.level };
  });

export const listSessionHelpSignals = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string }) => z.object({ userId: uuid }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const caller = await getUser(data.userId);
    if (!caller) return { ok: false as const, error: "세션이 만료되었습니다." };
    if (caller.role !== "instructor") {
      return { ok: false as const, error: "강사만 조회할 수 있습니다." };
    }

    const [{ data: members }, { data: signals }] = await Promise.all([
      supabaseAdmin
        .from("app_users")
        .select("id, nickname")
        .eq("session_id", caller.session_id)
        .eq("role", "participant"),
      supabaseAdmin
        .from("help_signals")
        .select("user_id, level, note, updated_at")
        .eq("session_id", caller.session_id),
    ]);

    const byUser = new Map(
      (signals ?? []).map((s) => [s.user_id, s]),
    );
    const rows = (members ?? []).map((m) => {
      const s = byUser.get(m.id);
      return {
        userId: m.id,
        nickname: m.nickname,
        level: (s?.level ?? "green") as "green" | "yellow" | "red",
        note: s?.note ?? null,
        updatedAt: s?.updated_at ?? null,
      };
    });

    return { ok: true as const, signals: rows };
  });
