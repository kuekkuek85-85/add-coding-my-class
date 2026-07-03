import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * S6(갤러리 발표) 서버 함수.
 *
 * 원칙:
 * - 슬라이드 초안 생성만 AI가 허용된다(프로젝트 예외).
 *   생성된 초안은 반드시 참가자가 편집·확정한 뒤에만 발표에 사용된다.
 * - 청중 코멘트 "좋은 점"은 필수(5자 이상).
 * - 발표 큐/현재 발표자/완료 처리는 강사만.
 * - 게이트: 슬라이드 6장 모두 heading/body 채움 + "발표 준비 완료".
 */

const uuid = z.string().uuid();
const SLIDE_COUNT = 6;

export type Slide = { heading: string; body: string };

const slideSchema = z.object({
  heading: z.string().max(200),
  body: z.string().max(1500),
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

function normalizeSlides(raw: unknown): Slide[] {
  const arr = Array.isArray(raw) ? raw : [];
  const out: Slide[] = [];
  for (let i = 0; i < SLIDE_COUNT; i++) {
    const s = arr[i] as { heading?: unknown; body?: unknown } | undefined;
    out.push({
      heading: typeof s?.heading === "string" ? s.heading : "",
      body: typeof s?.body === "string" ? s.body : "",
    });
  }
  return out;
}

function slidesComplete(slides: Slide[]): boolean {
  if (slides.length < SLIDE_COUNT) return false;
  return slides.every(
    (s) => s.heading.trim().length > 0 && s.body.trim().length > 0,
  );
}

// -------- 참가자: 내 상태 --------

export const getMyS6State = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string }) => z.object({ userId: uuid }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const user = await getUser(data.userId);
    if (!user) return { ok: false as const, error: "세션이 만료되었습니다." };

    const [{ data: revised }, { data: deck }, { data: queueRow }] = await Promise.all([
      supabaseAdmin
        .from("s5_revised_prompts")
        .select("confirmed_at")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabaseAdmin
        .from("s6_slide_decks")
        .select("title, slides, draft_generated_at, confirmed_at")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabaseAdmin
        .from("s6_presentation_queue")
        .select("state, order_index, started_at, finished_at")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    const slides = normalizeSlides(deck?.slides);
    return {
      ok: true as const,
      s5Confirmed: !!revised?.confirmed_at,
      title: deck?.title ?? "",
      slides,
      draftGeneratedAt: deck?.draft_generated_at ?? null,
      confirmed: !!deck?.confirmed_at,
      slidesComplete: slidesComplete(slides),
      queue: queueRow
        ? {
            state: queueRow.state as "waiting" | "current" | "done",
            orderIndex: queueRow.order_index,
            startedAt: queueRow.started_at,
            finishedAt: queueRow.finished_at,
          }
        : null,
    };
  });

// -------- 갤러리: 참가자 카드 목록 --------

export const getGallery = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string }) => z.object({ userId: uuid }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const caller = await getUser(data.userId);
    if (!caller) return { ok: false as const, error: "세션이 만료되었습니다." };

    const { data: members } = await supabaseAdmin
      .from("app_users")
      .select("id, nickname")
      .eq("session_id", caller.session_id)
      .eq("role", "participant")
      .order("nickname", { ascending: true });

    const memberIds = (members ?? []).map((m) => m.id);
    if (memberIds.length === 0) return { ok: true as const, gallery: [] };

    const [
      { data: prds },
      { data: prompts },
      { data: revised },
      { data: decks },
    ] = await Promise.all([
      supabaseAdmin
        .from("s3_prd_drafts")
        .select("user_id, problem, users, features")
        .in("user_id", memberIds),
      supabaseAdmin
        .from("s4_prompts")
        .select("user_id, role, task, confirmed_at")
        .in("user_id", memberIds),
      supabaseAdmin
        .from("s5_revised_prompts")
        .select("user_id, target, add_list, confirmed_at")
        .in("user_id", memberIds),
      supabaseAdmin
        .from("s6_slide_decks")
        .select("user_id, title, confirmed_at")
        .in("user_id", memberIds),
    ]);

    const prdMap = new Map((prds ?? []).map((r) => [r.user_id, r]));
    const promptMap = new Map((prompts ?? []).map((r) => [r.user_id, r]));
    const revisedMap = new Map((revised ?? []).map((r) => [r.user_id, r]));
    const deckMap = new Map((decks ?? []).map((r) => [r.user_id, r]));

    const gallery = (members ?? []).map((m) => {
      const prd = prdMap.get(m.id);
      const pr = promptMap.get(m.id);
      const rv = revisedMap.get(m.id);
      const dk = deckMap.get(m.id);
      return {
        userId: m.id,
        nickname: m.nickname,
        prdProblem: (prd?.problem ?? "").slice(0, 240),
        promptRole: pr?.role ?? "",
        promptTask: (pr?.task ?? "").slice(0, 240),
        promptConfirmed: !!pr?.confirmed_at,
        revisedTarget: rv?.target ?? "",
        revisedAdd: (rv?.add_list ?? "").slice(0, 240),
        revisedConfirmed: !!rv?.confirmed_at,
        deckTitle: dk?.title ?? "",
        deckConfirmed: !!dk?.confirmed_at,
      };
    });
    return { ok: true as const, gallery };
  });

// -------- 갤러리: 특정 참가자 상세 --------

export const getParticipantBundle = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string; targetId: string }) =>
    z.object({ userId: uuid, targetId: uuid }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const caller = await getUser(data.userId);
    if (!caller) return { ok: false as const, error: "세션이 만료되었습니다." };

    const { data: target } = await supabaseAdmin
      .from("app_users")
      .select("id, nickname, session_id, deployed_url")
      .eq("id", data.targetId)
      .maybeSingle();
    if (!target || target.session_id !== caller.session_id)
      return { ok: false as const, error: "잘못된 대상입니다." };

    const [{ data: prd }, { data: prompt }, { data: revised }, { data: cases }, { data: results }] =
      await Promise.all([
        supabaseAdmin
          .from("s3_prd_drafts")
          .select("problem, users, features, nonfunctional, success_metric, out_of_scope")
          .eq("user_id", target.id)
          .maybeSingle(),
        supabaseAdmin
          .from("s4_prompts")
          .select("role, context, task, nonfunctional, confirmed_at")
          .eq("user_id", target.id)
          .maybeSingle(),
        supabaseAdmin
          .from("s5_revised_prompts")
          .select("target, evidence, keep_list, add_list, constraints, confirmed_at")
          .eq("user_id", target.id)
          .maybeSingle(),
        supabaseAdmin
          .from("s4_test_cases")
          .select("id, title, given, when_step, then_step, order_index")
          .eq("user_id", target.id)
          .order("order_index", { ascending: true }),
        supabaseAdmin
          .from("s5_checklist_results")
          .select("test_case_id, status, note")
          .eq("user_id", target.id),
      ]);

    const rmap = new Map((results ?? []).map((r) => [r.test_case_id, r]));
    return {
      ok: true as const,
      nickname: target.nickname,
      deployedUrl: (target as { deployed_url?: string | null }).deployed_url ?? null,
      prd: prd ?? null,
      prompt: prompt ?? null,
      revised: revised ?? null,
      cases: (cases ?? []).map((c) => ({
        title: c.title,
        given: c.given,
        when_step: c.when_step,
        then_step: c.then_step,
        result: rmap.get(c.id) ?? null,
      })),
    };
  });


// -------- 슬라이드 저장 --------

export const saveMySlides = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { userId: string; title: string; slides: Slide[] }) =>
      z
        .object({
          userId: uuid,
          title: z.string().max(200),
          slides: z.array(slideSchema).length(SLIDE_COUNT),
        })
        .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const user = await getUser(data.userId);
    if (!user) return { ok: false as const, error: "세션이 만료되었습니다." };
    if (user.role !== "participant")
      return { ok: false as const, error: "참가자만 저장할 수 있습니다." };

    const { data: existing } = await supabaseAdmin
      .from("s6_slide_decks")
      .select("confirmed_at")
      .eq("user_id", user.id)
      .maybeSingle();
    if (existing?.confirmed_at)
      return { ok: false as const, error: "확정 후에는 편집할 수 없습니다." };

    const { error } = await supabaseAdmin.from("s6_slide_decks").upsert(
      {
        user_id: user.id,
        session_id: user.session_id,
        title: data.title,
        slides: data.slides,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (error) return { ok: false as const, error: "자동 저장에 실패했습니다." };
    return { ok: true as const };
  });

// -------- 슬라이드 확정 --------

export const confirmMySlides = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string }) => z.object({ userId: uuid }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const user = await getUser(data.userId);
    if (!user) return { ok: false as const, error: "세션이 만료되었습니다." };
    if (user.role !== "participant")
      return { ok: false as const, error: "참가자만 확정할 수 있습니다." };

    const { data: deck } = await supabaseAdmin
      .from("s6_slide_decks")
      .select("title, slides, confirmed_at")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!deck) return { ok: false as const, error: "슬라이드를 먼저 저장해 주세요." };

    const slides = normalizeSlides(deck.slides);
    if (!slidesComplete(slides))
      return { ok: false as const, error: "6장 모두 제목과 본문을 채워 주세요." };

    const now = new Date().toISOString();
    const { error } = await supabaseAdmin
      .from("s6_slide_decks")
      .update({ confirmed_at: deck.confirmed_at ?? now, updated_at: now })
      .eq("user_id", user.id);
    if (error) return { ok: false as const, error: "확정에 실패했습니다." };
    return { ok: true as const };
  });

// -------- 슬라이드 AI 초안 --------

const DRAFT_SYSTEM = `너는 교사 연수 "내 수업에 코딩 한 스푼" 참가자의 3분 발표 초안을 6장 만들어 주는 도우미다.
반드시 참가자가 그 자리에서 편집·다듬기 위한 "초안"이며, 최종 문장은 참가자가 확정한다.
슬라이드 6장의 목적은 다음 순서로 고정:
1) 표지: 발표 주제(한 줄) + 본인 이름(주어짐).
2) 문제 정의: PRD의 문제/사용자 요약.
3) 첫 PRD 프롬프트: PRD → 첫 PRD 프롬프트로 넘어간 핵심.
4) 실행에서 배운 것: 테스트 결과에서 관찰한 것.
5) 개선한 프롬프트: 수정 PRD 프롬프트의 핵심.
6) 다음에 해볼 것: 수업 현장에서 다음에 시도할 것.
- 각 슬라이드 heading은 10자 이내, body는 2~4문장(120자 이내).
- 학생용이 아니라 성인 교사 청중용 톤(친근하지만 존댓말, 이모지 없음).
반드시 JSON으로만 응답:
{"title":"...","slides":[{"heading":"...","body":"..."},... 총 6개]}`;

async function callDraftAI(context: string): Promise<
  { ok: true; title: string; slides: Slide[] } | { ok: false; error: string }
> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) return { ok: false, error: "AI 키가 설정되지 않았습니다." };

  const body = {
    model: "google/gemini-2.5-flash",
    messages: [
      { role: "system", content: DRAFT_SYSTEM },
      { role: "user", content: context },
    ],
    response_format: { type: "json_object" },
  };

  let res: Response;
  try {
    res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
    });
  } catch {
    return { ok: false, error: "AI 요청 중 네트워크 오류가 발생했습니다." };
  }
  if (res.status === 429) return { ok: false, error: "AI 사용량 한도에 도달했습니다." };
  if (res.status === 402) return { ok: false, error: "AI 크레딧이 부족합니다." };
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
    const parsed = JSON.parse(content) as {
      title?: string;
      slides?: Array<{ heading?: string; body?: string }>;
    };
    const rawSlides = Array.isArray(parsed.slides) ? parsed.slides : [];
    const slides: Slide[] = [];
    for (let i = 0; i < SLIDE_COUNT; i++) {
      const s = rawSlides[i];
      slides.push({
        heading: typeof s?.heading === "string" ? s.heading.trim() : "",
        body: typeof s?.body === "string" ? s.body.trim() : "",
      });
    }
    const title = typeof parsed.title === "string" ? parsed.title.trim() : "";
    if (slides.every((s) => !s.heading && !s.body))
      return { ok: false, error: "AI 초안 생성에 실패했습니다." };
    return { ok: true, title, slides };
  } catch {
    return { ok: false, error: "AI 응답 형식이 올바르지 않습니다." };
  }
}

export const generateSlideDraft = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string }) => z.object({ userId: uuid }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const user = await getUser(data.userId);
    if (!user) return { ok: false as const, error: "세션이 만료되었습니다." };
    if (user.role !== "participant")
      return { ok: false as const, error: "참가자만 사용할 수 있습니다." };

    const { data: existing } = await supabaseAdmin
      .from("s6_slide_decks")
      .select("confirmed_at")
      .eq("user_id", user.id)
      .maybeSingle();
    if (existing?.confirmed_at)
      return { ok: false as const, error: "확정된 슬라이드는 초안을 다시 생성할 수 없습니다." };

    const [{ data: prd }, { data: prompt }, { data: revised }, { data: cases }, { data: results }] =
      await Promise.all([
        supabaseAdmin
          .from("s3_prd_drafts")
          .select("problem, users, features, nonfunctional, success_metric")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabaseAdmin
          .from("s4_prompts")
          .select("role, context, task, nonfunctional")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabaseAdmin
          .from("s5_revised_prompts")
          .select("target, evidence, keep_list, add_list, constraints")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabaseAdmin
          .from("s4_test_cases")
          .select("id, title, given, when_step, then_step")
          .eq("user_id", user.id),
        supabaseAdmin
          .from("s5_checklist_results")
          .select("test_case_id, status, note")
          .eq("user_id", user.id),
      ]);

    const rmap = new Map((results ?? []).map((r) => [r.test_case_id, r]));
    const caseLines = (cases ?? [])
      .map((c) => {
        const r = rmap.get(c.id);
        return `- ${c.title} [${r?.status ?? "미기록"}] 관찰: ${r?.note ?? "-"}`;
      })
      .join("\n");

    const context = [
      `발표자: ${user.nickname}`,
      "",
      "## PRD",
      `문제: ${prd?.problem ?? ""}`,
      `사용자: ${prd?.users ?? ""}`,
      `핵심 기능: ${prd?.features ?? ""}`,
      "",
      "## 수정한 PRD 프롬프트",
      prompt?.context ?? "",
      "",
      "## 실행 체크(테스트 결과)",
      caseLines || "(없음)",
      "",
      "## 수정 PRD 프롬프트",
      `대상: ${revised?.target ?? ""}`,
      `근거: ${revised?.evidence ?? ""}`,
      `유지: ${revised?.keep_list ?? ""}`,
      `추가: ${revised?.add_list ?? ""}`,
      `제약: ${revised?.constraints ?? ""}`,
    ].join("\n");

    const gen = await callDraftAI(context);
    if (!gen.ok) return gen;

    const now = new Date().toISOString();
    const { error } = await supabaseAdmin.from("s6_slide_decks").upsert(
      {
        user_id: user.id,
        session_id: user.session_id,
        title: gen.title || `${user.nickname}의 발표`,
        slides: gen.slides,
        draft_generated_at: now,
        updated_at: now,
      },
      { onConflict: "user_id" },
    );
    if (error) return { ok: false as const, error: "초안 저장에 실패했습니다." };
    return { ok: true as const, title: gen.title, slides: gen.slides };
  });

// -------- 청중 코멘트 --------

export const submitComment = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { userId: string; presenterId: string; good: string; question: string }) =>
      z
        .object({
          userId: uuid,
          presenterId: uuid,
          good: z.string().transform((s) => s.trim()),
          question: z.string().max(1000).transform((s) => s.trim()),
        })
        .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const user = await getUser(data.userId);
    if (!user) return { ok: false as const, error: "세션이 만료되었습니다." };
    if (user.role !== "participant")
      return { ok: false as const, error: "참가자만 코멘트할 수 있습니다." };
    if (user.id === data.presenterId)
      return { ok: false as const, error: "자기 자신에게는 코멘트할 수 없습니다." };
    if (data.good.length < 5)
      return { ok: false as const, error: "'좋은 점'을 5자 이상 입력해 주세요." };
    if (data.good.length > 1000)
      return { ok: false as const, error: "'좋은 점'은 1000자 이내로 작성해 주세요." };

    const { data: presenter } = await supabaseAdmin
      .from("app_users")
      .select("session_id")
      .eq("id", data.presenterId)
      .maybeSingle();
    if (!presenter || presenter.session_id !== user.session_id)
      return { ok: false as const, error: "같은 세션의 참가자에게만 코멘트할 수 있습니다." };

    const { error } = await supabaseAdmin.from("s6_comments").insert({
      session_id: user.session_id,
      presenter_id: data.presenterId,
      commenter_id: user.id,
      good: data.good,
      question: data.question || null,
    });
    if (error) return { ok: false as const, error: "코멘트 저장에 실패했습니다." };
    return { ok: true as const };
  });

export const getPresenterComments = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string; presenterId: string }) =>
    z.object({ userId: uuid, presenterId: uuid }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const user = await getUser(data.userId);
    if (!user) return { ok: false as const, error: "세션이 만료되었습니다." };

    const { data: rows } = await supabaseAdmin
      .from("s6_comments")
      .select("id, commenter_id, good, question, created_at")
      .eq("presenter_id", data.presenterId)
      .order("created_at", { ascending: false });
    const ids = Array.from(new Set((rows ?? []).map((r) => r.commenter_id)));
    const { data: users } = ids.length
      ? await supabaseAdmin.from("app_users").select("id, nickname").in("id", ids)
      : { data: [] as { id: string; nickname: string }[] };
    const nickMap = new Map((users ?? []).map((u) => [u.id, u.nickname]));
    return {
      ok: true as const,
      comments: (rows ?? []).map((r) => ({
        id: r.id,
        commenterNickname: nickMap.get(r.commenter_id) ?? "익명",
        good: r.good,
        question: r.question,
        createdAt: r.created_at,
      })),
    };
  });

// -------- 발표 큐 --------

export const getPresentationState = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string }) => z.object({ userId: uuid }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const user = await getUser(data.userId);
    if (!user) return { ok: false as const, error: "세션이 만료되었습니다." };

    const [{ data: queue }, { data: sessionRow }] = await Promise.all([
      supabaseAdmin
        .from("s6_presentation_queue")
        .select("user_id, order_index, state, started_at, finished_at")
        .eq("session_id", user.session_id)
        .order("order_index", { ascending: true }),
      supabaseAdmin
        .from("sessions")
        .select("s6_timer_started_at")
        .eq("id", user.session_id)
        .maybeSingle(),
    ]);

    const userIds = (queue ?? []).map((q) => q.user_id);
    const { data: members } = userIds.length
      ? await supabaseAdmin.from("app_users").select("id, nickname").in("id", userIds)
      : { data: [] as { id: string; nickname: string }[] };
    const nickMap = new Map((members ?? []).map((m) => [m.id, m.nickname]));

    const rows = (queue ?? []).map((q) => ({
      userId: q.user_id,
      nickname: nickMap.get(q.user_id) ?? "참가자",
      orderIndex: q.order_index,
      state: q.state as "waiting" | "current" | "done",
      startedAt: q.started_at,
      finishedAt: q.finished_at,
    }));
    const current = rows.find((r) => r.state === "current") ?? null;

    let currentDeck:
      | { title: string; slides: Slide[]; deployedUrl: string | null }
      | null = null;
    if (current) {
      const [{ data: deck }, { data: presenter }] = await Promise.all([
        supabaseAdmin
          .from("s6_slide_decks")
          .select("title, slides")
          .eq("user_id", current.userId)
          .maybeSingle(),
        supabaseAdmin
          .from("app_users")
          .select("deployed_url")
          .eq("id", current.userId)
          .maybeSingle(),
      ]);
      if (deck) {
        currentDeck = {
          title: (deck.title ?? "").trim() || `${current.nickname} 님의 발표`,
          slides: normalizeSlides(deck.slides),
          deployedUrl: presenter?.deployed_url ?? null,
        };
      }
    }

    return {
      ok: true as const,
      queue: rows,
      current,
      currentDeck,
      timerStartedAt: sessionRow?.s6_timer_started_at ?? null,
    };
  });

// -------- 강사 전용 --------

async function requireInstructor(userId: string) {
  const user = await getUser(userId);
  if (!user) return { ok: false as const, error: "세션이 만료되었습니다." };
  if (user.role !== "instructor")
    return { ok: false as const, error: "강사만 조작할 수 있습니다." };
  return { ok: true as const, user };
}

export const addToQueue = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string; targetId: string }) =>
    z.object({ userId: uuid, targetId: uuid }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const check = await requireInstructor(data.userId);
    if (!check.ok) return check;
    const { user } = check;

    const { data: target } = await supabaseAdmin
      .from("app_users")
      .select("id, session_id, role")
      .eq("id", data.targetId)
      .maybeSingle();
    if (!target || target.session_id !== user.session_id || target.role !== "participant")
      return { ok: false as const, error: "잘못된 대상입니다." };

    const { data: deck } = await supabaseAdmin
      .from("s6_slide_decks")
      .select("confirmed_at")
      .eq("user_id", target.id)
      .maybeSingle();
    if (!deck?.confirmed_at)
      return { ok: false as const, error: "슬라이드 확정 전에는 큐에 넣을 수 없습니다." };

    const { data: existing } = await supabaseAdmin
      .from("s6_presentation_queue")
      .select("id")
      .eq("session_id", user.session_id)
      .eq("user_id", target.id)
      .maybeSingle();
    if (existing) return { ok: true as const };

    const { data: last } = await supabaseAdmin
      .from("s6_presentation_queue")
      .select("order_index")
      .eq("session_id", user.session_id)
      .order("order_index", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextOrder = (last?.order_index ?? 0) + 1;

    const { error } = await supabaseAdmin.from("s6_presentation_queue").insert({
      session_id: user.session_id,
      user_id: target.id,
      order_index: nextOrder,
      state: "waiting",
    });
    if (error) return { ok: false as const, error: "큐 추가에 실패했습니다." };
    return { ok: true as const };
  });

export const removeFromQueue = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string; targetId: string }) =>
    z.object({ userId: uuid, targetId: uuid }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const check = await requireInstructor(data.userId);
    if (!check.ok) return check;
    const { user } = check;
    const { error } = await supabaseAdmin
      .from("s6_presentation_queue")
      .delete()
      .eq("session_id", user.session_id)
      .eq("user_id", data.targetId);
    if (error) return { ok: false as const, error: "큐 제거에 실패했습니다." };
    return { ok: true as const };
  });

export const setCurrentPresenter = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string; targetId: string }) =>
    z.object({ userId: uuid, targetId: uuid }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const check = await requireInstructor(data.userId);
    if (!check.ok) return check;
    const { user } = check;

    // 기존 current 는 waiting 으로 되돌리지 않고 done 처리한 뒤, 새 발표자만 current 로.
    const now = new Date().toISOString();
    await supabaseAdmin
      .from("s6_presentation_queue")
      .update({ state: "done", finished_at: now, updated_at: now })
      .eq("session_id", user.session_id)
      .eq("state", "current");

    const { error } = await supabaseAdmin
      .from("s6_presentation_queue")
      .update({ state: "current", started_at: now, finished_at: null, updated_at: now })
      .eq("session_id", user.session_id)
      .eq("user_id", data.targetId);
    if (error) return { ok: false as const, error: "현재 발표자 지정에 실패했습니다." };

    // 타이머 자동 시작
    await supabaseAdmin.from("sessions").update({ s6_timer_started_at: now }).eq("id", user.session_id);
    return { ok: true as const };
  });

export const markPresenterDone = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string; targetId: string }) =>
    z.object({ userId: uuid, targetId: uuid }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const check = await requireInstructor(data.userId);
    if (!check.ok) return check;
    const { user } = check;
    const now = new Date().toISOString();
    const { error } = await supabaseAdmin
      .from("s6_presentation_queue")
      .update({ state: "done", finished_at: now, updated_at: now })
      .eq("session_id", user.session_id)
      .eq("user_id", data.targetId);
    if (error) return { ok: false as const, error: "완료 처리에 실패했습니다." };
    return { ok: true as const };
  });

export const resetTimer = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string; start: boolean }) =>
    z.object({ userId: uuid, start: z.boolean() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const check = await requireInstructor(data.userId);
    if (!check.ok) return check;
    const { user } = check;
    const value = data.start ? new Date().toISOString() : null;
    const { error } = await supabaseAdmin
      .from("sessions")
      .update({ s6_timer_started_at: value })
      .eq("id", user.session_id);
    if (error) return { ok: false as const, error: "타이머 갱신에 실패했습니다." };
    return { ok: true as const };
  });

// -------- 강사용 요약 --------

export const getSessionS6Overview = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string }) => z.object({ userId: uuid }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const check = await requireInstructor(data.userId);
    if (!check.ok) return check;
    const { user } = check;

    const [{ data: members }, { data: decks }, { data: queue }, { data: comments }] =
      await Promise.all([
        supabaseAdmin
          .from("app_users")
          .select("id, nickname")
          .eq("session_id", user.session_id)
          .eq("role", "participant"),
        supabaseAdmin
          .from("s6_slide_decks")
          .select("user_id, confirmed_at, slides")
          .eq("session_id", user.session_id),
        supabaseAdmin
          .from("s6_presentation_queue")
          .select("user_id, state, order_index")
          .eq("session_id", user.session_id),
        supabaseAdmin
          .from("s6_comments")
          .select("presenter_id")
          .eq("session_id", user.session_id),
      ]);

    const deckMap = new Map(
      (decks ?? []).map((d) => [d.user_id, d] as const),
    );
    const queueMap = new Map((queue ?? []).map((q) => [q.user_id, q] as const));
    const commentCount = new Map<string, number>();
    for (const c of comments ?? []) {
      commentCount.set(c.presenter_id, (commentCount.get(c.presenter_id) ?? 0) + 1);
    }

    const progress = (members ?? []).map((m) => {
      const d = deckMap.get(m.id);
      const q = queueMap.get(m.id);
      const slides = normalizeSlides(d?.slides);
      return {
        userId: m.id,
        nickname: m.nickname,
        slidesConfirmed: !!d?.confirmed_at,
        slidesFilled: slidesComplete(slides),
        queueState: (q?.state as "waiting" | "current" | "done" | undefined) ?? null,
        orderIndex: q?.order_index ?? null,
        commentsReceived: commentCount.get(m.id) ?? 0,
      };
    });

    return { ok: true as const, progress };
  });
