import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, ClipboardCopy, Lock } from "lucide-react";
import { toast } from "sonner";

import { getMyS5State, saveMyS5Revised } from "@/lib/s5.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const FIELDS: Array<{
  key: "target" | "evidence" | "keep_list" | "add_list" | "constraints";
  label: string;
  hint: string;
  placeholder: string;
}> = [
  {
    key: "target",
    label: "1. 수정 대상",
    hint: "어떤 부분을 다음 번에 고칠 것인가? 한 문장으로.",
    placeholder: "예: 힌트가 마지막 단계에서 정답 문장을 그대로 노출하는 문제",
  },
  {
    key: "evidence",
    label: "2. 근거 테스트",
    hint: "그 판단을 내리게 된 테스트 케이스/증거를 짧게 인용.",
    placeholder: "예: 케이스 3 '정답 노출 금지' 실패 — 마지막 힌트에 정답이 그대로 나옴",
  },
  {
    key: "keep_list",
    label: "3. 유지할 것",
    hint: "이번에 잘 된 것 — 절대 잃지 말아야 할 동작/문구.",
    placeholder: "예: 힌트 1~2단계의 절차형 설명은 그대로 유지",
  },
  {
    key: "add_list",
    label: "4. 추가 요구",
    hint: "다음 프롬프트에 새로 넣을 조건/입력.",
    placeholder: "예: 마지막 단계에서도 '풀이 절차'만 노출하고, 정답 수식은 절대 출력 금지",
  },
  {
    key: "constraints",
    label: "5. 제약",
    hint: "형식·톤·안전·개인정보 등 기술적/윤리적 제약.",
    placeholder: "예: 한국어 존댓말, 2문장 이내, 학생 이름/개인정보 언급 금지",
  },
];

export function RevisedPromptBuilder({
  userId,
  onConfirmClick,
  confirmDisabled,
  confirmBusy,
  confirmLabel,
}: {
  userId: string;
  onConfirmClick: () => void;
  confirmDisabled: boolean;
  confirmBusy: boolean;
  confirmLabel: string;
}) {
  const qc = useQueryClient();
  const fetchState = useServerFn(getMyS5State);
  const save = useServerFn(saveMyS5Revised);
  const key = ["s5-state", userId];

  const { data } = useQuery({
    queryKey: key,
    queryFn: () => fetchState({ data: { userId } }),
    enabled: !!userId,
  });

  const server = data?.ok ? data.revised : null;
  const confirmed = data?.ok ? data.confirmed : false;

  const [fields, setFields] = useState({
    target: "",
    evidence: "",
    keep_list: "",
    add_list: "",
    constraints: "",
  });
  const initialized = useRef(false);
  useEffect(() => {
    if (server && !initialized.current) {
      setFields(server);
      initialized.current = true;
    }
  }, [server]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveMut = useMutation({
    mutationFn: (f: typeof fields) => save({ data: { userId, fields: f } }),
    onSuccess: (res) => {
      if (!res.ok) toast.error(res.error);
      else qc.invalidateQueries({ queryKey: key });
    },
  });

  function update(key: keyof typeof fields, value: string) {
    if (confirmed) return;
    const next = { ...fields, [key]: value };
    setFields(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => saveMut.mutate(next), 700);
  }

  const complete = useMemo(
    () => Object.values(fields).every((v) => v.trim().length > 0),
    [fields],
  );

  const preview = useMemo(
    () =>
      [
        `# 수정 대상\n${fields.target}`,
        `# 근거 테스트\n${fields.evidence}`,
        `# 유지할 것\n${fields.keep_list}`,
        `# 추가 요구\n${fields.add_list}`,
        `# 제약\n${fields.constraints}`,
      ].join("\n\n"),
    [fields],
  );

  async function copyPreview() {
    try {
      await navigator.clipboard.writeText(preview);
      toast.success("수정 프롬프트를 복사했습니다.");
    } catch {
      toast.error("복사에 실패했습니다. 텍스트를 직접 선택해 주세요.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border-2 border-primary/20 bg-card p-5 shadow-sm">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary/70">
              S5 · 다음 번 수정 프롬프트
            </p>
            <h2 className="font-display text-xl font-bold text-foreground">
              수정 프롬프트 조립기
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              실행 체크리스트와 교차 QA 결과를 바탕으로, 다음 번 AI/개발자에게 넘길 수정 프롬프트를 직접 씁니다.
              도우미는 없어요 — 문장은 여러분이 씁니다.
            </p>
          </div>
          <span
            className={cn(
              "text-xs font-semibold",
              complete ? "text-emerald-600" : "text-muted-foreground",
            )}
          >
            {Object.values(fields).filter((v) => v.trim().length > 0).length} / 5 채움
          </span>
        </div>

        {confirmed && (
          <div className="mb-3 flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50/60 p-2.5 text-xs text-emerald-900">
            <Lock className="h-3.5 w-3.5" aria-hidden />
            확정된 수정 프롬프트입니다. 더 이상 편집할 수 없어요.
          </div>
        )}

        <div className="grid gap-3">
          {FIELDS.map((f) => (
            <div key={f.key}>
              <label className="mb-1 flex items-baseline justify-between gap-2 text-xs font-semibold text-primary">
                {f.label}
                <span className="text-[10px] font-normal text-muted-foreground">{f.hint}</span>
              </label>
              <Textarea
                rows={3}
                placeholder={f.placeholder}
                value={fields[f.key]}
                disabled={confirmed}
                maxLength={2000}
                onChange={(e) => update(f.key, e.target.value)}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border-2 border-primary/25 bg-accent/20 p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary/70">
            미리보기
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={copyPreview}
            disabled={!complete}
          >
            <ClipboardCopy className="mr-1 h-3.5 w-3.5" aria-hidden />
            복사
          </Button>
        </div>
        <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-xl border border-primary/15 bg-card p-3 text-xs text-foreground">
          {preview}
        </pre>
      </div>

      <div className="flex items-center justify-between rounded-2xl border-2 border-primary/30 bg-card p-4">
        <p className="text-sm text-muted-foreground">
          체크리스트 완료 + 교차 QA 제출 + 5칸 채움이면 확정할 수 있어요.
        </p>
        <Button disabled={confirmDisabled || confirmBusy} onClick={onConfirmClick}>
          <CheckCircle2 className="mr-1 h-4 w-4" aria-hidden />
          {confirmLabel}
        </Button>
      </div>
    </div>
  );
}
