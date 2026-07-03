import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Copy, Save, Lock, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { getMyS4State, saveMyS4Prompt } from "@/lib/s4.functions";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MAX_LEN = 8000;

type Prd = {
  problem: string;
  users: string;
  features: string;
  nonfunctional: string;
  success_metric: string;
  out_of_scope: string;
};

type CaseLike = { title: string; given: string; when_step: string; then_step: string };
type S2CaseLike = { title: string; given_when: string; expected_then: string };

const SEED_MARKER = "# 통과해야 할 테스트 케이스";

function buildDraftText(prd: Prd | null, s4Cases: CaseLike[], s2Cases: S2CaseLike[]): string {
  const s4Lines = s4Cases
    .filter((c) => c.title.trim() && c.given.trim() && c.when_step.trim() && c.then_step.trim())
    .map(
      (c, i) =>
        `${i + 1}. ${c.title}\n   - 주어진: ${c.given}\n   - 할 때: ${c.when_step}\n   - 그러면: ${c.then_step}`,
    );
  const s2Lines = s2Cases
    .filter((c) => c.title.trim() && c.given_when.trim() && c.expected_then.trim())
    .map(
      (c, i) =>
        `${s4Lines.length + i + 1}. [2교시] ${c.title}\n   - 상황/입력: ${c.given_when}\n   - 기대 출력: ${c.expected_then}`,
    );
  const casesText = [...s4Lines, ...s2Lines].join("\n");

  const sections = prd
    ? [
        `# 문제\n${prd.problem}`,
        `# 사용자\n${prd.users}`,
        `# 핵심 기능\n${prd.features}`,
        `# 비기능\n${prd.nonfunctional}`,
        `# 성공 지표\n${prd.success_metric}`,
        `# 범위 밖\n${prd.out_of_scope}`,
      ]
    : ["# 초안 PRD\n(3교시에서 PRD 2차 제출을 확정하면 여기에 초안이 채워집니다.)"];

  sections.push(
    `${SEED_MARKER}\n${casesText || "(테스트 케이스 없음 — 앞 탭에서 추가하세요.)"}`,
  );
  return sections.join("\n\n");
}

export function FirstPromptBuilder({
  userId,
  onConfirmClick,
  confirmDisabled,
  confirmLabel,
  confirmBusy,
}: {
  userId: string;
  onConfirmClick: () => void;
  confirmDisabled: boolean;
  confirmLabel: string;
  confirmBusy: boolean;
}) {
  const qc = useQueryClient();
  const fetchState = useServerFn(getMyS4State);
  const save = useServerFn(saveMyS4Prompt);
  const stateKey = ["s4-state", userId];

  const { data } = useQuery({
    queryKey: stateKey,
    queryFn: () => fetchState({ data: { userId } }),
    enabled: !!userId,
  });

  const [text, setText] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const initializedRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const prd = data?.ok ? data.prd : null;
  const cases = data?.ok ? data.cases : [];
  const s2Cases = data?.ok ? data.s2Cases : [];
  

  const draftSeed = useMemo(() => buildDraftText(prd, cases, s2Cases), [prd, cases, s2Cases]);

  useEffect(() => {
    if (data?.ok && !initializedRef.current) {
      const saved = (data.prompt.context ?? "").trim();
      // 새 방식(전체 문서) 저장본만 그대로 사용. 비어 있거나 5칸 방식 잔여물이면 초안 시드로 채움.
      const looksLikeFullDraft = saved.length > 0 && saved.includes(SEED_MARKER);
      setText(looksLikeFullDraft ? data.prompt.context : draftSeed);
      initializedRef.current = true;
    }
  }, [data, draftSeed]);

  const saveMut = useMutation({
    mutationFn: (next: string) =>
      save({ data: { userId, fields: { role: "", context: next, task: "", nonfunctional: "" } } }),
    onSuccess: (res) => {
      if (!res.ok) {
        setStatus("error");
        return;
      }
      setStatus("saved");
      qc.invalidateQueries({ queryKey: stateKey });
    },
    onError: () => setStatus("error"),
  });

  function update(next: string) {
    const clipped = next.slice(0, MAX_LEN);
    setText(clipped);
    setStatus("saving");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => saveMut.mutate(clipped), 900);
  }

  function resetToDraft() {
    if (!confirm("현재 편집 내용을 초안 PRD로 되돌립니다. 계속할까요?")) return;
    update(draftSeed);
  }

  async function copyPrompt() {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      toast.success("PRD 프롬프트를 클립보드에 복사했습니다.");
    } catch {
      toast.error("복사에 실패했습니다. 텍스트를 직접 선택해 복사해 주세요.");
    }
  }

  if (text === null) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-border/60 p-6 text-sm text-muted-foreground">
        불러오는 중…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border-2 border-primary/20 bg-card p-5 shadow-sm">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary/70">S4 · 4교시</p>
            <h2 className="font-display text-xl font-bold text-foreground">초안 PRD 수정하기</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              3교시에서 확정한 PRD 초안과 테스트 케이스가 아래에 자동으로 채워져 있습니다. 전체 문장을 직접 다듬어 최종 PRD 프롬프트를 완성하세요.
            </p>
          </div>
          <p className={cn(
            "text-xs",
            status === "saved" && "text-emerald-600",
            status === "saving" && "text-muted-foreground",
            status === "error" && "text-destructive",
          )}>
            <Save className="mr-1 inline h-3 w-3" aria-hidden />
            {status === "saving" ? "저장 중…" : status === "saved" ? "저장됨" : status === "error" ? "저장 실패" : "\u00A0"}
          </p>
        </div>

        <Textarea
          value={text}
          onChange={(e) => update(e.target.value)}
          rows={22}
          spellCheck={false}
          className="min-h-[420px] whitespace-pre-wrap font-mono text-sm leading-relaxed"
        />

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <span>{text.length.toLocaleString()} / {MAX_LEN.toLocaleString()}자</span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={resetToDraft}
              className="h-7 px-2 text-[11px]"
            >
              <RotateCcw className="mr-1 h-3 w-3" aria-hidden />
              초안 PRD로 되돌리기
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={copyPrompt} className="h-7 px-2 text-[11px]">
              <Copy className="mr-1 h-3 w-3" aria-hidden />
              복사
            </Button>
          </div>
        </div>
      </div>

      {/* 확정 바 */}
      <div className="flex items-center justify-between rounded-2xl border-2 border-primary/30 bg-accent/30 p-4">
        <div>
          <p className="font-display text-sm font-bold text-primary">초안 PRD 수정 확정</p>
          <p className="text-xs text-muted-foreground">
            확정하면 S4 게이트를 통과합니다. 확정 후에도 테스트 케이스는 계속 다듬을 수 있습니다.
          </p>
        </div>
        <Button onClick={onConfirmClick} disabled={confirmDisabled || confirmBusy}>
          <Lock className="mr-1 h-4 w-4" aria-hidden />
          {confirmLabel}
        </Button>
      </div>

      {/* 실행 안내 (Lovable로 옮기기) */}
      <div className="rounded-2xl border-4 border-primary bg-primary/10 p-6 text-center shadow-md">
        <p className="font-display text-2xl font-bold leading-snug text-primary sm:text-3xl">
          이 PRD 프롬프트를 복사해서 <span className="underline decoration-accent decoration-4 underline-offset-4">Lovable</span>로 구현해 보세요.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          위 <b>복사</b> 버튼을 눌러 PRD 프롬프트 전문을 가져간 뒤, Lovable 새 프로젝트 첫 입력창에 붙여넣습니다.
        </p>
        <div className="mt-4 flex justify-center">
          <Button size="lg" onClick={copyPrompt} className="text-base">
            <Copy className="mr-2 h-5 w-5" aria-hidden />
            PRD 프롬프트 전체 복사
          </Button>
        </div>
      </div>
    </div>
  );
}
