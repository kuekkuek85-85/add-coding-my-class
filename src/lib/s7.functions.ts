import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * S7(연수 마무리) 서버 함수.
 *
 * - 참가자: 포트폴리오 조회, 회고 저장/조회, 수료 상태 계산
 * - 강사: 회고 모음, 참가자별 수료 요약, 세션 종료/재개
 *
 * 원칙: AI 대필 없음. 회고 "배운 것" 필수(10자 이상).
 * 세션이 종료(sessions.closed_at != null)되면 회고 편집 거부.
 */

const uuid = z.string().uuid();

const S2_MIN = 2;

async function getUser(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("app_users")
    .select("id, role, session_id, nickname, deployed_url")
    .eq("id", userId)
    .maybeSingle();
  return data;
}


// ---------- 참가자: 포트폴리오 (내 산출물 모아보기) ----------

export const getMyPortfolio = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string }) => z.object({ userId: uuid }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const user = await getUser(data.userId);
    if (!user) return { ok: false as const, error: "세션이 만료되었습니다." };

    const [
      { data: session },
      { data: checkpoints },
      { data: progress },
      { data: memos },
      { data: s2cases },
      { data: prd },
      { data: prompt },
      { data: s4cases },
      { data: results },
      { data: revised },
      { data: deck },
      { data: queueRow },
      { data: comments },
      { data: retro },
    ] = await Promise.all([
      supabaseAdmin
        .from("sessions")
        .select("id, name, closed_at")
        .eq("id", user.session_id)
        .maybeSingle(),
      supabaseAdmin
        .from("checkpoints")
        .select("id, seq, label")
        .eq("stage_no", 1)
        .order("seq", { ascending: true }),
      supabaseAdmin
        .from("checkpoint_progress")
        .select("checkpoint_id")
        .eq("user_id", user.id),
      supabaseAdmin
        .from("morning_memos")
        .select("stage_no, text, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true }),
      supabaseAdmin
        .from("s2_test_cases")
        .select("title, given_when, expected_then, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true }),
      supabaseAdmin
        .from("s3_prd_drafts")
        .select(
          "problem, users, features, nonfunctional, success_metric, out_of_scope, submitted_v2_at",
        )
        .eq("user_id", user.id)
        .maybeSingle(),
      supabaseAdmin
        .from("s4_prompts")
        .select("role, context, task, nonfunctional, confirmed_at")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabaseAdmin
        .from("s4_test_cases")
        .select("id, title, given, when_step, then_step, order_index")
        .eq("user_id", user.id)
        .order("order_index", { ascending: true }),
      supabaseAdmin
        .from("s5_checklist_results")
        .select("test_case_id, status, note")
        .eq("user_id", user.id),
      supabaseAdmin
        .from("s5_revised_prompts")
        .select("target, evidence, keep_list, add_list, constraints, confirmed_at")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabaseAdmin
        .from("s6_slide_decks")
        .select("title, slides, confirmed_at")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabaseAdmin
        .from("s6_presentation_queue")
        .select("state, started_at, finished_at")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabaseAdmin
        .from("s6_comments")
        .select("good, question, created_at, commenter_id")
        .eq("presenter_id", user.id)
        .order("created_at", { ascending: true }),
      supabaseAdmin
        .from("s7_retrospectives")
        .select("learned, next_try, submitted_at, updated_at")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    // resolve commenter nicknames
    const commenterIds = Array.from(new Set((comments ?? []).map((c) => c.commenter_id)));
    const nicknameMap = new Map<string, string>();
    if (commenterIds.length > 0) {
      const { data: cUsers } = await supabaseAdmin
        .from("app_users")
        .select("id, nickname")
        .in("id", commenterIds);
      for (const u of cUsers ?? []) nicknameMap.set(u.id, u.nickname);
    }

    const checkpointList = (checkpoints ?? []).map((c) => ({
      id: c.id,
      seq: c.seq,
      label: c.label,
      done: (progress ?? []).some((p) => p.checkpoint_id === c.id),
    }));
    const s1Total = checkpointList.length;
    const s1Done = checkpointList.filter((c) => c.done).length;

    const resultMap = new Map((results ?? []).map((r) => [r.test_case_id, r]));
    const s4CasesEnriched = (s4cases ?? []).map((c) => ({
      title: c.title,
      given: c.given,
      when_step: c.when_step,
      then_step: c.then_step,
      result: resultMap.get(c.id) ?? null,
    }));
    const s5CheckedCount = (results ?? []).length;

    // stamps
    const s2Passed = (s2cases ?? []).length >= S2_MIN;
    const s3Passed = !!prd?.submitted_v2_at;
    const s4Confirmed = !!prompt?.confirmed_at;
    const s5Confirmed = !!revised?.confirmed_at;
    const s6Done = queueRow?.state === "done";
    const s1Complete = s1Total > 0 && s1Done >= s1Total;

    return {
      ok: true as const,
      session: {
        id: session?.id ?? user.session_id,
        name: session?.name ?? "",
        closedAt: session?.closed_at ?? null,
      },
      nickname: user.nickname,
      s1: {
        total: s1Total,
        done: s1Done,
        checkpoints: checkpointList,
        memos: (memos ?? []).map((m) => ({
          stageNo: m.stage_no,
          text: m.text,
          createdAt: m.created_at,
        })),
      },
      s2: { cases: s2cases ?? [], passed: s2Passed, min: S2_MIN },
      s3: { prd: prd ?? null, passed: s3Passed },
      s4: {
        prompt: prompt ?? null,
        cases: s4CasesEnriched,
        confirmed: s4Confirmed,
      },
      s5: {
        revised: revised ?? null,
        checkedCount: s5CheckedCount,
        totalCases: (s4cases ?? []).length,
        confirmed: s5Confirmed,
      },
      s6: {
        title: deck?.title ?? "",
        slides: Array.isArray(deck?.slides) ? deck?.slides : [],
        confirmed: !!deck?.confirmed_at,
        queueState: (queueRow?.state as "waiting" | "current" | "done" | undefined) ?? null,
        presentedAt: queueRow?.finished_at ?? null,
        comments: (comments ?? []).map((c) => ({
          good: c.good,
          question: c.question,
          createdAt: c.created_at,
          commenterNickname: nicknameMap.get(c.commenter_id) ?? "익명",
        })),
      },
      retro: retro
        ? {
            learned: retro.learned,
            nextTry: retro.next_try,
            submittedAt: retro.submitted_at,
            updatedAt: retro.updated_at,
          }
        : null,
      stamps: {
        s1: s1Complete,
        s2: s2Passed,
        s3: s3Passed,
        s4: s4Confirmed,
        s5: s5Confirmed,
        s6: s6Done,
      },
    };
  });

// ---------- 참가자: 회고 조회 ----------

export const getMyRetrospective = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string }) => z.object({ userId: uuid }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const user = await getUser(data.userId);
    if (!user) return { ok: false as const, error: "세션이 만료되었습니다." };

    const [{ data: retro }, { data: session }] = await Promise.all([
      supabaseAdmin
        .from("s7_retrospectives")
        .select("learned, next_try, submitted_at, updated_at")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabaseAdmin
        .from("sessions")
        .select("closed_at")
        .eq("id", user.session_id)
        .maybeSingle(),
    ]);

    return {
      ok: true as const,
      retro: retro ?? null,
      closed: !!session?.closed_at,
    };
  });

// ---------- 참가자: 회고 저장 ----------

export const saveMyRetrospective = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { userId: string; learned: string; nextTry: string }) =>
      z
        .object({
          userId: uuid,
          learned: z
            .string()
            .trim()
            .min(10, "배운 것을 10자 이상 적어 주세요")
            .max(500, "500자 이내로 작성해 주세요"),
          nextTry: z.string().trim().max(500, "500자 이내로 작성해 주세요"),
        })
        .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const user = await getUser(data.userId);
    if (!user) return { ok: false as const, error: "세션이 만료되었습니다." };
    if (user.role !== "participant")
      return { ok: false as const, error: "참가자만 회고를 남길 수 있습니다." };

    const { data: session } = await supabaseAdmin
      .from("sessions")
      .select("closed_at")
      .eq("id", user.session_id)
      .maybeSingle();
    if (session?.closed_at)
      return { ok: false as const, error: "연수가 종료되어 회고를 편집할 수 없습니다." };

    const now = new Date().toISOString();
    const { error } = await supabaseAdmin.from("s7_retrospectives").upsert(
      {
        user_id: user.id,
        session_id: user.session_id,
        learned: data.learned.trim(),
        next_try: data.nextTry.trim() || null,
        submitted_at: now,
        updated_at: now,
      },
      { onConflict: "session_id,user_id" },
    );
    if (error) return { ok: false as const, error: "회고 저장에 실패했습니다." };
    return { ok: true as const };
  });

// ---------- 참가자: 수료 상태 ----------

export const getMyCompletion = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string }) => z.object({ userId: uuid }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const user = await getUser(data.userId);
    if (!user) return { ok: false as const, error: "세션이 만료되었습니다." };

    const [
      { data: session },
      { data: checkpoints },
      { data: progress },
      { data: s2cases },
      { data: prd },
      { data: prompt },
      { data: revised },
      { data: queueRow },
      { data: retro },
    ] = await Promise.all([
      supabaseAdmin
        .from("sessions")
        .select("id, name, closed_at")
        .eq("id", user.session_id)
        .maybeSingle(),
      supabaseAdmin.from("checkpoints").select("id").eq("stage_no", 1),
      supabaseAdmin
        .from("checkpoint_progress")
        .select("checkpoint_id")
        .eq("user_id", user.id),
      supabaseAdmin.from("s2_test_cases").select("id").eq("user_id", user.id),
      supabaseAdmin
        .from("s3_prd_drafts")
        .select("submitted_v2_at")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabaseAdmin
        .from("s4_prompts")
        .select("confirmed_at")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabaseAdmin
        .from("s5_revised_prompts")
        .select("confirmed_at")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabaseAdmin
        .from("s6_presentation_queue")
        .select("state, finished_at")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabaseAdmin
        .from("s7_retrospectives")
        .select("learned, submitted_at")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    const s1Total = checkpoints?.length ?? 0;
    const s1Done = progress?.length ?? 0;
    const stamps = {
      s1: s1Total > 0 && s1Done >= s1Total,
      s2: (s2cases?.length ?? 0) >= S2_MIN,
      s3: !!prd?.submitted_v2_at,
      s4: !!prompt?.confirmed_at,
      s5: !!revised?.confirmed_at,
      s6: queueRow?.state === "done",
    };
    const stampCount = Object.values(stamps).filter(Boolean).length;
    const retroSubmitted = !!(retro?.learned && retro.learned.trim().length >= 10);
    const allDone = stampCount === 6 && retroSubmitted;

    return {
      ok: true as const,
      session: {
        name: session?.name ?? "",
        closedAt: session?.closed_at ?? null,
      },
      nickname: user.nickname,
      stamps,
      stampCount,
      retroSubmitted,
      allDone,
      completedAt: allDone ? (queueRow?.finished_at ?? retro?.submitted_at ?? null) : null,
    };
  });

// ---------- 강사: 회고 모음 ----------

export const getSessionRetrospectives = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string }) => z.object({ userId: uuid }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const caller = await getUser(data.userId);
    if (!caller) return { ok: false as const, error: "세션이 만료되었습니다." };
    if (caller.role !== "instructor")
      return { ok: false as const, error: "강사만 조회할 수 있습니다." };

    const { data: members } = await supabaseAdmin
      .from("app_users")
      .select("id, nickname")
      .eq("session_id", caller.session_id)
      .eq("role", "participant")
      .order("nickname", { ascending: true });

    const memberIds = (members ?? []).map((m) => m.id);
    if (memberIds.length === 0) return { ok: true as const, entries: [] };

    const { data: retros } = await supabaseAdmin
      .from("s7_retrospectives")
      .select("user_id, learned, next_try, submitted_at")
      .in("user_id", memberIds);

    const map = new Map((retros ?? []).map((r) => [r.user_id, r]));
    const entries = (members ?? []).map((m) => {
      const r = map.get(m.id);
      return {
        userId: m.id,
        nickname: m.nickname,
        learned: r?.learned ?? null,
        nextTry: r?.next_try ?? null,
        submittedAt: r?.submitted_at ?? null,
      };
    });
    return { ok: true as const, entries };
  });

// ---------- 강사: 참가자별 수료 요약 ----------

export const getSessionCompletion = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string }) => z.object({ userId: uuid }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const caller = await getUser(data.userId);
    if (!caller) return { ok: false as const, error: "세션이 만료되었습니다." };
    if (caller.role !== "instructor")
      return { ok: false as const, error: "강사만 조회할 수 있습니다." };

    const { data: members } = await supabaseAdmin
      .from("app_users")
      .select("id, nickname")
      .eq("session_id", caller.session_id)
      .eq("role", "participant");

    const memberIds = (members ?? []).map((m) => m.id);
    const { data: session } = await supabaseAdmin
      .from("sessions")
      .select("closed_at")
      .eq("id", caller.session_id)
      .maybeSingle();

    if (memberIds.length === 0)
      return {
        ok: true as const,
        closedAt: session?.closed_at ?? null,
        rows: [],
      };

    const [
      { data: checkpoints },
      { data: progress },
      { data: s2cases },
      { data: prds },
      { data: prompts },
      { data: revised },
      { data: queue },
      { data: retros },
    ] = await Promise.all([
      supabaseAdmin.from("checkpoints").select("id").eq("stage_no", 1),
      supabaseAdmin
        .from("checkpoint_progress")
        .select("user_id, checkpoint_id")
        .in("user_id", memberIds),
      supabaseAdmin.from("s2_test_cases").select("user_id").in("user_id", memberIds),
      supabaseAdmin
        .from("s3_prd_drafts")
        .select("user_id, submitted_v2_at")
        .in("user_id", memberIds),
      supabaseAdmin
        .from("s4_prompts")
        .select("user_id, confirmed_at")
        .in("user_id", memberIds),
      supabaseAdmin
        .from("s5_revised_prompts")
        .select("user_id, confirmed_at")
        .in("user_id", memberIds),
      supabaseAdmin
        .from("s6_presentation_queue")
        .select("user_id, state")
        .in("user_id", memberIds),
      supabaseAdmin
        .from("s7_retrospectives")
        .select("user_id, learned")
        .in("user_id", memberIds),
    ]);

    const s1Total = checkpoints?.length ?? 0;
    const s1Count = new Map<string, number>();
    for (const r of progress ?? [])
      s1Count.set(r.user_id, (s1Count.get(r.user_id) ?? 0) + 1);
    const s2Count = new Map<string, number>();
    for (const r of s2cases ?? [])
      s2Count.set(r.user_id, (s2Count.get(r.user_id) ?? 0) + 1);
    const prdMap = new Map((prds ?? []).map((r) => [r.user_id, r]));
    const promptMap = new Map((prompts ?? []).map((r) => [r.user_id, r]));
    const revisedMap = new Map((revised ?? []).map((r) => [r.user_id, r]));
    const queueMap = new Map((queue ?? []).map((r) => [r.user_id, r]));
    const retroMap = new Map((retros ?? []).map((r) => [r.user_id, r]));

    const rows = (members ?? []).map((m) => {
      const stamps = {
        s1: s1Total > 0 && (s1Count.get(m.id) ?? 0) >= s1Total,
        s2: (s2Count.get(m.id) ?? 0) >= S2_MIN,
        s3: !!prdMap.get(m.id)?.submitted_v2_at,
        s4: !!promptMap.get(m.id)?.confirmed_at,
        s5: !!revisedMap.get(m.id)?.confirmed_at,
        s6: queueMap.get(m.id)?.state === "done",
      };
      const stampCount = Object.values(stamps).filter(Boolean).length;
      const retroSubmitted = !!(
        retroMap.get(m.id)?.learned &&
        (retroMap.get(m.id)?.learned ?? "").trim().length >= 10
      );
      return {
        userId: m.id,
        nickname: m.nickname,
        stampCount,
        retroSubmitted,
        allDone: stampCount === 6 && retroSubmitted,
      };
    });

    return {
      ok: true as const,
      closedAt: session?.closed_at ?? null,
      rows,
    };
  });

// ---------- 강사: 세션 종료 / 재개 ----------

export const closeSession = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string }) => z.object({ userId: uuid }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const caller = await getUser(data.userId);
    if (!caller) return { ok: false as const, error: "세션이 만료되었습니다." };
    if (caller.role !== "instructor")
      return { ok: false as const, error: "강사만 연수를 종료할 수 있습니다." };

    const { error } = await supabaseAdmin
      .from("sessions")
      .update({ closed_at: new Date().toISOString() })
      .eq("id", caller.session_id);
    if (error) return { ok: false as const, error: "종료 처리에 실패했습니다." };
    return { ok: true as const };
  });

export const reopenSession = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string }) => z.object({ userId: uuid }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const caller = await getUser(data.userId);
    if (!caller) return { ok: false as const, error: "세션이 만료되었습니다." };
    if (caller.role !== "instructor")
      return { ok: false as const, error: "강사만 연수를 재개할 수 있습니다." };

    const { error } = await supabaseAdmin
      .from("sessions")
      .update({ closed_at: null })
      .eq("id", caller.session_id);
    if (error) return { ok: false as const, error: "재개 처리에 실패했습니다." };
    return { ok: true as const };
  });
