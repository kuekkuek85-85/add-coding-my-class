import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Copy, Save, Lock } from "lucide-react";
import { toast } from "sonner";

import { getMyS4State, saveMyS4Prompt } from "@/lib/s4.functions";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Fields = {
  role: string;
  context: string;
  task: string;
  nonfunctional: string;
};

const EMPTY: Fields = { role: "", context: "", task: "", nonfunctional: "" };

const SECTIONS: Array<{
  key: keyof Fields;
  label: string;
  hint: string;
  placeholder: string;
  rows: number;
  max: number;
}> = [
  {
    key: "role",
    label: "1. 역할 (누구에게 시키나요?)",
    hint: "AI에게 어떤 역할로 답하게 할지 한 문장으로 지정합니다.",
    placeholder: "예) 너는 초등학교 5학년 수학 자습을 돕는 튜터야.",
    rows: 2,
    max: 500,
  },
  {
    key: "context",
    label: "2. 컨텍스트 (배경/사용자)",
    hint: "PRD에서 문제·사용자·범위를 요약해 옮기세요.",
    placeholder: "예) 5학년 학생이 자습 시간에 태블릿으로 사용, 3초 안에 응답, 개인정보 수집 없음.",
    rows: 3,
    max: 2000,
  },
  {
    key: "task",
    label: "3. 해야 할 일 (핵심 지시)",
    hint: "AI가 구체적으로 무엇을 해야 하는지 적으세요.",
    placeholder: "예) 학생이 힌트를 요청하면 답을 바로 알려주지 말고, 단계별 힌트를 하나씩만 제공한다.",
    rows: 3,
    max: 2000,
  },
  {
    key: "nonfunctional",
    label: "4. 비기능 요구",
    hint: "톤·언어·금기사항·형식 등. 여기서 '하지 말 것'을 명확히.",
    placeholder: "예) 한국어 존댓말, 이모지 사용 금지, 정답 노출 금지, 2문장 이내.",
    rows: 2,
    max: 1000,
  },
];

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

  const [fields, setFields] = useState<Fields | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const initializedRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (data?.ok && !initializedRef.current) {
      setFields(data.prompt);
      initializedRef.current = true;
    }
  }, [data]);

  const saveMut = useMutation({
    mutationFn: (next: Fields) => save({ data: { userId, fields: next } }),
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

  const readOnly = !!data?.ok && data.confirmed;
  const cases = data?.ok ? data.cases : [];

  function update(key: keyof Fields, value: string) {
    if (!fields || readOnly) return;
    const next = { ...fields, [key]: value };
    setFields(next);
    setStatus("saving");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => saveMut.mutate(next), 900);
  }

  if (!fields) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-border/60 p-6 text-sm text-muted-foreground">
        불러오는 중…
      </div>
    );
  }

  const casesText = cases
    .filter((c) => c.title.trim() && c.given.trim() && c.when_step.trim() && c.then_step.trim())
    .map(
      (c, i) =>
        `${i + 1}. ${c.title}\n   - 주어진: ${c.given}\n   - 할 때: ${c.when_step}\n   - 그러면: ${c.then_step}`,
    )
    .join("\n");

  const finalPrompt = [
    `# 역할\n${fields.role || "(비어 있음)"}`,
    `# 컨텍스트\n${fields.context || "(비어 있음)"}`,
    `# 해야 할 일\n${fields.task || "(비어 있음)"}`,
    `# 통과해야 할 테스트 케이스\n${casesText || "(테스트 케이스 없음)"}`,
    `# 비기능 요구\n${fields.nonfunctional || "(비어 있음)"}`,
  ].join("\n\n");

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(finalPrompt);
      toast.success("PRD 프롬프트를 클립보드에 복사했습니다.");
    } catch {
      toast.error("복사에 실패했습니다. 텍스트를 직접 선택해 복사해 주세요.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border-2 border-primary/20 bg-card p-5 shadow-sm">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary/70">S4 · 4교시</p>
            <h2 className="font-display text-xl font-bold text-foreground">첫 PRD 프롬프트 조립</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              5칸을 직접 채웁니다. AI는 이 문장을 대신 써주지 않습니다.
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

        <div className="flex flex-col gap-4">
          {SECTIONS.map((s) => (
            <label key={s.key} className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-foreground">{s.label}</span>
              <p className="text-[11px] text-muted-foreground">{s.hint}</p>
              <Textarea
                rows={s.rows}
                value={fields[s.key]}
                readOnly={readOnly}
                onChange={(e) => update(s.key, e.target.value.slice(0, s.max))}
                placeholder={s.placeholder}
                className={cn("bg-background/70", readOnly && "opacity-70")}
              />
            </label>
          ))}
          <div className="rounded-lg border border-primary/20 bg-accent/20 p-3 text-xs text-primary">
            <b>5. 통과해야 할 테스트 케이스</b> — 앞 탭에서 만든 {cases.length}개가 자동으로 붙습니다.
          </div>
        </div>
      </div>

      {/* 미리보기 */}
      <div className="rounded-2xl border-2 border-primary/20 bg-card p-5 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-display text-sm font-bold text-primary">최종 PRD 프롬프트 미리보기</h3>
          <Button size="sm" variant="outline" onClick={copyPrompt}>
            <Copy className="mr-1 h-3.5 w-3.5" aria-hidden />
            복사
          </Button>
        </div>
        <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-lg border border-border/40 bg-muted/40 p-3 text-xs text-foreground">
{finalPrompt}
        </pre>
      </div>

      {/* 확정 바 */}
      <div className="flex items-center justify-between rounded-2xl border-2 border-primary/30 bg-accent/30 p-4">
        <div>
          <p className="font-display text-sm font-bold text-primary">첫 PRD 프롬프트 확정</p>
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

