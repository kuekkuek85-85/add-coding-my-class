import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const uuid = z.string().uuid();

/** '7기 · 장평중 …' → '7기' */
function cohortLabel(name: string): string {
  const trimmed = (name ?? "").trim();
  const m = trimmed.match(/^\s*([^·|\-—]+)/);
  const head = (m ? m[1] : trimmed).trim();
  return head.length > 0 ? head : "기수";
}

function alphaLabel(index: number): string {
  // 0 -> A, 25 -> Z, 26 -> AA
  let n = index;
  let out = "";
  do {
    out = String.fromCharCode(65 + (n % 26)) + out;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return out;
}

function firstMeaningfulLine(text: string): string {
  return (
    (text ?? "")
      .trim()
      .split(/\n+/)
      .find((l) => l.trim() && !l.trim().startsWith("#")) ?? ""
  ).trim();
}

/**
 * 다른 기수(선배)의 산출물을 익명화해서 반환한다.
 * 원본 닉네임은 절대 클라이언트로 보내지 않는다. 읽기 전용.
 */
export const getAlumniGallery = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string }) => z.object({ userId: uuid }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: caller } = await supabaseAdmin
      .from("app_users")
      .select("id, session_id")
      .eq("id", data.userId)
      .maybeSingle();
    if (!caller) return { ok: false as const, error: "세션이 만료되었습니다." };

    const { data: sessions } = await supabaseAdmin
      .from("sessions")
      .select("id, name, created_at")
      .neq("id", caller.session_id)
      .order("created_at", { ascending: true });

    const otherSessions = sessions ?? [];
    if (otherSessions.length === 0) return { ok: true as const, cohorts: [], items: [] };

    const sessionIds = otherSessions.map((s) => s.id);

    const { data: members } = await supabaseAdmin
      .from("app_users")
      .select("id, nickname, session_id, deployed_url")
      .in("session_id", sessionIds)
      .eq("role", "participant")
      .order("nickname", { ascending: true });

    const memberRows = members ?? [];
    if (memberRows.length === 0) return { ok: true as const, cohorts: [], items: [] };
    const memberIds = memberRows.map((m) => m.id);

    const [{ data: prds }, { data: prompts }, { data: revised }, { data: decks }] =
      await Promise.all([
        supabaseAdmin
          .from("s3_prd_drafts")
          .select("user_id, problem, users, features, nonfunctional, success_metric, out_of_scope")
          .in("user_id", memberIds),
        supabaseAdmin
          .from("s4_prompts")
          .select("user_id, role, context, task, confirmed_at")
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

    const items: Array<{
      key: string;
      cohort: string;
      displayName: string;
      title: string;
      problem: string;
      prd: {
        problem: string;
        users: string;
        features: string;
        nonfunctional: string;
        success_metric: string;
        out_of_scope: string;
      } | null;
      firstPrompt: string;
      revisedPrompt: string;
      deployedUrl: string | null;
    }> = [];

    const cohortSet: string[] = [];

    for (const sess of otherSessions) {
      const label = cohortLabel(sess.name);
      const inSession = memberRows
        .filter((m) => m.session_id === sess.id)
        .sort((a, b) => (a.nickname ?? "").localeCompare(b.nickname ?? "", "ko"));
      if (inSession.length === 0) continue;
      if (!cohortSet.includes(label)) cohortSet.push(label);

      inSession.forEach((m, i) => {
        const prd = prdMap.get(m.id);
        const pr = promptMap.get(m.id);
        const rv = revisedMap.get(m.id);
        const dk = deckMap.get(m.id);
        const problem = (prd?.problem ?? "").trim();
        // 산출물이 아예 없는 참가자는 갤러리에서 제외
        if (!problem && !dk?.title && !(pr?.context ?? "").trim()) return;

        items.push({
          key: `${sess.id}:${i}`,
          cohort: label,
          displayName: `${label}-${alphaLabel(i)}`,
          title: (dk?.title ?? "").slice(0, 120),
          problem: problem.slice(0, 400),
          prd: prd
            ? {
                problem: (prd.problem ?? "").slice(0, 2000),
                users: (prd.users ?? "").slice(0, 2000),
                features: (prd.features ?? "").slice(0, 4000),
                nonfunctional: (prd.nonfunctional ?? "").slice(0, 2000),
                success_metric: (prd.success_metric ?? "").slice(0, 2000),
                out_of_scope: (prd.out_of_scope ?? "").slice(0, 2000),
              }
            : null,
          firstPrompt: ((pr?.context ?? "").trim() || firstMeaningfulLine(pr?.task ?? "")).slice(
            0,
            8000,
          ),
          revisedPrompt: [rv?.target, rv?.add_list].filter(Boolean).join("\n\n").slice(0, 4000),
          deployedUrl: (m.deployed_url ?? "").trim() || null,
        });
      });
    }

    return { ok: true as const, cohorts: cohortSet, items };
  });
