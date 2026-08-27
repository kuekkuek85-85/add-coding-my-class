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

const avatarSchema = z
  .object({
    hair: z.string().max(20),
    hairColor: z.string().max(20),
    top: z.string().max(20),
    topColor: z.string().max(20),
    skin: z.string().max(20),
    accessory: z.string().max(20),
  })
  .nullable()
  .optional();

const seatIdSchema = z.string().trim().min(1).max(40).nullable().optional();

export const enterSession = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      code: string;
      nickname: string;
      avatar?: {
        hair: string;
        hairColor: string;
        top: string;
        topColor: string;
        skin: string;
        accessory: string;
      } | null;
      seatId?: string | null;
    }) =>
      z
        .object({
          code: codeSchema,
          nickname: nicknameSchema,
          avatar: avatarSchema,
          seatId: seatIdSchema,
        })
        .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Try participant code first
    const { data: byParticipant } = await supabaseAdmin
      .from("sessions")
      .select("id, name, participant_code, instructor_code, seat_layout, max_stage")
      .eq("participant_code", data.code)
      .maybeSingle();

    let sessionRow = byParticipant;
    let role: "participant" | "instructor" = "participant";

    if (!sessionRow) {
      const { data: byInstructor } = await supabaseAdmin
        .from("sessions")
        .select("id, name, participant_code, instructor_code, seat_layout, max_stage")
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

    // Instructors always get the fixed instructor desk
    const desiredSeat =
      role === "instructor" ? "instructor-desk" : (data.seatId ?? null);

    // Seat conflict check (only for participants selecting a seat)
    if (role === "participant" && desiredSeat) {
      const { data: seatHolder } = await supabaseAdmin
        .from("app_users")
        .select("id, nickname")
        .eq("session_id", sessionRow.id)
        .eq("seat_id", desiredSeat)
        .maybeSingle();
      if (seatHolder && seatHolder.nickname !== data.nickname) {
        return {
          ok: false as const,
          error: `이 자리는 ${seatHolder.nickname}님이 이미 앉아 있어요. 다른 자리를 선택해 주세요.`,
        };
      }
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
      const updatePayload: {
        last_seen_at: string;
        avatar?: typeof data.avatar;
        seat_id?: string;
        is_seated?: boolean;
      } = {
        last_seen_at: new Date().toISOString(),
      };
      if (data.avatar) updatePayload.avatar = data.avatar;
      if (desiredSeat) {
        updatePayload.seat_id = desiredSeat;
        updatePayload.is_seated = true;
      }
      await supabaseAdmin.from("app_users").update(updatePayload).eq("id", existing.id);
      return {
        ok: true as const,
        userId: existing.id,
        sessionId: sessionRow.id,
        sessionName: sessionRow.name,
        role,
        nickname: data.nickname,
        seatLayout: (sessionRow.seat_layout ?? "office") as "office" | "classroom",
        maxStage: sessionRow.max_stage ?? 7,
      };
    }

    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from("app_users")
      .insert({
        session_id: sessionRow.id,
        nickname: data.nickname,
        role,
        avatar: data.avatar ?? null,
        seat_id: desiredSeat,
        is_seated: !!desiredSeat,
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
      seatLayout: (sessionRow.seat_layout ?? "office") as "office" | "classroom",
      maxStage: sessionRow.max_stage ?? 7,
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
      .select("id, name, participant_code, instructor_code, current_stage, current_slide_index, max_stage, seat_layout")
      .eq("id", user.session_id)
      .single();

    const { data: members } = await supabaseAdmin
      .from("app_users")
      .select("id, nickname, role, last_seen_at, seat_id, avatar")
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

export const getOccupiedSeats = createServerFn({ method: "POST" })
  .inputValidator((input: { code: string }) =>
    z.object({ code: codeSchema }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: sess } = await supabaseAdmin
      .from("sessions")
      .select("id, seat_layout")
      .or(`participant_code.eq.${data.code},instructor_code.eq.${data.code}`)
      .maybeSingle();
    if (!sess) return { ok: false as const, error: "코드 없음" };
    const { data: rows } = await supabaseAdmin
      .from("app_users")
      .select("seat_id, nickname")
      .eq("session_id", sess.id)
      .not("seat_id", "is", null);
    return {
      ok: true as const,
      seatLayout: (sess.seat_layout ?? "office") as "office" | "classroom",
      seats: (rows ?? []).map((r) => ({
        seatId: r.seat_id as string,
        nickname: (r.nickname ?? "") as string,
      })),
    };
  });

export const checkExistingUser = createServerFn({ method: "POST" })
  .inputValidator((input: { code: string; nickname: string }) =>
    z.object({ code: codeSchema, nickname: nicknameSchema }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: sess } = await supabaseAdmin
      .from("sessions")
      .select("id, participant_code, instructor_code")
      .or(`participant_code.eq.${data.code},instructor_code.eq.${data.code}`)
      .maybeSingle();
    if (!sess) return { ok: false as const, error: "코드 없음" };
    const role: "participant" | "instructor" =
      sess.instructor_code === data.code ? "instructor" : "participant";
    const { data: existing } = await supabaseAdmin
      .from("app_users")
      .select("id, role, avatar, seat_id")
      .eq("session_id", sess.id)
      .eq("nickname", data.nickname)
      .maybeSingle();
    return {
      ok: true as const,
      role,
      exists: !!existing && existing.role === role,
      hasAvatar: !!existing?.avatar,
      hasSeat: !!existing?.seat_id,
    };
  });

export const setCurrentStage = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string; stageNo: number }) =>
    z
      .object({
        userId: z.string().uuid(),
        stageNo: z.number().int().min(1).max(7),
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

    const { data: sess } = await supabaseAdmin
      .from("sessions")
      .select("max_stage")
      .eq("id", caller.session_id)
      .maybeSingle();
    const maxStage = sess?.max_stage ?? 7;
    if (data.stageNo > maxStage) {
      return {
        ok: false as const,
        error: `이 기수는 S${maxStage}까지 운영합니다.`,
      };
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

export const renameNickname = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string; nickname: string }) =>
    z.object({ userId: z.string().uuid(), nickname: nicknameSchema }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: me } = await supabaseAdmin
      .from("app_users")
      .select("id, session_id, nickname")
      .eq("id", data.userId)
      .maybeSingle();
    if (!me) return { ok: false as const, error: "세션이 만료되었습니다." };
    if (me.nickname === data.nickname) {
      return { ok: true as const, nickname: data.nickname };
    }
    const { data: dup } = await supabaseAdmin
      .from("app_users")
      .select("id")
      .eq("session_id", me.session_id)
      .eq("nickname", data.nickname)
      .maybeSingle();
    if (dup && dup.id !== me.id) {
      return { ok: false as const, error: "이미 사용 중인 닉네임입니다." };
    }
    const { error } = await supabaseAdmin
      .from("app_users")
      .update({ nickname: data.nickname })
      .eq("id", me.id);
    if (error) return { ok: false as const, error: "닉네임 변경에 실패했습니다." };
    return { ok: true as const, nickname: data.nickname };
  });

export const resetSessionData = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string }) =>
    z.object({ userId: z.string().uuid() }).parse(input),
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
      return { ok: false as const, error: "강사만 데이터를 초기화할 수 있습니다." };
    }
    const sessionId = caller.session_id;

    // Delete message_reads via messages in this session (no session_id column)
    const { data: sessionMessages } = await supabaseAdmin
      .from("messages")
      .select("id")
      .eq("session_id", sessionId);
    const messageIds = (sessionMessages ?? []).map((m) => m.id);
    if (messageIds.length > 0) {
      await supabaseAdmin.from("message_reads").delete().in("message_id", messageIds);
    }

    // Delete help mission helpers/comments via missions in this session
    const { data: sessionMissions } = await supabaseAdmin
      .from("help_missions")
      .select("id")
      .eq("session_id", sessionId);
    const missionIds = (sessionMissions ?? []).map((m) => m.id);
    if (missionIds.length > 0) {
      await supabaseAdmin.from("help_mission_helpers").delete().in("mission_id", missionIds);
      await supabaseAdmin.from("help_mission_comments").delete().in("mission_id", missionIds);
    }

    // Tables scoped by session_id
    const sessionScoped = [
      "help_signals",
      "help_missions",
      "messages",
      "morning_memos",
      "s2_test_cases",
      "s3_grill_questions",
      "s3_prd_drafts",
      "s3_reviews",
      "s4_prompts",
      "s4_test_cases",
      "s5_checklist_results",
      "s5_qa_reviews",
      "s5_revised_prompts",
      "s6_comments",
      "s6_presentation_queue",
      "s6_slide_decks",
      "s7_retrospectives",
      "dj_queue",
    ] as const;

    for (const t of sessionScoped) {
      const { error } = await supabaseAdmin.from(t).delete().eq("session_id", sessionId);
      if (error) return { ok: false as const, error: `${t} 초기화 실패: ${error.message}` };
    }


    // checkpoint_progress: only has user_id — scope via participants in this session
    const { data: participants } = await supabaseAdmin
      .from("app_users")
      .select("id")
      .eq("session_id", sessionId)
      .eq("role", "participant");
    const participantIds = (participants ?? []).map((p) => p.id);
    if (participantIds.length > 0) {
      const { error } = await supabaseAdmin
        .from("checkpoint_progress")
        .delete()
        .in("user_id", participantIds);
      if (error) return { ok: false as const, error: `checkpoint_progress 초기화 실패: ${error.message}` };
    }

    // Remove participant accounts (keep instructor)
    const { error: delUsersErr } = await supabaseAdmin
      .from("app_users")
      .delete()
      .eq("session_id", sessionId)
      .eq("role", "participant");
    if (delUsersErr) return { ok: false as const, error: `참가자 초기화 실패: ${delUsersErr.message}` };

    // Reset session pointers
    await supabaseAdmin
      .from("sessions")
      .update({ current_stage: 1, current_slide_index: null })
      .eq("id", sessionId);

    return { ok: true as const };
  });

/** 강사가 이 기수에서 열 수 있는 최대 교시(max_stage)를 변경 */
export const setMaxStage = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string; maxStage: number }) =>
    z
      .object({
        userId: z.string().uuid(),
        maxStage: z.number().int().min(1).max(7),
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
      return { ok: false as const, error: "강사만 운영 범위를 바꿀 수 있습니다." };
    }

    const { data: sess } = await supabaseAdmin
      .from("sessions")
      .select("current_stage")
      .eq("id", caller.session_id)
      .maybeSingle();

    const payload: { max_stage: number; current_stage?: number } = { max_stage: data.maxStage };
    if ((sess?.current_stage ?? 1) > data.maxStage) payload.current_stage = data.maxStage;

    const { error } = await supabaseAdmin
      .from("sessions")
      .update(payload)
      .eq("id", caller.session_id);
    if (error) return { ok: false as const, error: "운영 범위 변경에 실패했습니다." };
    return { ok: true as const, maxStage: data.maxStage };
  });
