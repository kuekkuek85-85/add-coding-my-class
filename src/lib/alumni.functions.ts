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

/** 제목·문제·기능 텍스트에서 교과를 키워드로 추정한다. */
function guessSubject(text: string): string {
  const t = (text ?? "").toLowerCase();
  const rules: Array<[string, RegExp]> = [
    ["국어", /국어|독서|글쓰기|문학|시\b|소설|맞춤법|어휘|토론|토의/],
    ["영어", /영어|english|회화|알파벳|파닉스/],
    ["수학", /수학|분수|소수|도형|확률|통계|함수|방정식|계산|측정|규칙성/],
    ["과학", /과학|실험|관찰|식물|동물|지구|우주|전기|자석|화산|날씨|물질|생물/],
    ["사회", /사회|역사|지리|지도|경제|민주|세시|풍습|문화재|고장/],
    ["도덕", /도덕|인성|배려|규칙|약속|정직|생명/],
    ["체육", /체육|운동|줄넘기|축구|농구|피구|체력|스포츠|달리기/],
    ["음악", /음악|리듬|가창|악기|노래|음표|합주/],
    ["미술", /미술|그림|디자인|조소|판화|만들기|공예|색채/],
    ["정보", /정보|코딩|프로그래밍|알고리즘|로봇|ai\b|인공지능|엔트리|스크래치/],
    ["실과", /실과|요리|바느질|목공|재배|텃밭|실생활/],
    ["창체·학급", /학급|자치|창체|동아리|봉사|진로|학급회의|학급 경영|출석|자리 배치|좌석/],
  ];
  for (const [label, re] of rules) if (re.test(t)) return label;
  return "기타";
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
      subject: string;
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
