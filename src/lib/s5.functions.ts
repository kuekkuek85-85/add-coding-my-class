import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * S5(교차 QA + 개선) 서버 함수.
 *
 * 원칙:
 * - AI는 참가자 대신 문장을 쓰지 않는다. 이 스테이지는 전부 사람이 채운다.
 * - "좋은 점"은 필수(5자 이상).
 * - 게이트: (1) S4 확정된 테스트 케이스 전부에 실행 결과 기록,
 *   (2) 나에게 배정된 대상자의 QA 리뷰 제출 완료,
 *   (3) 수정 프롬프트 5칸(target/evidence/keep_list/add_list/constraints) 채움 + "확정".
 */

const uuid = z.string().uuid();

type RevisedFields = {
  target: string;
  evidence: string;
  keep_list: string;
  add_list: string;
  constraints: string;
};

const revisedSchema = z.object({
  target: z.string().max(2000),
  evidence: z.string().max(2000),
  keep_list: z.string().max(2000),
  add_list: z.string().max(2000),
  constraints: z.string().max(2000),
});

async function getUser(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("app_users")
    .select("id, role, session_id, nickname")
    .eq("id", userId)
    .maybeSingle();
  return data;
}

function isRevisedComplete(f: RevisedFields) {
  return (
    f.target.trim().length > 0 &&
    f.evidence.trim().length > 0 &&
    f.keep_list.trim().length > 0 &&
    f.add_list.trim().length > 0 &&
    f.constraints.trim().length > 0
  );
}

/**
 * S5 체인 배정: S4 프롬프트 확정한 참가자들을 nickname 오름차순으로 정렬,
 * i번째가 (i+1)%N 번째를 QA 한다.
 */
async function computeS5Chain(sessionId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: members } = await supabaseAdmin
    .from("app_users")
    .select("id, nickname")
    .eq("session_id", sessionId)
    .eq("role", "participant")
    .order("nickname", { ascending: true });
  const list = members ?? [];
  const { data: prompts } = await supabaseAdmin
    .from("s4_prompts")
    .select("user_id")
    .eq("session_id", sessionId)
    .not("confirmed_at", "is", null);
  const confirmedSet = new Set((prompts ?? []).map((r) => r.user_id));
  const eligible = list.filter((m) => confirmedSet.has(m.id));
  const pairs = new Map<string, string>();
  for (let i = 0; i < eligible.length; i++) {
    if (eligible.length === 1) continue;
    pairs.set(eligible[i]!.id, eligible[(i + 1) % eligible.length]!.id);
  }
  return { members: list, eligible, pairs };
}

// -------- 상태 조회 --------

export const getMyS5State = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string }) => z.object({ userId: uuid }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const user = await getUser(data.userId);
    if (!user) return { ok: false as const, error: "세션이 만료되었습니다." };

    const [
      { data: s4cases },
      { data: s2cases },
      { data: results },
      { data: myPrompt },
      { data: revised },
      { data: qaGivenRows },
      { data: qaReceivedRows },
    ] = await Promise.all([
      supabaseAdmin
        .from("s4_test_cases")
        .select("id, title, given, when_step, then_step, order_index")
        .eq("user_id", user.id)
        .order("order_index", { ascending: true }),
      supabaseAdmin
        .from("s2_test_cases")
        .select("id, title, given_when, expected_then, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true }),
      supabaseAdmin
        .from("s5_checklist_results")
        .select("test_case_id, source, status, note, updated_at")
        .eq("user_id", user.id),
      supabaseAdmin
        .from("s4_prompts")
        .select("confirmed_at")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabaseAdmin
        .from("s5_revised_prompts")
        .select("target, evidence, keep_list, add_list, constraints, confirmed_at")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabaseAdmin
        .from("s5_qa_reviews")
        .select("id")
        .eq("reviewer_id", user.id),
      supabaseAdmin
        .from("s5_qa_reviews")
        .select("id")
        .eq("reviewee_id", user.id),
    ]);

    const completeS4 = (s4cases ?? []).filter(
      (c) =>
        (c.title ?? "").trim() &&
        (c.given ?? "").trim() &&
        (c.when_step ?? "").trim() &&
        (c.then_step ?? "").trim(),
    );

    const resultMap = new Map(
      (results ?? []).map(
        (r) => [`${r.source}:${r.test_case_id}`, r] as const,
      ),
    );

    const s2Normalized = (s2cases ?? []).map((c) => ({
      id: c.id as string,
      source: "s2" as const,
      title: (c.title ?? "") as string,
      given: (c.given_when ?? "") as string,
      when_step: "",
      then_step: (c.expected_then ?? "") as string,
      order_index: 0,
    }));
    const s4Normalized = completeS4.map((c) => ({
      id: c.id as string,
      source: "s4" as const,
      title: c.title as string,
      given: (c.given ?? "") as string,
      when_step: (c.when_step ?? "") as string,
      then_step: (c.then_step ?? "") as string,
      order_index: (c.order_index ?? 0) as number,
    }));
    const merged = [...s2Normalized, ...s4Normalized];
    const casesWithResult = merged.map((c) => ({
      ...c,
      result: resultMap.get(`${c.source}:${c.id}`) ?? null,
    }));

    const allChecked =
      merged.length > 0 &&
      merged.every((c) => resultMap.has(`${c.source}:${c.id}`));

    const revisedFields: RevisedFields = {
      target: revised?.target ?? "",
      evidence: revised?.evidence ?? "",
      keep_list: revised?.keep_list ?? "",
      add_list: revised?.add_list ?? "",
      constraints: revised?.constraints ?? "",
    };
    const revisedComplete = isRevisedComplete(revisedFields);
    const confirmed = !!revised?.confirmed_at;

    const qaGivenCount = qaGivenRows?.length ?? 0;
    const qaReceivedCount = qaReceivedRows?.length ?? 0;

    return {
      ok: true as const,
      s4Confirmed: !!myPrompt?.confirmed_at,
      cases: casesWithResult,
      allChecked,
      revised: revisedFields,
      revisedComplete,
      confirmed,
      confirmedAt: revised?.confirmed_at ?? null,
      qaGivenCount,
      qaReceivedCount,
    };
  });


// -------- 체크리스트 결과 저장 --------

export const setS5ChecklistResult = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      userId: string;
      testCaseId: string;
      status: "pass" | "fail" | "partial";
      note: string;
    }) =>
      z
        .object({
          userId: uuid,
          testCaseId: uuid,
          status: z.enum(["pass", "fail", "partial"]),
          note: z.string().max(1000),
        })
        .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const user = await getUser(data.userId);
    if (!user) return { ok: false as const, error: "세션이 만료되었습니다." };
    if (user.role !== "participant")
      return { ok: false as const, error: "참가자만 저장할 수 있습니다." };

    // 확정 후엔 잠금
    const { data: revised } = await supabaseAdmin
      .from("s5_revised_prompts")
      .select("confirmed_at")
      .eq("user_id", user.id)
      .maybeSingle();
    if (revised?.confirmed_at)
      return { ok: false as const, error: "S5 게이트 통과 후에는 수정할 수 없습니다." };

    // 대상 테스트 케이스가 내 것인지 확인
    const { data: tc } = await supabaseAdmin
      .from("s4_test_cases")
      .select("user_id")
      .eq("id", data.testCaseId)
      .maybeSingle();
    if (!tc || tc.user_id !== user.id)
      return { ok: false as const, error: "내 테스트 케이스만 기록할 수 있습니다." };

    const { error } = await supabaseAdmin.from("s5_checklist_results").upsert(
      {
        user_id: user.id,
        test_case_id: data.testCaseId,
        session_id: user.session_id,
        status: data.status,
        note: data.note,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,test_case_id" },
    );
    if (error) return { ok: false as const, error: "저장에 실패했습니다." };
    return { ok: true as const };
  });

// -------- 교차 QA --------

export const getMyS5QaAssignment = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string }) => z.object({ userId: uuid }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const user = await getUser(data.userId);
    if (!user) return { ok: false as const, error: "세션이 만료되었습니다." };

    const { data: myPrompt } = await supabaseAdmin
      .from("s4_prompts")
      .select("confirmed_at")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!myPrompt?.confirmed_at)
      return { ok: true as const, status: "need_s4" as const };

    const { members, pairs } = await computeS5Chain(user.session_id);
    const revieweeId = pairs.get(user.id);
    if (!revieweeId)
      return {
        ok: true as const,
        status: "waiting" as const,
        message: "다른 참가자가 S4를 확정하면 배정됩니다.",
      };
    const reviewee = members.find((m) => m.id === revieweeId);

    const { data: existing } = await supabaseAdmin
      .from("s5_qa_reviews")
      .select("good, issue, suggestion, submitted_at")
      .eq("reviewer_id", user.id)
      .eq("reviewee_id", revieweeId)
      .maybeSingle();

    return {
      ok: true as const,
      status: "assigned" as const,
      revieweeId,
      revieweeNickname: reviewee?.nickname ?? "참가자",
      existing: existing ?? null,
    };
  });

export const getRevieweeS4Bundle = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string; revieweeId: string }) =>
    z.object({ userId: uuid, revieweeId: uuid }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const user = await getUser(data.userId);
    if (!user) return { ok: false as const, error: "세션이 만료되었습니다." };

    const { pairs } = await computeS5Chain(user.session_id);
    if (pairs.get(user.id) !== data.revieweeId)
      return { ok: false as const, error: "배정된 리뷰 대상자가 아닙니다." };

    const [{ data: prompt }, { data: cases }, { data: results }] = await Promise.all([
      supabaseAdmin
        .from("s4_prompts")
        .select("role, context, task, nonfunctional, confirmed_at")
        .eq("user_id", data.revieweeId)
        .maybeSingle(),
      supabaseAdmin
        .from("s4_test_cases")
        .select("id, title, given, when_step, then_step, order_index")
        .eq("user_id", data.revieweeId)
        .order("order_index", { ascending: true }),
      supabaseAdmin
        .from("s5_checklist_results")
        .select("test_case_id, status, note")
        .eq("user_id", data.revieweeId),
    ]);
    if (!prompt?.confirmed_at)
      return { ok: false as const, error: "대상자가 아직 S4를 확정하지 않았습니다." };

    const resultMap = new Map((results ?? []).map((r) => [r.test_case_id, r]));
    return {
      ok: true as const,
      prompt: {
        role: prompt.role,
        context: prompt.context,
        task: prompt.task,
        nonfunctional: prompt.nonfunctional,
      },
      cases: (cases ?? []).map((c) => ({
        id: c.id,
        title: c.title,
        given: c.given,
        when_step: c.when_step,
        then_step: c.then_step,
        result: resultMap.get(c.id) ?? null,
      })),
    };
  });

export const submitS5QaReview = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      userId: string;
      revieweeId: string;
      good: string;
      issue: string;
      suggestion: string;
    }) =>
      z
        .object({
          userId: uuid,
          revieweeId: uuid,
          good: z.string().transform((s) => s.trim()),
          issue: z.string().max(1500).transform((s) => s.trim()),
          suggestion: z.string().max(1500).transform((s) => s.trim()),
        })
        .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const user = await getUser(data.userId);
    if (!user) return { ok: false as const, error: "세션이 만료되었습니다." };
    if (user.role !== "participant")
      return { ok: false as const, error: "참가자만 리뷰할 수 있습니다." };
    if (data.good.length < 5)
      return { ok: false as const, error: "'좋은 점'을 5자 이상 입력해 주세요." };
    if (data.good.length > 1500)
      return { ok: false as const, error: "'좋은 점'은 1500자 이내로 작성해 주세요." };

    const { pairs } = await computeS5Chain(user.session_id);
    if (pairs.get(user.id) !== data.revieweeId)
      return { ok: false as const, error: "배정된 리뷰 대상자가 아닙니다." };

    const now = new Date().toISOString();
    const { error } = await supabaseAdmin.from("s5_qa_reviews").upsert(
      {
        reviewer_id: user.id,
        reviewee_id: data.revieweeId,
        session_id: user.session_id,
        good: data.good,
        issue: data.issue,
        suggestion: data.suggestion,
        submitted_at: now,
        updated_at: now,
      },
      { onConflict: "reviewer_id,reviewee_id" },
    );
    if (error) return { ok: false as const, error: "리뷰 저장에 실패했습니다." };
    return { ok: true as const };
  });

export const getS5QaReviewsForMe = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string }) => z.object({ userId: uuid }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const user = await getUser(data.userId);
    if (!user) return { ok: false as const, error: "세션이 만료되었습니다." };

    const { data: reviews } = await supabaseAdmin
      .from("s5_qa_reviews")
      .select("id, reviewer_id, good, issue, suggestion, submitted_at")
      .eq("reviewee_id", user.id)
      .order("submitted_at", { ascending: false });
    const reviewerIds = Array.from(new Set((reviews ?? []).map((r) => r.reviewer_id)));
    const { data: reviewers } = reviewerIds.length
      ? await supabaseAdmin.from("app_users").select("id, nickname").in("id", reviewerIds)
      : { data: [] as { id: string; nickname: string }[] };
    const nickMap = new Map((reviewers ?? []).map((r) => [r.id, r.nickname]));
    return {
      ok: true as const,
      reviews: (reviews ?? []).map((r) => ({
        id: r.id,
        reviewerNickname: nickMap.get(r.reviewer_id) ?? "익명",
        good: r.good,
        issue: r.issue,
        suggestion: r.suggestion,
        submittedAt: r.submitted_at,
      })),
    };
  });

// -------- 수정 프롬프트 --------

export const saveMyS5Revised = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string; fields: RevisedFields }) =>
    z.object({ userId: uuid, fields: revisedSchema }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const user = await getUser(data.userId);
    if (!user) return { ok: false as const, error: "세션이 만료되었습니다." };
    if (user.role !== "participant")
      return { ok: false as const, error: "참가자만 저장할 수 있습니다." };

    const { data: existing } = await supabaseAdmin
      .from("s5_revised_prompts")
      .select("confirmed_at")
      .eq("user_id", user.id)
      .maybeSingle();
    if (existing?.confirmed_at)
      return { ok: false as const, error: "확정된 프롬프트는 수정할 수 없습니다." };

    const { error } = await supabaseAdmin.from("s5_revised_prompts").upsert(
      {
        user_id: user.id,
        session_id: user.session_id,
        target: data.fields.target,
        evidence: data.fields.evidence,
        keep_list: data.fields.keep_list,
        add_list: data.fields.add_list,
        constraints: data.fields.constraints,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (error) return { ok: false as const, error: "자동 저장에 실패했습니다." };
    return { ok: true as const };
  });

export const confirmMyS5Revised = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string }) => z.object({ userId: uuid }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const user = await getUser(data.userId);
    if (!user) return { ok: false as const, error: "세션이 만료되었습니다." };
    if (user.role !== "participant")
      return { ok: false as const, error: "참가자만 확정할 수 있습니다." };

    const [{ data: cases }, { data: results }, { data: revised }, { data: qaGiven }] =
      await Promise.all([
        supabaseAdmin
          .from("s4_test_cases")
          .select("id, title, given, when_step, then_step")
          .eq("user_id", user.id),
        supabaseAdmin
          .from("s5_checklist_results")
          .select("test_case_id")
          .eq("user_id", user.id),
        supabaseAdmin
          .from("s5_revised_prompts")
          .select("target, evidence, keep_list, add_list, constraints, confirmed_at")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabaseAdmin
          .from("s5_qa_reviews")
          .select("id")
          .eq("reviewer_id", user.id),
      ]);

    const complete = (cases ?? []).filter(
      (c) =>
        (c.title ?? "").trim() &&
        (c.given ?? "").trim() &&
        (c.when_step ?? "").trim() &&
        (c.then_step ?? "").trim(),
    );
    const resultSet = new Set((results ?? []).map((r) => r.test_case_id));
    if (complete.length === 0 || !complete.every((c) => resultSet.has(c.id)))
      return {
        ok: false as const,
        error: "확정된 테스트 케이스 전부에 실행 결과를 기록해야 합니다.",
      };

    // 배정이 있으면(2명 이상) QA 제출 필수
    const { pairs } = await computeS5Chain(user.session_id);
    if (pairs.get(user.id) && (qaGiven?.length ?? 0) < 1)
      return {
        ok: false as const,
        error: "배정된 대상자의 교차 QA를 먼저 제출해 주세요.",
      };

    if (!revised) return { ok: false as const, error: "수정 프롬프트를 먼저 저장해 주세요." };
    if (
      !isRevisedComplete({
        target: revised.target,
        evidence: revised.evidence,
        keep_list: revised.keep_list,
        add_list: revised.add_list,
        constraints: revised.constraints,
      })
    )
      return { ok: false as const, error: "수정 프롬프트 5칸을 모두 채워 주세요." };

    const now = new Date().toISOString();
    const { error } = await supabaseAdmin
      .from("s5_revised_prompts")
      .update({ confirmed_at: revised.confirmed_at ?? now, updated_at: now })
      .eq("user_id", user.id);
    if (error) return { ok: false as const, error: "확정에 실패했습니다." };
    return { ok: true as const };
  });

// -------- 강사용 요약 --------

export const getSessionS5Overview = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string }) => z.object({ userId: uuid }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const caller = await getUser(data.userId);
    if (!caller) return { ok: false as const, error: "세션이 만료되었습니다." };
    if (caller.role !== "instructor")
      return { ok: false as const, error: "강사만 조회할 수 있습니다." };

    const [
      { data: members },
      { data: cases },
      { data: results },
      { data: revised },
      { data: qa },
    ] = await Promise.all([
      supabaseAdmin
        .from("app_users")
        .select("id, nickname")
        .eq("session_id", caller.session_id)
        .eq("role", "participant"),
      supabaseAdmin
        .from("s4_test_cases")
        .select("id, user_id, title, given, when_step, then_step")
        .eq("session_id", caller.session_id),
      supabaseAdmin
        .from("s5_checklist_results")
        .select("user_id, test_case_id, status")
        .eq("session_id", caller.session_id),
      supabaseAdmin
        .from("s5_revised_prompts")
        .select("user_id, confirmed_at, target, evidence, keep_list, add_list, constraints")
        .eq("session_id", caller.session_id),
      supabaseAdmin
        .from("s5_qa_reviews")
        .select("reviewer_id, reviewee_id")
        .eq("session_id", caller.session_id),
    ]);

    const casesByUser = new Map<string, string[]>();
    for (const c of cases ?? []) {
      const done =
        (c.title ?? "").trim() &&
        (c.given ?? "").trim() &&
        (c.when_step ?? "").trim() &&
        (c.then_step ?? "").trim();
      if (!done) continue;
      const arr = casesByUser.get(c.user_id) ?? [];
      arr.push(c.id);
      casesByUser.set(c.user_id, arr);
    }
    const resultsByUser = new Map<string, Set<string>>();
    for (const r of results ?? []) {
      const set = resultsByUser.get(r.user_id) ?? new Set();
      set.add(r.test_case_id);
      resultsByUser.set(r.user_id, set);
    }
    const revisedMap = new Map((revised ?? []).map((r) => [r.user_id, r]));
    const givenSet = new Set((qa ?? []).map((q) => q.reviewer_id));
    const receivedCount = new Map<string, number>();
    for (const q of qa ?? []) {
      receivedCount.set(q.reviewee_id, (receivedCount.get(q.reviewee_id) ?? 0) + 1);
    }

    const progress = (members ?? []).map((m) => {
      const total = (casesByUser.get(m.id) ?? []).length;
      const checked = casesByUser
        .get(m.id)
        ?.filter((id) => resultsByUser.get(m.id)?.has(id))
        .length ?? 0;
      const r = revisedMap.get(m.id);
      const filled = r
        ? isRevisedComplete({
            target: r.target,
            evidence: r.evidence,
            keep_list: r.keep_list,
            add_list: r.add_list,
            constraints: r.constraints,
          })
        : false;
      return {
        userId: m.id,
        nickname: m.nickname,
        totalCases: total,
        checkedCases: checked,
        qaGiven: givenSet.has(m.id),
        qaReceived: receivedCount.get(m.id) ?? 0,
        revisedFilled: filled,
        confirmed: !!r?.confirmed_at,
      };
    });
    return { ok: true as const, progress };
  });
