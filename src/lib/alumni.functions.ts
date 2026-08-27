import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const uuid = z.string().uuid();

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

const SUBJECT_RULES: Array<[string, RegExp[]]> = [
  [
    "국어",
    [
      /국어|독서|글쓰기|일기|문학|소설|시화|동시|맞춤법|어휘|낱말|받아쓰기|토론|토의|발표문|글감|독후|문장 부호|띄어쓰기|한글/g,
    ],
  ],
  ["영어", [/영어|english|회화|알파벳|파닉스|영단어|단어 시험|스펠링/g]],
  [
    "수학",
    [
      /수학|분수|소수점|도형|확률|통계|함수|방정식|사칙|구구단|연산|계산 문제|측정|규칙성|그래프|넓이|부피|시계 보기/g,
    ],
  ],
  [
    "과학",
    [/과학|실험|관찰 일지|식물|동물|지구|우주|행성|전기|자석|화산|지층|날씨|물질|생물|용해|에너지/g],
  ],
  [
    "사회",
    [/사회|역사|지리|지도|경제|민주|선거|세시|풍습|문화재|고장|인구|시장 놀이|법과 규칙/g],
  ],
  ["도덕", [/도덕|인성|배려|정직|생명 존중|공감|감정 카드|마음 일기|갈등 해결/g]],
  ["체육", [/체육|줄넘기|축구|농구|피구|체력|스포츠|달리기|경기 기록|운동회/g]],
  ["음악", [/음악|리듬|가창|악기|노래|음표|합주|리코더|계이름/g]],
  ["미술", [/미술|그리기|드로잉|조소|판화|공예|색채|전시회|작품 감상|캐릭터 디자인/g]],
  [
    "정보",
    [/정보 수업|코딩|프로그래밍|알고리즘|로봇|인공지능|엔트리|스크래치|타자|디지털 시민|정보 윤리/g],
  ],
  ["실과", [/실과|요리|바느질|목공|재배|텃밭|용돈|진로 탐색/g]],
  [
    "창체·학급",
    [
      /학급|자치|창체|동아리|봉사|학급회의|학급 경영|출석|자리 배치|좌석|1인 1역|모둠 편성|칭찬|상벌|알림장|급식|청소 당번|생활기록|상담/g,
    ],
  ],
];

/**
 * 제목·PRD 전문·프롬프트 등 모든 텍스트에서 키워드 빈도를 세어 교과를 추정한다.
 * 제목 텍스트는 가중치를 크게 준다.
 */
function guessSubject(weighted: Array<[string, number]>): string {
  const scores = new Map<string, number>();
  for (const [label, regexes] of SUBJECT_RULES) {
    let score = 0;
    for (const [text, weight] of weighted) {
      const t = (text ?? "").toLowerCase();
      if (!t) continue;
      for (const re of regexes) {
        const hits = t.match(new RegExp(re.source, "g"));
        if (hits) score += hits.length * weight;
      }
    }
    if (score > 0) scores.set(label, score);
  }
  if (scores.size === 0) return "기타";
  return [...scores.entries()].sort((a, b) => b[1] - a[1])[0][0];
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
          subject: guessSubject(
            [dk?.title, prd?.problem, prd?.features, pr?.task].filter(Boolean).join(" "),
          ),
        });
      });
    }

    const subjectSet: string[] = [];
    for (const it of items) {
      if (!subjectSet.includes(it.subject)) subjectSet.push(it.subject);
    }
    subjectSet.sort((a, b) => (a === "기타" ? 1 : b === "기타" ? -1 : a.localeCompare(b, "ko")));

    return { ok: true as const, cohorts: cohortSet, subjects: subjectSet, items };
  });
