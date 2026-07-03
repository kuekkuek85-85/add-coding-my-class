import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * S2(확장 기능 떠올리기) 미니 게이트.
 *
 * PRD 원칙:
 * - 참가자는 확장 기능을 구현하기 "전에" 테스트 케이스를 2개 이상 작성해야 한다.
 * - AI 도우미는 테스트 케이스를 대신 작성하지 않는다 → 이 파일에는 AI 호출 없음.
 * - 게이트 통과(=2건 이상 작성) 전에는 S3로 이동할 수 없다.
 *
 * 저장 필드: title(무엇을), given_when(어떤 상황·입력), expected_then(무엇을 기대하는가).
 * 세 필드 모두 필수 — 셋 중 하나라도 비면 저장 불가(사용자에게 명확히 안내).
 */

const uuid = z.string().uuid();

async function getUser(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("app_users")
    .select("id, role, session_id")
    .eq("id", userId)
    .maybeSingle();
  return data;
}

export const S2_GATE_MIN = 2;

export const getMyS2State = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string }) => z.object({ userId: uuid }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const user = await getUser(data.userId);
    if (!user) return { ok: false as const, error: "세션이 만료되었습니다." };

    const { data: cases } = await supabaseAdmin
      .from("s2_test_cases")
      .select("id, title, given_when, expected_then, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    const list = cases ?? [];
    return {
      ok: true as const,
      cases: list,
      passed: list.length >= S2_GATE_MIN,
      min: S2_GATE_MIN,
    };
  });

const nonEmpty = (label: string) =>
  z
    .string()
    .transform((s) => s.trim())
    .pipe(z.string().min(1, `${label}을(를) 입력하세요`).max(400, `${label}은(는) 400자 이내`));

export const addS2TestCase = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { userId: string; title: string; givenWhen: string; expectedThen: string }) =>
      z
        .object({
          userId: uuid,
          title: nonEmpty("제목"),
          givenWhen: nonEmpty("상황(Given/When)"),
          expectedThen: nonEmpty("기대(Expected/Then)"),
        })
        .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const user = await getUser(data.userId);
    if (!user) return { ok: false as const, error: "세션이 만료되었습니다." };
    if (user.role !== "participant") {
      return { ok: false as const, error: "참가자만 작성할 수 있습니다." };
    }

    const { error } = await supabaseAdmin.from("s2_test_cases").insert({
      user_id: user.id,
      session_id: user.session_id,
      title: data.title,
      given_when: data.givenWhen,
      expected_then: data.expectedThen,
    });
    if (error) return { ok: false as const, error: "저장에 실패했습니다." };
    return { ok: true as const };
  });

export const deleteS2TestCase = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string; caseId: string }) =>
    z.object({ userId: uuid, caseId: uuid }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const user = await getUser(data.userId);
    if (!user) return { ok: false as const, error: "세션이 만료되었습니다." };

    const { error } = await supabaseAdmin
      .from("s2_test_cases")
      .delete()
      .eq("id", data.caseId)
      .eq("user_id", user.id);
    if (error) return { ok: false as const, error: "삭제에 실패했습니다." };
    return { ok: true as const };
  });

/**
 * 강사용 요약: 세션 내 각 참가자의 S2 테스트 케이스 작성 수와 게이트 통과 여부.
 */
export const getInstructorS2Summary = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string }) => z.object({ userId: uuid }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const caller = await getUser(data.userId);
    if (!caller) return { ok: false as const, error: "세션이 만료되었습니다." };
    if (caller.role !== "instructor") {
      return { ok: false as const, error: "강사만 조회할 수 있습니다." };
    }

    const { data: members } = await supabaseAdmin
      .from("app_users")
      .select("id")
      .eq("session_id", caller.session_id)
      .eq("role", "participant");
    const userIds = (members ?? []).map((m) => m.id);

    const { data: cases } = userIds.length
      ? await supabaseAdmin
          .from("s2_test_cases")
          .select("user_id")
          .in("user_id", userIds)
      : { data: [] as { user_id: string }[] };

    const countByUser = new Map<string, number>();
    for (const row of cases ?? []) {
      countByUser.set(row.user_id, (countByUser.get(row.user_id) ?? 0) + 1);
    }

    return {
      ok: true as const,
      min: S2_GATE_MIN,
      progress: (members ?? []).map((m) => ({
        userId: m.id,
        cases: countByUser.get(m.id) ?? 0,
        passed: (countByUser.get(m.id) ?? 0) >= S2_GATE_MIN,
      })),
    };
  });
