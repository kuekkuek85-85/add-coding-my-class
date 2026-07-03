import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * S4(4교시 TDD + 첫 프롬프트) 서버 함수.
 *
 * 원칙:
 * - TDD 도우미와 프롬프트 조립기 모두 참가자의 문장을 대신 쓰지 않는다.
 *   AI는 누락된 관점/모호점만 질문·플래그로 제시한다.
 * - S4 게이트 통과 조건: 테스트 케이스 3개 이상(제목/주어진/할 때/그러면 모두 채움) + 프롬프트 5칸 채움 + "확정" 누름.
 */

const uuid = z.string().uuid();

type TestCase = {
  id: string;
  title: string;
  given: string;
  when_step: string;
  then_step: string;
  order_index: number;
};

type PromptFields = {
  role: string;
  context: string;
  task: string;
  nonfunctional: string;
};

const promptSchema = z.object({
  role: z.string().max(500),
  context: z.string().max(2000),
  task: z.string().max(2000),
  nonfunctional: z.string().max(1000),
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

function isCompleteCase(c: {
  title?: string | null;
  given?: string | null;
  when_step?: string | null;
  then_step?: string | null;
}) {
  return (
    (c.title ?? "").trim().length > 0 &&
    (c.given ?? "").trim().length > 0 &&
    (c.when_step ?? "").trim().length > 0 &&
    (c.then_step ?? "").trim().length > 0
  );
}

function isPromptComplete(p: PromptFields) {
  return (
    p.role.trim().length > 0 &&
    p.context.trim().length > 0 &&
    p.task.trim().length > 0 &&
    p.nonfunctional.trim().length > 0
  );
}

// -------- 상태 조회 --------

export const getMyS4State = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string }) => z.object({ userId: uuid }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const user = await getUser(data.userId);
    if (!user) return { ok: false as const, error: "세션이 만료되었습니다." };

    const [{ data: cases }, { data: prompt }, { data: prd }] = await Promise.all([
      supabaseAdmin
        .from("s4_test_cases")
        .select("id, title, given, when_step, then_step, order_index")
        .eq("user_id", user.id)
        .order("order_index", { ascending: true }),
      supabaseAdmin
        .from("s4_prompts")
        .select("role, context, task, nonfunctional, confirmed_at")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabaseAdmin
        .from("s3_prd_drafts")
        .select("problem, users, features, nonfunctional, success_metric, out_of_scope, submitted_v2_at")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    const completeCases = (cases ?? []).filter(isCompleteCase).length;
    const confirmed = !!prompt?.confirmed_at;
    return {
      ok: true as const,
      cases: (cases ?? []) as TestCase[],
      completeCases,
      canBuildPrompt: completeCases >= 3,
      prompt: {
        role: prompt?.role ?? "",
        context: prompt?.context ?? "",
        task: prompt?.task ?? "",
        nonfunctional: prompt?.nonfunctional ?? "",
      },
      confirmedAt: prompt?.confirmed_at ?? null,
      confirmed,
      prd: prd?.submitted_v2_at
        ? {
            problem: prd.problem,
            users: prd.users,
            features: prd.features,
            nonfunctional: prd.nonfunctional,
            success_metric: prd.success_metric,
            out_of_scope: prd.out_of_scope,
          }
        : null,
    };
  });

// -------- 테스트 케이스 CRUD --------

export const upsertS4TestCase = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      userId: string;
      id?: string;
      title: string;
      given: string;
      when_step: string;
      then_step: string;
      order_index?: number;
    }) =>
      z
        .object({
          userId: uuid,
          id: uuid.optional(),
          title: z.string().max(200),
          given: z.string().max(1000),
          when_step: z.string().max(1000),
          then_step: z.string().max(1000),
          order_index: z.number().int().min(0).max(999).optional(),
        })
        .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const user = await getUser(data.userId);
    if (!user) return { ok: false as const, error: "세션이 만료되었습니다." };
    if (user.role !== "participant") return { ok: false as const, error: "참가자만 저장할 수 있습니다." };

    // 확정 이후에도 테스트 케이스는 자유롭게 추가·수정 가능


    if (data.id) {
      const { error } = await supabaseAdmin
        .from("s4_test_cases")
        .update({
          title: data.title,
          given: data.given,
          when_step: data.when_step,
          then_step: data.then_step,
        })
        .eq("id", data.id)
        .eq("user_id", user.id);
      if (error) return { ok: false as const, error: "저장에 실패했습니다." };
      return { ok: true as const, id: data.id };
    }

    // 신규: order_index = 현재 최대치 + 1
    const { data: existing } = await supabaseAdmin
      .from("s4_test_cases")
      .select("order_index")
      .eq("user_id", user.id)
      .order("order_index", { ascending: false })
      .limit(1);
    const nextIndex = (existing?.[0]?.order_index ?? -1) + 1;

    const { data: inserted, error } = await supabaseAdmin
      .from("s4_test_cases")
      .insert({
        user_id: user.id,
        session_id: user.session_id,
        title: data.title,
        given: data.given,
        when_step: data.when_step,
        then_step: data.then_step,
        order_index: data.order_index ?? nextIndex,
      })
      .select("id")
      .single();
    if (error || !inserted) return { ok: false as const, error: "저장에 실패했습니다." };
    return { ok: true as const, id: inserted.id };
  });

export const deleteS4TestCase = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string; id: string }) =>
    z.object({ userId: uuid, id: uuid }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const user = await getUser(data.userId);
    if (!user) return { ok: false as const, error: "세션이 만료되었습니다." };

    // 확정 이후에도 테스트 케이스는 자유롭게 삭제 가능


    const { error } = await supabaseAdmin
      .from("s4_test_cases")
      .delete()
      .eq("id", data.id)
      .eq("user_id", user.id);
    if (error) return { ok: false as const, error: "삭제에 실패했습니다." };
    return { ok: true as const };
  });

// -------- TDD 도우미 (질문·지적만) --------

const TDD_SYSTEM = `너는 테스트 케이스 리뷰 도우미다. 아주 엄격한 규칙을 지켜라.

절대 금지:
- 참가자를 대신해 테스트 케이스 문장을 쓰거나 예시 답을 제시하지 마라.
- "이렇게 쓰면 됩니다", "예: ..." 같은 문장을 절대 넣지 마라.
- Given/When/Then 문장을 대신 작성하지 마라.

너의 역할:
- PRD와 참가자가 작성한 테스트 케이스 목록을 읽고, 놓치기 쉬운 관점(성공/실패/경계값/빈 입력/오프라인/접근성/개인정보/한국어 특수문자 등)을 짧은 질문 3~5개로 지적하라.
- 각 질문에는 태그(missing_failure/missing_boundary/missing_a11y/missing_privacy/missing_offline/missing_edge/ambiguity 중 하나)를 붙여라.
- 한국어. 각 질문은 한 문장. 물음표로 끝나야 한다.

반드시 아래 JSON 스키마로만 응답하라:
{"hints":[{"tag":"<태그>","q":"<질문 한 문장>"}]}
hints 배열은 3~5개.`;

async function callTddAI(context: string): Promise<
  { ok: true; hints: Array<{ tag: string; q: string }> } | { ok: false; error: string }
> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) return { ok: false, error: "AI 키가 설정되지 않았습니다." };

  const body = {
    model: "google/gemini-2.5-flash",
    messages: [
      { role: "system", content: TDD_SYSTEM },
      { role: "user", content: context },
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
    const parsed = JSON.parse(content) as { hints?: Array<{ tag?: string; q?: string }> };
    const raw = Array.isArray(parsed.hints) ? parsed.hints : [];
    const cleaned = raw
      .map((x) => ({
        tag: typeof x.tag === "string" ? x.tag : "ambiguity",
        q: typeof x.q === "string" ? x.q.trim() : "",
      }))
      .filter((x) => x.q.length > 0)
      .slice(0, 5);
    if (cleaned.length < 1) return { ok: false, error: "AI 힌트를 생성하지 못했습니다. 다시 시도해 주세요." };
    return { ok: true, hints: cleaned };
  } catch {
    return { ok: false, error: "AI 응답 형식이 올바르지 않습니다." };
  }
}

export const getTddHints = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string }) => z.object({ userId: uuid }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const user = await getUser(data.userId);
    if (!user) return { ok: false as const, error: "세션이 만료되었습니다." };

    const [{ data: cases }, { data: prd }] = await Promise.all([
      supabaseAdmin
        .from("s4_test_cases")
        .select("title, given, when_step, then_step, order_index")
        .eq("user_id", user.id)
        .order("order_index", { ascending: true }),
      supabaseAdmin
        .from("s3_prd_drafts")
        .select("problem, users, features, nonfunctional, success_metric, out_of_scope")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    const complete = (cases ?? []).filter(isCompleteCase);
    if (complete.length < 1) {
      return { ok: false as const, error: "먼저 완성된 테스트 케이스를 1개 이상 작성해 주세요." };
    }

    const prdText = prd
      ? [
          `# 문제\n${prd.problem}`,
          `# 사용자\n${prd.users}`,
          `# 핵심 기능\n${prd.features}`,
          `# 비기능\n${prd.nonfunctional}`,
          `# 성공 지표\n${prd.success_metric}`,
          `# 범위 밖\n${prd.out_of_scope}`,
        ].join("\n\n")
      : "(PRD 없음)";
    const casesText = complete
      .map(
        (c, i) =>
          `## 케이스 ${i + 1}: ${c.title}\n- 주어진: ${c.given}\n- 할 때: ${c.when_step}\n- 그러면: ${c.then_step}`,
      )
      .join("\n\n");

    const context = `아래 PRD와 참가자가 작성한 테스트 케이스 ${complete.length}개를 읽고, 놓치기 쉬운 관점을 질문 3~5개로 지적하라.\n\n${prdText}\n\n---\n\n${casesText}`;

    const gen = await callTddAI(context);
    if (!gen.ok) return { ok: false as const, error: gen.error };
    return { ok: true as const, hints: gen.hints };
  });

// -------- 프롬프트 저장/확정 --------

export const saveMyS4Prompt = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string; fields: PromptFields }) =>
    z.object({ userId: uuid, fields: promptSchema }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const user = await getUser(data.userId);
    if (!user) return { ok: false as const, error: "세션이 만료되었습니다." };
    if (user.role !== "participant") return { ok: false as const, error: "참가자만 저장할 수 있습니다." };

    const { data: existing } = await supabaseAdmin
      .from("s4_prompts")
      .select("confirmed_at")
      .eq("user_id", user.id)
      .maybeSingle();
    if (existing?.confirmed_at) {
      return { ok: false as const, error: "확정된 프롬프트는 수정할 수 없습니다." };
    }

    const { error } = await supabaseAdmin.from("s4_prompts").upsert(
      {
        user_id: user.id,
        session_id: user.session_id,
        role: data.fields.role,
        context: data.fields.context,
        task: data.fields.task,
        nonfunctional: data.fields.nonfunctional,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (error) return { ok: false as const, error: "자동 저장에 실패했습니다." };
    return { ok: true as const };
  });

export const confirmMyS4Prompt = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string }) => z.object({ userId: uuid }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const user = await getUser(data.userId);
    if (!user) return { ok: false as const, error: "세션이 만료되었습니다." };
    if (user.role !== "participant") return { ok: false as const, error: "참가자만 확정할 수 있습니다." };

    const [{ data: cases }, { data: prompt }] = await Promise.all([
      supabaseAdmin
        .from("s4_test_cases")
        .select("title, given, when_step, then_step")
        .eq("user_id", user.id),
      supabaseAdmin
        .from("s4_prompts")
        .select("role, context, task, nonfunctional, confirmed_at")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    const completeCount = (cases ?? []).filter(isCompleteCase).length;
    if (completeCount < 3) {
      return { ok: false as const, error: "완성된 테스트 케이스 3개 이상이 필요합니다." };
    }
    if (!prompt) return { ok: false as const, error: "프롬프트를 먼저 저장해 주세요." };
    if (
      !isPromptComplete({
        role: prompt.role,
        context: prompt.context,
        task: prompt.task,
        nonfunctional: prompt.nonfunctional,
      })
    ) {
      return { ok: false as const, error: "프롬프트 5칸을 모두 채워 주세요." };
    }

    const now = new Date().toISOString();
    const { error } = await supabaseAdmin
      .from("s4_prompts")
      .update({ confirmed_at: prompt.confirmed_at ?? now, updated_at: now })
      .eq("user_id", user.id);
    if (error) return { ok: false as const, error: "확정에 실패했습니다." };
    return { ok: true as const };
  });

// -------- 강사 요약 --------

export const getSessionS4Overview = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string }) => z.object({ userId: uuid }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const caller = await getUser(data.userId);
    if (!caller) return { ok: false as const, error: "세션이 만료되었습니다." };
    if (caller.role !== "instructor") return { ok: false as const, error: "강사만 조회할 수 있습니다." };

    const [{ data: members }, { data: cases }, { data: prompts }] = await Promise.all([
      supabaseAdmin
        .from("app_users")
        .select("id, nickname")
        .eq("session_id", caller.session_id)
        .eq("role", "participant"),
      supabaseAdmin
        .from("s4_test_cases")
        .select("user_id, title, given, when_step, then_step")
        .eq("session_id", caller.session_id),
      supabaseAdmin
        .from("s4_prompts")
        .select("user_id, confirmed_at, role, context, task, nonfunctional")
        .eq("session_id", caller.session_id),
    ]);

    const casesByUser = new Map<string, number>();
    for (const c of cases ?? []) {
      if (isCompleteCase(c)) casesByUser.set(c.user_id, (casesByUser.get(c.user_id) ?? 0) + 1);
    }
    const promptMap = new Map((prompts ?? []).map((p) => [p.user_id, p]));

    const progress = (members ?? []).map((m) => {
      const complete = casesByUser.get(m.id) ?? 0;
      const p = promptMap.get(m.id);
      const filled = p
        ? isPromptComplete({
            role: p.role,
            context: p.context,
            task: p.task,
            nonfunctional: p.nonfunctional,
          })
        : false;
      return {
        userId: m.id,
        nickname: m.nickname,
        completeCases: complete,
        promptFilled: filled,
        confirmed: !!p?.confirmed_at,
      };
    });
    return { ok: true as const, progress };
  });
