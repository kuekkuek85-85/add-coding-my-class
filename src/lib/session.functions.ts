import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const nicknameSchema = z
  .string()
  .trim()
  .min(1, "닉네임을 입력하세요")
  .max(20, "닉네임은 20자 이내");
const codeSchema = z
  .string()
  .trim()
  .min(3, "입장 코드를 입력하세요")
  .max(20)
  .transform((s) => s.toUpperCase());

export const enterSession = createServerFn({ method: "POST" })
  .inputValidator((input: { code: string; nickname: string }) =>
    z.object({ code: codeSchema, nickname: nicknameSchema }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Try participant code first
    const { data: byParticipant } = await supabaseAdmin
      .from("sessions")
      .select("id, name, participant_code, instructor_code")
      .eq("participant_code", data.code)
      .maybeSingle();

    let sessionRow = byParticipant;
    let role: "participant" | "instructor" = "participant";

    if (!sessionRow) {
      const { data: byInstructor } = await supabaseAdmin
        .from("sessions")
        .select("id, name, participant_code, instructor_code")
        .eq("instructor_code", data.code)
        .maybeSingle();
      if (byInstructor) {
        sessionRow = byInstructor;
        role = "instructor";
      }
    }

    if (!sessionRow) {
      return { ok: false as const, error: "입장 코드를 확인해 주세요." };
    }

    // If nickname already exists in this session with same role, re-use (same user re-entering)
    const { data: existing } = await supabaseAdmin
      .from("app_users")
      .select("id, role")
      .eq("session_id", sessionRow.id)
      .eq("nickname", data.nickname)
      .maybeSingle();

    if (existing) {
      if (existing.role !== role) {
        return {
          ok: false as const,
          error: "이 닉네임은 다른 역할로 이미 사용 중입니다. 다른 닉네임을 사용해 주세요.",
        };
      }
      await supabaseAdmin
        .from("app_users")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", existing.id);
      return {
        ok: true as const,
        userId: existing.id,
        sessionId: sessionRow.id,
        sessionName: sessionRow.name,
        role,
        nickname: data.nickname,
      };
    }

    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from("app_users")
      .insert({
        session_id: sessionRow.id,
        nickname: data.nickname,
        role,
      })
      .select("id")
      .single();

    if (insertErr || !inserted) {
      return { ok: false as const, error: "입장에 실패했습니다. 다시 시도해 주세요." };
    }

    return {
      ok: true as const,
      userId: inserted.id,
      sessionId: sessionRow.id,
      sessionName: sessionRow.name,
      role,
      nickname: data.nickname,
    };
  });

export const getSessionSnapshot = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string }) =>
    z.object({ userId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: user } = await supabaseAdmin
      .from("app_users")
      .select("id, nickname, role, session_id")
      .eq("id", data.userId)
      .maybeSingle();
    if (!user) return { ok: false as const, error: "세션이 만료되었습니다." };

    const { data: session } = await supabaseAdmin
      .from("sessions")
      .select("id, name, participant_code, instructor_code, current_stage, current_slide_index")
      .eq("id", user.session_id)
      .single();

    const { data: members } = await supabaseAdmin
      .from("app_users")
      .select("id, nickname, role, last_seen_at")
      .eq("session_id", user.session_id)
      .order("created_at", { ascending: true });

    await supabaseAdmin
      .from("app_users")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", user.id);

    return {
      ok: true as const,
      user: { id: user.id, nickname: user.nickname, role: user.role as "participant" | "instructor" },
      session: session!,
      members: members ?? [],
    };
  });

export const setCurrentStage = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string; stageNo: number }) =>
    z
      .object({
        userId: z.string().uuid(),
        stageNo: z.number().int().min(1).max(6),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Verify caller is instructor
    const { data: caller } = await supabaseAdmin
      .from("app_users")
      .select("id, role, session_id")
      .eq("id", data.userId)
      .maybeSingle();

    if (!caller) {
      return { ok: false as const, error: "세션이 만료되었습니다." };
    }
    if (caller.role !== "instructor") {
      return { ok: false as const, error: "강사만 스테이지를 열 수 있습니다." };
    }

    const { error } = await supabaseAdmin
      .from("sessions")
      .update({ current_stage: data.stageNo })
      .eq("id", caller.session_id);

    if (error) {
      return { ok: false as const, error: "스테이지 변경에 실패했습니다." };
    }

    return { ok: true as const, currentStage: data.stageNo };
  });

export const setCurrentSlide = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string; slideIndex: number | null }) =>
    z
      .object({
        userId: z.string().uuid(),
        slideIndex: z.number().int().min(0).max(99).nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: caller } = await supabaseAdmin
      .from("app_users")
      .select("id, role, session_id")
      .eq("id", data.userId)
      .maybeSingle();
    if (!caller) return { ok: false as const, error: "세션이 만료되었습니다." };
    if (caller.role !== "instructor") {
      return { ok: false as const, error: "강사만 강의 슬라이드를 조작할 수 있습니다." };
    }
    const { error } = await supabaseAdmin
      .from("sessions")
      .update({ current_slide_index: data.slideIndex })
      .eq("id", caller.session_id);
    if (error) return { ok: false as const, error: "슬라이드 변경에 실패했습니다." };
    return { ok: true as const, slideIndex: data.slideIndex };
  });
