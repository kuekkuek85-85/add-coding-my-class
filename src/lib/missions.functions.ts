import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * 도움 미션 — 막힌 참가자의 상황을 미션 카드로 구조화, 동료 헬퍼들이 참여·해결 제출.
 * RLS deny_all + 서버 함수 경유.
 */

const uuid = z.string().uuid();

const attachmentSchema = z.object({
  type: z.enum(["image", "link"]),
  url: z.string().url(),
  caption: z.string().max(200).optional().nullable(),
});

async function getUser(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("app_users")
    .select("id, role, session_id, nickname, avatar")
    .eq("id", userId)
    .maybeSingle();
  return data;
}

/** AI 로 원문 + 첨부를 미션 카드로 구조화. 학생이 최종 확인·편집. */
export const structureMissionDraft = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      userId: string;
      rawText: string;
      attachments?: Array<{ type: "image" | "link"; url: string; caption?: string | null }>;
    }) =>
      z
        .object({
          userId: uuid,
          rawText: z.string().trim().min(1).max(4000),
          attachments: z.array(attachmentSchema).max(10).optional().default([]),
        })
        .parse(input),
  )
  .handler(async ({ data }) => {
    const user = await getUser(data.userId);
    if (!user) return { ok: false as const, error: "세션이 만료되었습니다." };

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) return { ok: false as const, error: "AI 키가 설정되지 않았습니다." };

    const attachSummary =
      data.attachments && data.attachments.length > 0
        ? "\n\n첨부:\n" +
          data.attachments
            .map((a, i) => `  ${i + 1}. [${a.type}] ${a.url}${a.caption ? ` — ${a.caption}` : ""}`)
            .join("\n")
        : "";

    const systemPrompt = `당신은 교사 연수의 동료 학습을 돕는 도우미입니다. 학생이 막힌 상황(오류·질문)을 자유롭게 서술하면, 이를 동료가 한눈에 이해할 수 있는 "도움 미션 카드"로 구조화하세요.

규칙:
- 학생 대신 해결책을 쓰지 말 것. 오직 상황을 정리·요약할 뿐.
- 한국어로 간결하게.
- title: 12~30자, 문제의 핵심.
- summary: 2~4문장으로 상황 요약.
- reproSteps: 재현 단계 또는 확인 포인트. 없으면 빈 문자열.
- tags: 관련 기술/개념 태그 2~5개 (예: "배포", "Supabase RLS", "TypeScript 타입", "라우팅").
반드시 JSON 만 반환. 다른 텍스트 금지.`;

    const userPrompt = `다음 학생의 상황을 카드로 정리해 주세요.

원문:
${data.rawText}${attachSummary}

JSON 스키마:
{"title": string, "summary": string, "reproSteps": string, "tags": string[]}`;

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Lovable-API-Key": apiKey,
        },
        body: JSON.stringify({
          model: "google/gemini-3.6-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          response_format: { type: "json_object" },
        }),
      });
      if (!res.ok) {
        const txt = await res.text();
        if (res.status === 429) return { ok: false as const, error: "AI 요청이 많습니다. 잠시 후 다시 시도해주세요." };
        if (res.status === 402) return { ok: false as const, error: "AI 크레딧이 소진되었습니다." };
        return { ok: false as const, error: `AI 오류: ${txt.slice(0, 200)}` };
      }
      const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const content = json.choices?.[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(content) as {
        title?: string;
        summary?: string;
        reproSteps?: string;
        tags?: string[];
      };
      return {
        ok: true as const,
        draft: {
          title: (parsed.title ?? "").toString().slice(0, 80),
          summary: (parsed.summary ?? "").toString().slice(0, 800),
          reproSteps: (parsed.reproSteps ?? "").toString().slice(0, 800),
          tags: Array.isArray(parsed.tags)
            ? parsed.tags.slice(0, 6).map((t) => String(t).slice(0, 30))
            : [],
        },
      };
    } catch (e) {
      return {
        ok: false as const,
        error: e instanceof Error ? e.message : "AI 정리에 실패했습니다.",
      };
    }
  });

export const createMission = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      userId: string;
      title: string;
      summary: string;
      reproSteps?: string;
      tags?: string[];
      rawDescription?: string;
      attachments?: Array<{ type: "image" | "link"; url: string; caption?: string | null }>;
    }) =>
      z
        .object({
          userId: uuid,
          title: z.string().trim().min(1).max(120),
          summary: z.string().trim().min(1).max(1000),
          reproSteps: z.string().max(1000).optional().default(""),
          tags: z.array(z.string().max(30)).max(8).optional().default([]),
          rawDescription: z.string().max(4000).optional().default(""),
          attachments: z.array(attachmentSchema).max(10).optional().default([]),
        })
        .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const user = await getUser(data.userId);
    if (!user) return { ok: false as const, error: "세션이 만료되었습니다." };

    const { data: row, error } = await supabaseAdmin
      .from("help_missions")
      .insert({
        session_id: user.session_id,
        requester_id: user.id,
        requester_role: user.role,
        title: data.title,
        summary: data.summary,
        repro_steps: data.reproSteps ?? "",
        tags: data.tags ?? [],
        raw_description: data.rawDescription ?? "",
        attachments: data.attachments ?? [],
        status: "open",
      })
      .select("id")
      .maybeSingle();
    if (error || !row) return { ok: false as const, error: "미션 등록에 실패했습니다." };
    return { ok: true as const, id: row.id };
  });

export const listMissions = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { userId: string; status?: string }) =>
      z
        .object({
          userId: uuid,
          status: z.enum(["open", "in_progress", "resolved", "cancelled", "all"]).optional().default("all"),
        })
        .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const user = await getUser(data.userId);
    if (!user) return { ok: false as const, error: "세션이 만료되었습니다.", missions: [] };

    let q = supabaseAdmin
      .from("help_missions")
      .select("id, requester_id, requester_role, title, summary, tags, status, resolved_helper_id, created_at, updated_at, resolved_at")
      .eq("session_id", user.session_id)
      .order("updated_at", { ascending: false })
      .limit(200);
    if (data.status && data.status !== "all") q = q.eq("status", data.status);

    const { data: missions } = await q;
    if (!missions || missions.length === 0) {
      return { ok: true as const, missions: [] as MissionListItem[] };
    }

    const ids = missions.map((m) => m.id);
    const requesterIds = Array.from(new Set(missions.map((m) => m.requester_id)));

    const [{ data: helpers }, { data: users }] = await Promise.all([
      supabaseAdmin
        .from("help_mission_helpers")
        .select("mission_id, helper_id, state")
        .in("mission_id", ids),
      supabaseAdmin
        .from("app_users")
        .select("id, nickname")
        .in("id", requesterIds),
    ]);
    const nickBy = new Map((users ?? []).map((u) => [u.id, u.nickname]));
    const helpersBy = new Map<string, { joined: number; submitted: number }>();
    for (const h of helpers ?? []) {
      const cur = helpersBy.get(h.mission_id) ?? { joined: 0, submitted: 0 };
      cur.joined += 1;
      if (h.state === "submitted" || h.state === "accepted") cur.submitted += 1;
      helpersBy.set(h.mission_id, cur);
    }

    const items: MissionListItem[] = missions.map((m) => ({
      id: m.id,
      requesterId: m.requester_id,
      requesterNickname: nickBy.get(m.requester_id) ?? "?",
      requesterRole: m.requester_role as "participant" | "instructor",
      title: m.title,
      summary: m.summary,
      tags: (m.tags as string[]) ?? [],
      status: m.status as MissionStatus,
      resolvedHelperId: m.resolved_helper_id,
      createdAt: m.created_at,
      updatedAt: m.updated_at,
      resolvedAt: m.resolved_at,
      helperCount: helpersBy.get(m.id)?.joined ?? 0,
      submittedCount: helpersBy.get(m.id)?.submitted ?? 0,
    }));

    return { ok: true as const, missions: items };
  });

export type MissionStatus = "open" | "in_progress" | "resolved" | "cancelled";
export type MissionListItem = {
  id: string;
  requesterId: string;
  requesterNickname: string;
  requesterRole: "participant" | "instructor";
  title: string;
  summary: string;
  tags: string[];
  status: MissionStatus;
  resolvedHelperId: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  helperCount: number;
  submittedCount: number;
};

export const getMission = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { userId: string; missionId: string }) =>
      z.object({ userId: uuid, missionId: uuid }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const user = await getUser(data.userId);
    if (!user) return { ok: false as const, error: "세션이 만료되었습니다." };

    const { data: m } = await supabaseAdmin
      .from("help_missions")
      .select("*")
      .eq("id", data.missionId)
      .maybeSingle();
    if (!m || m.session_id !== user.session_id) {
      return { ok: false as const, error: "미션을 찾을 수 없습니다." };
    }

    const [{ data: helpers }, { data: comments }, { data: allUsers }] = await Promise.all([
      supabaseAdmin
        .from("help_mission_helpers")
        .select("helper_id, state, submission_text, submission_attachments, joined_at, submitted_at")
        .eq("mission_id", m.id)
        .order("joined_at"),
      supabaseAdmin
        .from("help_mission_comments")
        .select("id, author_id, author_role, body, created_at")
        .eq("mission_id", m.id)
        .order("created_at"),
      supabaseAdmin
        .from("app_users")
        .select("id, nickname, role")
        .eq("session_id", user.session_id),
    ]);

    const nickBy = new Map((allUsers ?? []).map((u) => [u.id, u.nickname]));

    return {
      ok: true as const,
      me: { id: user.id, role: user.role, nickname: user.nickname },
      mission: {
        id: m.id,
        requesterId: m.requester_id,
        requesterNickname: nickBy.get(m.requester_id) ?? "?",
        requesterRole: m.requester_role as "participant" | "instructor",
        title: m.title,
        summary: m.summary,
        reproSteps: m.repro_steps,
        tags: (m.tags as string[]) ?? [],
        rawDescription: m.raw_description,
        attachments: (m.attachments as Array<{ type: "image" | "link"; url: string; caption?: string | null }>) ?? [],
        status: m.status as MissionStatus,
        resolvedHelperId: m.resolved_helper_id,
        createdAt: m.created_at,
        updatedAt: m.updated_at,
        resolvedAt: m.resolved_at,
      },
      helpers: (helpers ?? []).map((h) => ({
        helperId: h.helper_id,
        nickname: nickBy.get(h.helper_id) ?? "?",
        state: h.state as "joined" | "submitted" | "accepted",
        submissionText: h.submission_text ?? "",
        submissionAttachments:
          (h.submission_attachments as Array<{ type: "image" | "link"; url: string; caption?: string | null }>) ?? [],
        joinedAt: h.joined_at,
        submittedAt: h.submitted_at,
      })),
      comments: (comments ?? []).map((c) => ({
        id: c.id,
        authorId: c.author_id,
        authorNickname: nickBy.get(c.author_id) ?? "?",
        authorRole: c.author_role as "participant" | "instructor",
        body: c.body,
        createdAt: c.created_at,
      })),
    };
  });

export const joinMission = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { userId: string; missionId: string }) =>
      z.object({ userId: uuid, missionId: uuid }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const user = await getUser(data.userId);
    if (!user) return { ok: false as const, error: "세션이 만료되었습니다." };

    const { data: m } = await supabaseAdmin
      .from("help_missions")
      .select("id, session_id, requester_id, status")
      .eq("id", data.missionId)
      .maybeSingle();
    if (!m || m.session_id !== user.session_id) return { ok: false as const, error: "미션을 찾을 수 없습니다." };
    if (m.requester_id === user.id) return { ok: false as const, error: "본인 미션에는 참여할 수 없습니다." };
    if (m.status === "resolved" || m.status === "cancelled") {
      return { ok: false as const, error: "이미 종료된 미션입니다." };
    }

    const { error } = await supabaseAdmin
      .from("help_mission_helpers")
      .upsert(
        { mission_id: m.id, helper_id: user.id, state: "joined" },
        { onConflict: "mission_id,helper_id", ignoreDuplicates: true },
      );
    if (error) return { ok: false as const, error: "참여에 실패했습니다." };

    if (m.status === "open") {
      await supabaseAdmin
        .from("help_missions")
        .update({ status: "in_progress", updated_at: new Date().toISOString() })
        .eq("id", m.id);
    } else {
      await supabaseAdmin
        .from("help_missions")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", m.id);
    }
    return { ok: true as const };
  });

export const submitSolution = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      userId: string;
      missionId: string;
      text: string;
      attachments?: Array<{ type: "image" | "link"; url: string; caption?: string | null }>;
    }) =>
      z
        .object({
          userId: uuid,
          missionId: uuid,
          text: z.string().trim().min(1).max(2000),
          attachments: z.array(attachmentSchema).max(10).optional().default([]),
        })
        .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const user = await getUser(data.userId);
    if (!user) return { ok: false as const, error: "세션이 만료되었습니다." };

    const { data: m } = await supabaseAdmin
      .from("help_missions")
      .select("id, session_id, status")
      .eq("id", data.missionId)
      .maybeSingle();
    if (!m || m.session_id !== user.session_id) return { ok: false as const, error: "미션을 찾을 수 없습니다." };
    if (m.status === "resolved" || m.status === "cancelled") {
      return { ok: false as const, error: "이미 종료된 미션입니다." };
    }

    const { error } = await supabaseAdmin
      .from("help_mission_helpers")
      .upsert(
        {
          mission_id: m.id,
          helper_id: user.id,
          state: "submitted",
          submission_text: data.text,
          submission_attachments: data.attachments ?? [],
          submitted_at: new Date().toISOString(),
        },
        { onConflict: "mission_id,helper_id" },
      );
    if (error) return { ok: false as const, error: "제출에 실패했습니다." };

    await supabaseAdmin
      .from("help_missions")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", m.id);
    return { ok: true as const };
  });

export const acceptSolution = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { userId: string; missionId: string; helperId: string }) =>
      z.object({ userId: uuid, missionId: uuid, helperId: uuid }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const user = await getUser(data.userId);
    if (!user) return { ok: false as const, error: "세션이 만료되었습니다." };

    const { data: m } = await supabaseAdmin
      .from("help_missions")
      .select("id, requester_id, session_id, status")
      .eq("id", data.missionId)
      .maybeSingle();
    if (!m || m.session_id !== user.session_id) return { ok: false as const, error: "미션을 찾을 수 없습니다." };
    if (m.requester_id !== user.id && user.role !== "instructor") {
      return { ok: false as const, error: "의뢰자만 채택할 수 있습니다." };
    }

    const now = new Date().toISOString();
    await supabaseAdmin
      .from("help_mission_helpers")
      .update({ state: "accepted" })
      .eq("mission_id", m.id)
      .eq("helper_id", data.helperId);

    await supabaseAdmin
      .from("help_missions")
      .update({
        status: "resolved",
        resolved_helper_id: data.helperId,
        resolved_at: now,
        updated_at: now,
      })
      .eq("id", m.id);
    return { ok: true as const };
  });

export const cancelMission = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { userId: string; missionId: string }) =>
      z.object({ userId: uuid, missionId: uuid }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const user = await getUser(data.userId);
    if (!user) return { ok: false as const, error: "세션이 만료되었습니다." };

    const { data: m } = await supabaseAdmin
      .from("help_missions")
      .select("id, requester_id, session_id")
      .eq("id", data.missionId)
      .maybeSingle();
    if (!m || m.session_id !== user.session_id) return { ok: false as const, error: "미션을 찾을 수 없습니다." };
    if (m.requester_id !== user.id && user.role !== "instructor") {
      return { ok: false as const, error: "의뢰자 또는 강사만 종료할 수 있습니다." };
    }

    const now = new Date().toISOString();
    await supabaseAdmin
      .from("help_missions")
      .update({ status: "cancelled", updated_at: now, resolved_at: now })
      .eq("id", m.id);
    return { ok: true as const };
  });

export const addMissionComment = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { userId: string; missionId: string; body: string }) =>
      z
        .object({
          userId: uuid,
          missionId: uuid,
          body: z.string().trim().min(1).max(1000),
        })
        .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const user = await getUser(data.userId);
    if (!user) return { ok: false as const, error: "세션이 만료되었습니다." };

    const { data: m } = await supabaseAdmin
      .from("help_missions")
      .select("id, session_id")
      .eq("id", data.missionId)
      .maybeSingle();
    if (!m || m.session_id !== user.session_id) return { ok: false as const, error: "미션을 찾을 수 없습니다." };

    const { error } = await supabaseAdmin.from("help_mission_comments").insert({
      mission_id: m.id,
      author_id: user.id,
      author_role: user.role,
      body: data.body,
    });
    if (error) return { ok: false as const, error: "코멘트 저장 실패" };

    await supabaseAdmin
      .from("help_missions")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", m.id);
    return { ok: true as const };
  });

export const getInstructorMissionsOverview = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string }) => z.object({ userId: uuid }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const caller = await getUser(data.userId);
    if (!caller) return { ok: false as const, error: "세션이 만료되었습니다." };
    if (caller.role !== "instructor") return { ok: false as const, error: "강사 전용" };

    const { data: rows } = await supabaseAdmin
      .from("help_missions")
      .select("id, requester_id, title, status, updated_at")
      .eq("session_id", caller.session_id)
      .order("updated_at", { ascending: false })
      .limit(20);
    const list = rows ?? [];
    const counts = {
      open: list.filter((m) => m.status === "open").length,
      inProgress: list.filter((m) => m.status === "in_progress").length,
      resolved: list.filter((m) => m.status === "resolved").length,
      cancelled: list.filter((m) => m.status === "cancelled").length,
    };
    // 참가자 닉네임 매핑
    const rids = Array.from(new Set(list.map((m) => m.requester_id)));
    const { data: users } = rids.length
      ? await supabaseAdmin.from("app_users").select("id, nickname").in("id", rids)
      : { data: [] as Array<{ id: string; nickname: string }> };
    const nickBy = new Map((users ?? []).map((u) => [u.id, u.nickname]));

    return {
      ok: true as const,
      counts,
      recent: list.slice(0, 8).map((m) => ({
        id: m.id,
        title: m.title,
        status: m.status as MissionStatus,
        updatedAt: m.updated_at,
        requesterNickname: nickBy.get(m.requester_id) ?? "?",
      })),
    };
  });
