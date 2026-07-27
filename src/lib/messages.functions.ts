import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * 메시지 — 참가자↔강사 1:1 DM 및 강사의 전체 공지.
 * 참가자는 강사에게만 direct 발송. 강사는 direct 답장 또는 broadcast(전체 공지) 가능.
 * RLS는 deny_all이며 모든 접근은 서버 함수의 supabaseAdmin 을 통해서만.
 */

const uuid = z.string().uuid();
const categorySchema = z.enum([
  "suggestion",
  "bug",
  "question",
  "meal",
  "presentation",
  "general",
]);

async function getUser(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("app_users")
    .select("id, role, session_id, nickname")
    .eq("id", userId)
    .maybeSingle();
  return data;
}

async function getInstructor(sessionId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("app_users")
    .select("id, nickname")
    .eq("session_id", sessionId)
    .eq("role", "instructor")
    .maybeSingle();
  return data;
}

export const sendMessage = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      userId: string;
      body: string;
      category?: string;
      kind?: "direct" | "broadcast";
      recipientId?: string | null;
    }) =>
      z
        .object({
          userId: uuid,
          body: z.string().trim().min(1).max(4000),
          category: categorySchema.optional().default("general"),
          kind: z.enum(["direct", "broadcast"]).optional().default("direct"),
          recipientId: uuid.nullable().optional(),
        })
        .parse(input),

  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sender = await getUser(data.userId);
    if (!sender) return { ok: false as const, error: "세션이 만료되었습니다." };

    let recipientId: string | null = null;
    let kind: "direct" | "broadcast" = data.kind ?? "direct";

    if (sender.role === "participant") {
      // 참가자는 강사에게 direct 만 가능
      const instructor = await getInstructor(sender.session_id);
      if (!instructor) return { ok: false as const, error: "강사가 접속하지 않았습니다." };
      recipientId = instructor.id;
      kind = "direct";
    } else {
      // 강사: broadcast 또는 direct(수신자 명시)
      if (kind === "broadcast") {
        recipientId = null;
      } else {
        if (!data.recipientId) return { ok: false as const, error: "수신자가 필요합니다." };
        recipientId = data.recipientId;
      }
    }

    const { data: row, error } = await supabaseAdmin
      .from("messages")
      .insert({
        session_id: sender.session_id,
        sender_id: sender.id,
        sender_role: sender.role,
        recipient_id: recipientId,
        kind,
        category: data.category ?? "general",
        body: data.body,
      })
      .select("id, created_at")
      .maybeSingle();

    if (error || !row) return { ok: false as const, error: "메시지 전송에 실패했습니다." };
    return { ok: true as const, id: row.id, createdAt: row.created_at };
  });

/** 참가자용: 나와 강사 사이의 direct + 세션 broadcast 시간순 */
export const listMyMessages = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string }) => z.object({ userId: uuid }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const user = await getUser(data.userId);
    if (!user) return { ok: false as const, error: "세션이 만료되었습니다." };

    const { data: rows } = await supabaseAdmin
      .from("messages")
      .select("id, sender_id, sender_role, recipient_id, kind, category, body, created_at")
      .eq("session_id", user.session_id)
      .or(`kind.eq.broadcast,sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order("created_at", { ascending: true })
      .limit(200);

    return { ok: true as const, messages: rows ?? [] };
  });

/** 강사용: 세션 내 모든 참가자 스레드 + 브로드캐스트 */
export const listInstructorInbox = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string }) => z.object({ userId: uuid }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const caller = await getUser(data.userId);
    if (!caller) return { ok: false as const, error: "세션이 만료되었습니다." };
    if (caller.role !== "instructor") {
      return { ok: false as const, error: "강사만 조회할 수 있습니다." };
    }

    const [{ data: members }, { data: messages }] = await Promise.all([
      supabaseAdmin
        .from("app_users")
        .select("id, nickname, avatar")
        .eq("session_id", caller.session_id)
        .eq("role", "participant")
        .order("nickname"),
      supabaseAdmin
        .from("messages")
        .select("id, sender_id, sender_role, recipient_id, kind, category, body, created_at")
        .eq("session_id", caller.session_id)
        .order("created_at", { ascending: true })
        .limit(500),
    ]);

    return {
      ok: true as const,
      instructorId: caller.id,
      members: members ?? [],
      messages: messages ?? [],
    };
  });

/** 헤더 티커용: 세션의 최근 전체 공지(broadcast) 목록 */
export const listSessionBroadcasts = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string }) => z.object({ userId: uuid }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const user = await getUser(data.userId);
    if (!user) return { ok: false as const, error: "세션이 만료되었습니다.", messages: [] };
    const { data: rows } = await supabaseAdmin
      .from("messages")
      .select("id, body, created_at")
      .eq("session_id", user.session_id)
      .eq("kind", "broadcast")
      .order("created_at", { ascending: false })
      .limit(30);
    return { ok: true as const, messages: rows ?? [] };
  });

/** 안읽음 마킹 */
export const markMessagesRead = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { userId: string; messageIds: string[] }) =>
      z
        .object({
          userId: uuid,
          messageIds: z.array(uuid).max(500),
        })
        .parse(input),
  )
  .handler(async ({ data }) => {
    if (data.messageIds.length === 0) return { ok: true as const };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const user = await getUser(data.userId);
    if (!user) return { ok: false as const, error: "세션이 만료되었습니다." };

    const rows = data.messageIds.map((id) => ({
      message_id: id,
      user_id: user.id,
      read_at: new Date().toISOString(),
    }));
    await supabaseAdmin
      .from("message_reads")
      .upsert(rows, { onConflict: "message_id,user_id" });
    return { ok: true as const };
  });

/** 내가 아직 안 읽은 메시지 ID 목록 (참가자/강사 공통) */
export const getUnreadMessageIds = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string }) => z.object({ userId: uuid }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const user = await getUser(data.userId);
    if (!user) return { ok: false as const, error: "세션이 만료되었습니다.", unread: [] };

    // 나와 관련된 최근 메시지들
    let query = supabaseAdmin
      .from("messages")
      .select("id, sender_id")
      .eq("session_id", user.session_id)
      .order("created_at", { ascending: false })
      .limit(200);
    if (user.role === "participant") {
      query = query.or(`kind.eq.broadcast,recipient_id.eq.${user.id}`);
    } else {
      // 강사: 참가자가 보낸 것 + 자기 자신이 아닌 발신자
      query = query.eq("sender_role", "participant");
    }
    const { data: rows } = await query;
    const candidates = (rows ?? []).filter((r) => r.sender_id !== user.id).map((r) => r.id);
    if (candidates.length === 0) return { ok: true as const, unread: [] as string[] };

    const { data: reads } = await supabaseAdmin
      .from("message_reads")
      .select("message_id")
      .eq("user_id", user.id)
      .in("message_id", candidates);
    const readSet = new Set((reads ?? []).map((r) => r.message_id));
    const unread = candidates.filter((id) => !readSet.has(id));
    return { ok: true as const, unread };
  });

/** 이미지 업로드 — base64 dataURL 을 받아 스토리지에 저장하고 1년 짜리 signed URL 을 돌려줍니다. */
export const uploadMessageImage = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { userId: string; dataUrl: string; filename?: string }) =>
      z
        .object({
          userId: uuid,
          // 최대 ~4MB (base64 오버헤드 포함)
          dataUrl: z
            .string()
            .regex(/^data:image\/(png|jpe?g|gif|webp);base64,/i, "지원하지 않는 이미지 형식입니다.")
            .max(6_000_000, "이미지가 너무 큽니다 (최대 4MB)."),
          filename: z.string().max(120).optional(),
        })
        .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const user = await getUser(data.userId);
    if (!user) return { ok: false as const, error: "세션이 만료되었습니다." };

    const match = /^data:(image\/[a-zA-Z+]+);base64,(.+)$/.exec(data.dataUrl);
    if (!match) return { ok: false as const, error: "이미지 파싱에 실패했습니다." };
    const contentType = match[1];
    const ext = contentType.split("/")[1].replace("jpeg", "jpg");
    const bytes = Buffer.from(match[2], "base64");
    if (bytes.byteLength > 4 * 1024 * 1024) {
      return { ok: false as const, error: "이미지가 너무 큽니다 (최대 4MB)." };
    }
    const path = `${user.session_id}/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error: upErr } = await supabaseAdmin.storage
      .from("message-images")
      .upload(path, bytes, { contentType, upsert: false });
    if (upErr) return { ok: false as const, error: `업로드 실패: ${upErr.message}` };

    // 1년 signed URL (연수 일정 기준 충분)
    const { data: signed, error: signErr } = await supabaseAdmin.storage
      .from("message-images")
      .createSignedUrl(path, 60 * 60 * 24 * 365);
    if (signErr || !signed) return { ok: false as const, error: "URL 발급 실패" };

    return { ok: true as const, url: signed.signedUrl, path };
  });

