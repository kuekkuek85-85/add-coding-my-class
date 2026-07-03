import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * S3(PRD 작성·검증) 서버 함수.
 *
 * 원칙:
 * - Grill Me 도우미는 참가자의 PRD 문장을 절대 대신 작성하지 않는다. 오직 질문/모호점만 제시.
 * - 리뷰 폼의 "좋은 점"은 필수(서버·클라이언트 이중 검증).
 * - 2차 제출은 v1 제출 + 내가 받은 리뷰 1건 이상이 있어야 가능. 통과 시 S3 게이트가 열린다.
 */

const uuid = z.string().uuid();

type PrdFields = {
  problem: string;
  users: string;
  features: string;
  nonfunctional: string;
  success_metric: string;
  out_of_scope: string;
};

const prdFieldsSchema = z.object({
  problem: z.string().max(2000),
  users: z.string().max(2000),
  features: z.string().max(4000),
  nonfunctional: z.string().max(2000),
  success_metric: z.string().max(1000),
  out_of_scope: z.string().max(2000),
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

function emptyDraft(): PrdFields {
  return {
    problem: "",
    users: "",
    features: "",
    nonfunctional: "",
    success_metric: "",
    out_of_scope: "",
  };
}

function draftSnapshot(f: PrdFields) {
  return [
    `# 문제\n${f.problem}`,
    `# 사용자\n${f.users}`,
    `# 핵심 기능\n${f.features}`,
    `# 비기능\n${f.nonfunctional}`,
    `# 성공 지표\n${f.success_metric}`,
    `# 범위 밖\n${f.out_of_scope}`,
  ].join("\n\n");
}

function validateV1(f: PrdFields): string | null {
  const missing = (Object.keys(f) as (keyof PrdFields)[]).filter(
    (k) => f[k].trim().length === 0,
  );
  if (missing.length > 0) {
    return "모든 섹션을 채워야 1차 제출할 수 있습니다.";
  }
  const featureLines = f.features
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (featureLines.length < 3) {
    return "핵심 기능은 3줄 이상(각 줄이 하나의 기능) 작성해야 합니다.";
  }
  return null;
}

// -------- 조회 / 저장 --------

export const getMyPrdDraft = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string }) => z.object({ userId: uuid }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const user = await getUser(data.userId);
    if (!user) return { ok: false as const, error: "세션이 만료되었습니다." };

    const { data: row } = await supabaseAdmin
      .from("s3_prd_drafts")
      .select(
        "problem, users, features, nonfunctional, success_metric, out_of_scope, submitted_v1_at, submitted_v2_at, updated_at",
      )
      .eq("user_id", user.id)
      .maybeSingle();

    const fields: PrdFields = row
      ? {
          problem: row.problem,
          users: row.users,
          features: row.features,
          nonfunctional: row.nonfunctional,
          success_metric: row.success_metric,
          out_of_scope: row.out_of_scope,
        }
      : emptyDraft();

    return {
      ok: true as const,
      fields,
      submittedV1At: row?.submitted_v1_at ?? null,
      submittedV2At: row?.submitted_v2_at ?? null,
      updatedAt: row?.updated_at ?? null,
    };
  });

export const saveMyPrdDraft = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string; fields: PrdFields }) =>
    z.object({ userId: uuid, fields: prdFieldsSchema }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const user = await getUser(data.userId);
    if (!user) return { ok: false as const, error: "세션이 만료되었습니다." };
    if (user.role !== "participant") {
      return { ok: false as const, error: "참가자만 저장할 수 있습니다." };
    }

    // v2 제출 완료면 잠금
    const { data: existing } = await supabaseAdmin
      .from("s3_prd_drafts")
      .select("submitted_v2_at")
      .eq("user_id", user.id)
      .maybeSingle();
    if (existing?.submitted_v2_at) {
      return { ok: false as const, error: "2차 제출 완료 — 더 이상 수정할 수 없습니다." };
    }

    const { error } = await supabaseAdmin.from("s3_prd_drafts").upsert(
      {
        user_id: user.id,
        session_id: user.session_id,
        ...data.fields,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (error) return { ok: false as const, error: "자동 저장에 실패했습니다." };
    return { ok: true as const };
  });

export const submitPrdV1 = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string }) => z.object({ userId: uuid }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const user = await getUser(data.userId);
    if (!user) return { ok: false as const, error: "세션이 만료되었습니다." };
    if (user.role !== "participant") {
      return { ok: false as const, error: "참가자만 제출할 수 있습니다." };
    }

    const { data: row } = await supabaseAdmin
      .from("s3_prd_drafts")
      .select(
        "problem, users, features, nonfunctional, success_metric, out_of_scope, submitted_v1_at",
      )
      .eq("user_id", user.id)
      .maybeSingle();

    if (!row) {
      return { ok: false as const, error: "먼저 PRD를 저장해 주세요." };
    }
    const fields: PrdFields = {
      problem: row.problem,
      users: row.users,
      features: row.features,
      nonfunctional: row.nonfunctional,
      success_metric: row.success_metric,
      out_of_scope: row.out_of_scope,
    };
    const err = validateV1(fields);
    if (err) return { ok: false as const, error: err };

    const now = new Date().toISOString();
    const { error } = await supabaseAdmin
      .from("s3_prd_drafts")
      .update({ submitted_v1_at: row.submitted_v1_at ?? now, updated_at: now })
      .eq("user_id", user.id);
    if (error) return { ok: false as const, error: "1차 제출에 실패했습니다." };
    return { ok: true as const };
  });

export const submitPrdV2 = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string }) => z.object({ userId: uuid }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const user = await getUser(data.userId);
    if (!user) return { ok: false as const, error: "세션이 만료되었습니다." };

    const { data: row } = await supabaseAdmin
      .from("s3_prd_drafts")
      .select("submitted_v1_at, problem, users, features, nonfunctional, success_metric, out_of_scope")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!row?.submitted_v1_at) {
      return { ok: false as const, error: "먼저 1차 제출을 완료해 주세요." };
    }
    const err = validateV1({
      problem: row.problem,
      users: row.users,
      features: row.features,
      nonfunctional: row.nonfunctional,
      success_metric: row.success_metric,
      out_of_scope: row.out_of_scope,
    });
    if (err) return { ok: false as const, error: err };

    const { count } = await supabaseAdmin
      .from("s3_reviews")
      .select("id", { count: "exact", head: true })
      .eq("reviewee_id", user.id);
    if ((count ?? 0) < 1) {
      return {
        ok: false as const,
        error: "동료 리뷰를 1건 이상 받은 뒤 2차 제출할 수 있습니다.",
      };
    }

    const now = new Date().toISOString();
    const { error } = await supabaseAdmin
      .from("s3_prd_drafts")
      .update({ submitted_v2_at: now, updated_at: now })
      .eq("user_id", user.id);
    if (error) return { ok: false as const, error: "2차 제출에 실패했습니다." };
    return { ok: true as const };
  });

// -------- Grill Me 도우미 --------

const GRILL_SYSTEM = `너는 PRD 리뷰 도우미다. 매우 엄격한 규칙을 지켜라.

절대 금지:
- 사용자의 PRD 문장을 대신 쓰거나 예시 답을 제시하지 마라.
- "이렇게 쓰면 됩니다", "예: ..." 같은 문장을 절대 넣지 마라.
- 사용자를 대신해 결정을 내리지 마라.

너의 역할:
- PRD를 읽고, 모호하거나 검증이 필요한 지점을 짧고 날카로운 질문 3~5개로 지적하라.
- 각 질문에는 어느 섹션을 겨냥한 질문인지 태그를 붙여라(problem/users/features/nonfunctional/success_metric/out_of_scope 중 하나).
- 한국어. 각 질문은 한 문장. 물음표로 끝나야 한다.

반드시 아래 JSON 스키마로만 응답하라:
{"questions":[{"tag":"<섹션태그>","q":"<질문 한 문장>"}]}
questions 배열은 3~5개.`;

async function callGrillAI(snapshot: string): Promise<
  { ok: true; questions: Array<{ tag: string; q: string }> } | { ok: false; error: string }
> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) return { ok: false, error: "AI 키가 설정되지 않았습니다." };

  const body = {
    model: "google/gemini-2.5-flash",
    messages: [
      { role: "system", content: GRILL_SYSTEM },
      { role: "user", content: `다음 PRD 초안을 읽고 질문 3~5개를 만들어라:\n\n${snapshot}` },
    ],
    response_format: { type: "json_object" },
  };

  let res: Response;
  try {
    res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
  } catch {
    return { ok: false, error: "AI 요청 중 네트워크 오류가 발생했습니다." };
  }

  if (res.status === 429) return { ok: false, error: "AI 사용량 한도에 도달했습니다. 잠시 뒤 다시 시도해 주세요." };
  if (res.status === 402) return { ok: false, error: "AI 크레딧이 부족합니다. 관리자에게 문의해 주세요." };
  if (!res.ok) return { ok: false, error: `AI 오류(${res.status})` };

  let payload: unknown;
  try {
    payload = await res.json();
  } catch {
    return { ok: false, error: "AI 응답을 해석할 수 없습니다." };
  }

  const content = (payload as { choices?: Array<{ message?: { content?: string } }> })
    ?.choices?.[0]?.message?.content;
  if (typeof content !== "string") return { ok: false, error: "AI 응답이 비어 있습니다." };

  try {
    const parsed = JSON.parse(content) as { questions?: Array<{ tag?: string; q?: string }> };
    const raw = Array.isArray(parsed.questions) ? parsed.questions : [];
    const cleaned = raw
      .map((x) => ({
        tag: typeof x.tag === "string" ? x.tag : "problem",
        q: typeof x.q === "string" ? x.q.trim() : "",
      }))
      .filter((x) => x.q.length > 0)
      .slice(0, 5);
    if (cleaned.length < 1) return { ok: false, error: "AI 질문을 생성하지 못했습니다. 다시 시도해 주세요." };
    return { ok: true, questions: cleaned };
  } catch {
    return { ok: false, error: "AI 응답 형식이 올바르지 않습니다." };
  }
}

export const getGrillQuestions = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { userId: string; force?: boolean }) =>
      z.object({ userId: uuid, force: z.boolean().optional() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const user = await getUser(data.userId);
    if (!user) return { ok: false as const, error: "세션이 만료되었습니다." };

    const { data: draft } = await supabaseAdmin
      .from("s3_prd_drafts")
      .select("problem, users, features, nonfunctional, success_metric, out_of_scope, submitted_v1_at")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!draft?.submitted_v1_at) {
      return { ok: false as const, error: "1차 제출 이후에 Grill Me를 사용할 수 있습니다." };
    }
    const snapshot = draftSnapshot({
      problem: draft.problem,
      users: draft.users,
      features: draft.features,
      nonfunctional: draft.nonfunctional,
      success_metric: draft.success_metric,
      out_of_scope: draft.out_of_scope,
    });

    if (!data.force) {
      const { data: cached } = await supabaseAdmin
        .from("s3_grill_questions")
        .select("draft_snapshot, questions, created_at")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cached && cached.draft_snapshot === snapshot) {
        return {
          ok: true as const,
          questions: cached.questions as Array<{ tag: string; q: string }>,
          cached: true as const,
          createdAt: cached.created_at,
        };
      }
    }

    const gen = await callGrillAI(snapshot);
    if (!gen.ok) return { ok: false as const, error: gen.error };

    const now = new Date().toISOString();
    await supabaseAdmin.from("s3_grill_questions").upsert(
      {
        user_id: user.id,
        session_id: user.session_id,
        draft_snapshot: snapshot,
        questions: gen.questions,
        created_at: now,
      },
      { onConflict: "user_id" },
    );

    return { ok: true as const, questions: gen.questions, cached: false as const, createdAt: now };
  });

// -------- 체인 리뷰 --------

async function computeChainAssignment(sessionId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: members } = await supabaseAdmin
    .from("app_users")
    .select("id, nickname")
    .eq("session_id", sessionId)
    .eq("role", "participant")
    .order("nickname", { ascending: true });
  const list = members ?? [];
  const { data: submitted } = await supabaseAdmin
    .from("s3_prd_drafts")
    .select("user_id")
    .eq("session_id", sessionId)
    .not("submitted_v1_at", "is", null);
  const submittedSet = new Set((submitted ?? []).map((r) => r.user_id));
  const eligible = list.filter((m) => submittedSet.has(m.id));
  // 체인: 정렬된 참가자 리스트에서 다음 사람이 대상
  const pairs = new Map<string, string>();
  for (let i = 0; i < eligible.length; i++) {
    const reviewer = eligible[i]!;
    const reviewee = eligible[(i + 1) % eligible.length]!;
    if (eligible.length === 1) continue;
    pairs.set(reviewer.id, reviewee.id);
  }
  return { members: list, eligible, pairs };
}

export const getMyReviewAssignment = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string }) => z.object({ userId: uuid }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const user = await getUser(data.userId);
    if (!user) return { ok: false as const, error: "세션이 만료되었습니다." };

    const { data: myDraft } = await supabaseAdmin
      .from("s3_prd_drafts")
      .select("submitted_v1_at")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!myDraft?.submitted_v1_at) {
      return { ok: true as const, status: "need_v1" as const };
    }

    const { members, eligible, pairs } = await computeChainAssignment(user.session_id);
    const revieweeId = pairs.get(user.id);
    if (!revieweeId) {
      return { ok: true as const, status: "waiting" as const, message: "다른 참가자가 1차 제출을 마치면 배정됩니다." };
    }
    const reviewee = members.find((m) => m.id === revieweeId);
    const _ = eligible.length;

    // 이미 제출했는지 확인
    const { data: existing } = await supabaseAdmin
      .from("s3_reviews")
      .select("good, question, suggestion, submitted_at")
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

export const getRevieweeDraft = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string; revieweeId: string }) =>
    z.object({ userId: uuid, revieweeId: uuid }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const user = await getUser(data.userId);
    if (!user) return { ok: false as const, error: "세션이 만료되었습니다." };

    // 검증: 나에게 배정된 대상자인지
    const { pairs } = await computeChainAssignment(user.session_id);
    if (pairs.get(user.id) !== data.revieweeId) {
      return { ok: false as const, error: "배정된 리뷰 대상자가 아닙니다." };
    }

    const { data: row } = await supabaseAdmin
      .from("s3_prd_drafts")
      .select(
        "problem, users, features, nonfunctional, success_metric, out_of_scope, submitted_v1_at",
      )
      .eq("user_id", data.revieweeId)
      .maybeSingle();
    if (!row?.submitted_v1_at) return { ok: false as const, error: "대상자가 아직 1차 제출을 마치지 않았습니다." };

    return {
      ok: true as const,
      fields: {
        problem: row.problem,
        users: row.users,
        features: row.features,
        nonfunctional: row.nonfunctional,
        success_metric: row.success_metric,
        out_of_scope: row.out_of_scope,
      },
      submittedV1At: row.submitted_v1_at,
    };
  });

export const submitReview = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { userId: string; revieweeId: string; good: string; question: string; suggestion: string }) =>
      z
        .object({
          userId: uuid,
          revieweeId: uuid,
          good: z.string().transform((s) => s.trim()),
          question: z.string().max(1000).transform((s) => s.trim()),
          suggestion: z.string().max(1000).transform((s) => s.trim()),
        })
        .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const user = await getUser(data.userId);
    if (!user) return { ok: false as const, error: "세션이 만료되었습니다." };
    if (user.role !== "participant") {
      return { ok: false as const, error: "참가자만 리뷰할 수 있습니다." };
    }
    if (data.good.length < 5) {
      return { ok: false as const, error: "'좋은 점'을 5자 이상 입력해 주세요." };
    }
    if (data.good.length > 1000) {
      return { ok: false as const, error: "'좋은 점'은 1000자 이내" };
    }

    const { pairs } = await computeChainAssignment(user.session_id);
    if (pairs.get(user.id) !== data.revieweeId) {
      return { ok: false as const, error: "배정된 리뷰 대상자가 아닙니다." };
    }

    const now = new Date().toISOString();
    const { error } = await supabaseAdmin.from("s3_reviews").upsert(
      {
        reviewer_id: user.id,
        reviewee_id: data.revieweeId,
        session_id: user.session_id,
        good: data.good,
        question: data.question,
        suggestion: data.suggestion,
        submitted_at: now,
        updated_at: now,
      },
      { onConflict: "reviewer_id,reviewee_id" },
    );
    if (error) return { ok: false as const, error: "리뷰 저장에 실패했습니다." };
    return { ok: true as const };
  });

export const getReviewsForMe = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string }) => z.object({ userId: uuid }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const user = await getUser(data.userId);
    if (!user) return { ok: false as const, error: "세션이 만료되었습니다." };

    const { data: reviews } = await supabaseAdmin
      .from("s3_reviews")
      .select("id, reviewer_id, good, question, suggestion, submitted_at")
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
        question: r.question,
        suggestion: r.suggestion,
        submittedAt: r.submitted_at,
      })),
    };
  });

// -------- 강사용 요약 --------

export const getSessionS3Overview = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string }) => z.object({ userId: uuid }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const caller = await getUser(data.userId);
    if (!caller) return { ok: false as const, error: "세션이 만료되었습니다." };
    if (caller.role !== "instructor") {
      return { ok: false as const, error: "강사만 조회할 수 있습니다." };
    }

    const [{ data: members }, { data: drafts }, { data: reviews }] = await Promise.all([
      supabaseAdmin
        .from("app_users")
        .select("id, nickname")
        .eq("session_id", caller.session_id)
        .eq("role", "participant"),
      supabaseAdmin
        .from("s3_prd_drafts")
        .select("user_id, submitted_v1_at, submitted_v2_at")
        .eq("session_id", caller.session_id),
      supabaseAdmin
        .from("s3_reviews")
        .select("reviewer_id, reviewee_id")
        .eq("session_id", caller.session_id),
    ]);

    const draftMap = new Map((drafts ?? []).map((d) => [d.user_id, d]));
    const givenSet = new Set((reviews ?? []).map((r) => r.reviewer_id));
    const receivedCount = new Map<string, number>();
    for (const r of reviews ?? []) {
      receivedCount.set(r.reviewee_id, (receivedCount.get(r.reviewee_id) ?? 0) + 1);
    }

    const progress = (members ?? []).map((m) => {
      const d = draftMap.get(m.id);
      return {
        userId: m.id,
        nickname: m.nickname,
        v1: !!d?.submitted_v1_at,
        v2: !!d?.submitted_v2_at,
        reviewGiven: givenSet.has(m.id),
        reviewReceived: receivedCount.get(m.id) ?? 0,
      };
    });
    return { ok: true as const, progress };
  });
