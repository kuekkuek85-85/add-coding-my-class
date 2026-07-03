import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * 강사 대시보드에서 참가자별·교시별 산출물 상세를 팝업으로 보기 위한 서버 함수.
 * 강사만 호출 가능하며, 대상 참가자가 강사와 같은 세션에 속해있을 때만 열람합니다.
 */

const uuid = z.string().uuid();

async function getUser(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("app_users")
    .select("id, role, session_id, nickname, deployed_url")
    .eq("id", userId)
    .maybeSingle();
  return data;
}


export const getParticipantStageDetail = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { userId: string; targetUserId: string; stageNo: number }) =>
      z
        .object({
          userId: uuid,
          targetUserId: uuid,
          stageNo: z.number().int().min(1).max(7),
        })
        .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const caller = await getUser(data.userId);
    if (!caller) return { ok: false as const, error: "세션이 만료되었습니다." };
    if (caller.role !== "instructor")
      return { ok: false as const, error: "강사만 조회할 수 있습니다." };

    const target = await getUser(data.targetUserId);
    if (!target || target.session_id !== caller.session_id)
      return { ok: false as const, error: "해당 참가자를 찾을 수 없습니다." };

    const nickname = target.nickname ?? "참가자";
    const stage = data.stageNo;

    if (stage === 1) {
      const [{ data: checkpoints }, { data: progress }, { data: memos }] = await Promise.all([
        supabaseAdmin
          .from("checkpoints")
          .select("id, seq, label, hint")
          .eq("stage_no", 1)
          .order("seq", { ascending: true }),
        supabaseAdmin
          .from("checkpoint_progress")
          .select("checkpoint_id, checked_at")
          .eq("user_id", target.id),
        supabaseAdmin
          .from("morning_memos")
          .select("text, created_at")
          .eq("user_id", target.id)
          .eq("stage_no", 1)
          .order("created_at", { ascending: false }),
      ]);
      const checkedSet = new Set((progress ?? []).map((p) => p.checkpoint_id as string));
      return {
        ok: true as const,
        nickname,
        stage: 1 as const,
        s1: {
          checkpoints: (checkpoints ?? []).map((c) => ({
            id: c.id as string,
            seq: c.seq as number,
            label: c.label as string,
            hint: (c.hint ?? "") as string,
            checked: checkedSet.has(c.id as string),
          })),
          memos: (memos ?? []).map((m) => ({
            text: (m.text ?? "") as string,
            createdAt: (m.created_at ?? null) as string | null,
          })),
        },
      };
    }

    if (stage === 2) {
      const { data: cases } = await supabaseAdmin
        .from("s2_test_cases")
        .select("id, title, given_when, expected_then, created_at")
        .eq("user_id", target.id)
        .order("created_at", { ascending: true });
      return {
        ok: true as const,
        nickname,
        stage: 2 as const,
        s2: {
          cases: (cases ?? []).map((c) => ({
            id: c.id as string,
            title: (c.title ?? "") as string,
            given_when: (c.given_when ?? "") as string,
            expected_then: (c.expected_then ?? "") as string,
          })),
        },
      };
    }

    if (stage === 3) {
      const [{ data: prd }, { data: reviewsGiven }, { data: reviewsReceived }] =
        await Promise.all([
          supabaseAdmin
            .from("s3_prd_drafts")
            .select(
              "problem, users, features, nonfunctional, success_metric, out_of_scope, submitted_v1_at, submitted_v2_at, updated_at",
            )
            .eq("user_id", target.id)
            .maybeSingle(),
          supabaseAdmin
            .from("s3_reviews")
            .select("id, reviewee_id, good, question, suggestion, submitted_at")
            .eq("reviewer_id", target.id)
            .order("submitted_at", { ascending: false }),
          supabaseAdmin
            .from("s3_reviews")
            .select("id, reviewer_id, good, question, suggestion, submitted_at")
            .eq("reviewee_id", target.id)
            .order("submitted_at", { ascending: false }),
        ]);
      const partnerIds = Array.from(
        new Set([
          ...(reviewsGiven ?? []).map((r) => r.reviewee_id as string),
          ...(reviewsReceived ?? []).map((r) => r.reviewer_id as string),
        ]),
      );
      const nickMap = new Map<string, string>();
      if (partnerIds.length > 0) {
        const { data: people } = await supabaseAdmin
          .from("app_users")
          .select("id, nickname")
          .in("id", partnerIds);
        for (const p of people ?? []) nickMap.set(p.id as string, (p.nickname ?? "") as string);
      }
      return {
        ok: true as const,
        nickname,
        stage: 3 as const,
        s3: {
          prd: prd
            ? {
                problem: (prd.problem ?? "") as string,
                users: (prd.users ?? "") as string,
                features: (prd.features ?? "") as string,
                nonfunctional: (prd.nonfunctional ?? "") as string,
                success_metric: (prd.success_metric ?? "") as string,
                out_of_scope: (prd.out_of_scope ?? "") as string,
                submittedV1At: (prd.submitted_v1_at ?? null) as string | null,
                submittedV2At: (prd.submitted_v2_at ?? null) as string | null,
              }
            : null,
          reviewsGiven: (reviewsGiven ?? []).map((r) => ({
            partnerNickname: nickMap.get(r.reviewee_id as string) ?? "동료",
            good: (r.good ?? "") as string,
            question: (r.question ?? "") as string,
            suggestion: (r.suggestion ?? "") as string,
          })),
          reviewsReceived: (reviewsReceived ?? []).map((r) => ({
            partnerNickname: nickMap.get(r.reviewer_id as string) ?? "동료",
            good: (r.good ?? "") as string,
            question: (r.question ?? "") as string,
            suggestion: (r.suggestion ?? "") as string,
          })),
        },
      };
    }

    if (stage === 4) {
      const [{ data: cases }, { data: prompt }] = await Promise.all([
        supabaseAdmin
          .from("s4_test_cases")
          .select("id, title, given, when_step, then_step, order_index")
          .eq("user_id", target.id)
          .order("order_index", { ascending: true }),
        supabaseAdmin
          .from("s4_prompts")
          .select("role, context, task, nonfunctional, confirmed_at, updated_at")
          .eq("user_id", target.id)
          .maybeSingle(),
      ]);
      return {
        ok: true as const,
        nickname,
        stage: 4 as const,
        s4: {
          cases: (cases ?? []).map((c) => ({
            id: c.id as string,
            title: (c.title ?? "") as string,
            given: (c.given ?? "") as string,
            when_step: (c.when_step ?? "") as string,
            then_step: (c.then_step ?? "") as string,
          })),
          prompt: prompt
            ? {
                role: (prompt.role ?? "") as string,
                context: (prompt.context ?? "") as string,
                task: (prompt.task ?? "") as string,
                nonfunctional: (prompt.nonfunctional ?? "") as string,
                confirmedAt: (prompt.confirmed_at ?? null) as string | null,
              }
            : null,
        },
      };
    }

    if (stage === 5) {
      const [
        { data: results },
        { data: s4cases },
        { data: s2cases },
        { data: revised },
        { data: qaGiven },
        { data: qaReceived },
      ] = await Promise.all([
        supabaseAdmin
          .from("s5_checklist_results")
          .select("test_case_id, source, status, note, updated_at")
          .eq("user_id", target.id),
        supabaseAdmin
          .from("s4_test_cases")
          .select("id, title")
          .eq("user_id", target.id),
        supabaseAdmin
          .from("s2_test_cases")
          .select("id, title")
          .eq("user_id", target.id),
        supabaseAdmin
          .from("s5_revised_prompts")
          .select("target, evidence, keep_list, add_list, constraints, confirmed_at, updated_at")
          .eq("user_id", target.id)
          .maybeSingle(),
        supabaseAdmin
          .from("s5_qa_reviews")
          .select("id, reviewee_id, good, issue, suggestion, submitted_at")
          .eq("reviewer_id", target.id)
          .order("submitted_at", { ascending: false }),
        supabaseAdmin
          .from("s5_qa_reviews")
          .select("id, reviewer_id, good, issue, suggestion, submitted_at")
          .eq("reviewee_id", target.id)
          .order("submitted_at", { ascending: false }),
      ]);
      const titleMap = new Map<string, string>();
      for (const c of s4cases ?? []) titleMap.set(`s4:${c.id}`, (c.title ?? "") as string);
      for (const c of s2cases ?? []) titleMap.set(`s2:${c.id}`, (c.title ?? "") as string);
      const partnerIds = Array.from(
        new Set([
          ...(qaGiven ?? []).map((r) => r.reviewee_id as string),
          ...(qaReceived ?? []).map((r) => r.reviewer_id as string),
        ]),
      );
      const nickMap = new Map<string, string>();
      if (partnerIds.length > 0) {
        const { data: people } = await supabaseAdmin
          .from("app_users")
          .select("id, nickname")
          .in("id", partnerIds);
        for (const p of people ?? []) nickMap.set(p.id as string, (p.nickname ?? "") as string);
      }
      return {
        ok: true as const,
        nickname,
        stage: 5 as const,
        s5: {
          deployedUrl:
            (target as { deployed_url?: string | null }).deployed_url ?? null,
          results: (results ?? []).map((r) => ({
            testCaseId: r.test_case_id as string,
            source: (r.source ?? "s4") as "s2" | "s4",
            status: r.status as "pass" | "fail" | "partial",
            note: (r.note ?? "") as string,
            title: titleMap.get(`${r.source ?? "s4"}:${r.test_case_id}`) ?? "(제목 없음)",
          })),
          revised: revised
            ? {
                target: (revised.target ?? "") as string,
                evidence: (revised.evidence ?? "") as string,
                keep_list: (revised.keep_list ?? "") as string,
                add_list: (revised.add_list ?? "") as string,
                constraints: (revised.constraints ?? "") as string,
                confirmedAt: (revised.confirmed_at ?? null) as string | null,
              }
            : null,
          qaGiven: (qaGiven ?? []).map((r) => ({
            partnerNickname: nickMap.get(r.reviewee_id as string) ?? "동료",
            good: (r.good ?? "") as string,
            issue: (r.issue ?? "") as string,
            suggestion: (r.suggestion ?? "") as string,
          })),
          qaReceived: (qaReceived ?? []).map((r) => ({
            partnerNickname: nickMap.get(r.reviewer_id as string) ?? "동료",
            good: (r.good ?? "") as string,
            issue: (r.issue ?? "") as string,
            suggestion: (r.suggestion ?? "") as string,
          })),
        },
      };
    }


    if (stage === 6) {
      const [{ data: deck }, { data: queue }, { data: comments }] = await Promise.all([
        supabaseAdmin
          .from("s6_slide_decks")
          .select("title, slides, confirmed_at, updated_at")
          .eq("user_id", target.id)
          .maybeSingle(),
        supabaseAdmin
          .from("s6_presentation_queue")
          .select("state, order_index, started_at, finished_at")
          .eq("user_id", target.id)
          .maybeSingle(),
        supabaseAdmin
          .from("s6_comments")
          .select("id, commenter_id, good, question, created_at")
          .eq("presenter_id", target.id)
          .order("created_at", { ascending: false }),
      ]);
      const commenterIds = Array.from(
        new Set((comments ?? []).map((c) => c.commenter_id as string)),
      );
      const nickMap = new Map<string, string>();
      if (commenterIds.length > 0) {
        const { data: people } = await supabaseAdmin
          .from("app_users")
          .select("id, nickname")
          .in("id", commenterIds);
        for (const p of people ?? []) nickMap.set(p.id as string, (p.nickname ?? "") as string);
      }
      return {
        ok: true as const,
        nickname,
        stage: 6 as const,
        s6: {
          deck: deck
            ? {
                title: (deck.title ?? "") as string,
                slides: deck.slides ?? null,
                confirmedAt: (deck.confirmed_at ?? null) as string | null,
              }
            : null,
          queue: queue
            ? {
                state: (queue.state ?? null) as "waiting" | "current" | "done" | null,
                orderIndex: (queue.order_index ?? null) as number | null,
                startedAt: (queue.started_at ?? null) as string | null,
                finishedAt: (queue.finished_at ?? null) as string | null,
              }
            : null,
          comments: (comments ?? []).map((c) => ({
            partnerNickname: nickMap.get(c.commenter_id as string) ?? "동료",
            good: (c.good ?? "") as string,
            question: (c.question ?? "") as string,
          })),
        },
      };
    }

    return { ok: false as const, error: "지원하지 않는 스테이지입니다." };
  });
