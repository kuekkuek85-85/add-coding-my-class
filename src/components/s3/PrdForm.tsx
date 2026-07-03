import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Save } from "lucide-react";

import { getMyPrdDraft, saveMyPrdDraft } from "@/lib/s3.functions";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const SECTIONS: Array<{
  key: keyof PrdFields;
  label: string;
  hint: string;
  placeholder: string;
  min: number;
  rows: number;
}> = [
  {
    key: "problem",
    label: "문제",
    hint: "누가, 어떤 상황에서, 무엇에 불편을 겪고 있나요?",
    placeholder: "예: 5학년 수학 시간에 학생들이 개념을 놓치면 다음 단계에서 계속 헤맨다.",
    min: 20,
    rows: 3,
  },
  {
    key: "users",
    label: "사용자",
    hint: "이 도구를 실제로 쓸 사람은 누구인가요? 사용 맥락은?",
    placeholder: "예: 우리 반 5학년 학생, 개별 자습 시간에 태블릿으로 접속.",
    min: 15,
    rows: 3,
  },
  {
    key: "features",
    label: "핵심 기능 (3~5개, 줄바꿈으로 구분)",
    hint: "각 줄에 기능 하나씩. 최소 3개.",
    placeholder: "예:\n오늘 배운 개념 요약 카드\n학생이 예시 문제를 풀면 힌트 단계별 제공\n담임 확인용 진도 요약",
    min: 30,
    rows: 5,
  },
  {
    key: "nonfunctional",
    label: "비기능 요구",
    hint: "속도, 접근성, 프라이버시, 언어, 오프라인 등.",
    placeholder: "예: 태블릿에서 3초 안에 응답, 개인정보 수집 없음, 한국어.",
    min: 10,
    rows: 3,
  },
  {
    key: "success_metric",
    label: "성공 지표",
    hint: "무엇을 보고 '이 도구는 잘 작동한다'라고 말하겠습니까?",
    placeholder: "예: 자습 시간 중 학생 70% 이상이 개념 확인 카드를 끝까지 본다.",
    min: 10,
    rows: 2,
  },
  {
    key: "out_of_scope",
    label: "범위 밖",
    hint: "이번에는 하지 않을 것을 명확히 적어 두세요.",
    placeholder: "예: 성적 자동 채점, 학부모 알림 기능.",
    min: 5,
    rows: 2,
  },
];

export type PrdFields = {
  problem: string;
  users: string;
  features: string;
  nonfunctional: string;
  success_metric: string;
  out_of_scope: string;
};

export function PrdForm({
  userId,
  readOnly,
  onSubmittedV1Change,
  onFieldsChange,
}: {
  userId: string;
  readOnly?: boolean;
  onSubmittedV1Change?: (submitted: boolean, submittedV2: boolean) => void;
  onFieldsChange?: (fields: PrdFields) => void;
}) {
  const qc = useQueryClient();
  const fetchDraft = useServerFn(getMyPrdDraft);
  const save = useServerFn(saveMyPrdDraft);

  const draftKey = ["s3-draft", userId];
  const { data } = useQuery({
    queryKey: draftKey,
    queryFn: () => fetchDraft({ data: { userId } }),
    enabled: !!userId,
  });

  const [fields, setFields] = useState<PrdFields | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (data?.ok && !initializedRef.current) {
      setFields(data.fields);
      initializedRef.current = true;
    }
  }, [data]);

  useEffect(() => {
    if (data?.ok) {
      onSubmittedV1Change?.(!!data.submittedV1At, !!data.submittedV2At);
    }
  }, [data, onSubmittedV1Change]);

  useEffect(() => {
    if (fields) onFieldsChange?.(fields);
  }, [fields, onFieldsChange]);

  const saveMut = useMutation({
    mutationFn: (next: PrdFields) => save({ data: { userId, fields: next } }),
    onSuccess: (res) => {
      if (!res.ok) {
        setStatus("error");
        return;
      }
      setStatus("saved");
      qc.invalidateQueries({ queryKey: draftKey });
    },
    onError: () => setStatus("error"),
  });

  function update(key: keyof PrdFields, value: string) {
    if (!fields || readOnly) return;
    const next = { ...fields, [key]: value };
    setFields(next);
    setStatus("saving");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      saveMut.mutate(next);
    }, 900);
  }

  if (!fields) {
    return <div className="rounded-2xl border-2 border-dashed border-border/60 p-6 text-sm text-muted-foreground">불러오는 중…</div>;
  }

  const filled = SECTIONS.filter((s) => fields[s.key].trim().length >= s.min).length;
  const featureLines = fields.features.split(/\n+/).map((l) => l.trim()).filter(Boolean).length;
  const canSubmitV1 = SECTIONS.every((s) => fields[s.key].trim().length > 0) && featureLines >= 3;

  return (
    <div className="rounded-2xl border-2 border-primary/20 bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary/70">S3 · 3교시</p>
          <h2 className="font-display text-xl font-bold text-foreground">PRD 작성</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            자동 저장됩니다. AI는 이 문장을 대신 써주지 않습니다.
          </p>
        </div>
        <div className="text-right text-xs">
          <p className="font-semibold text-primary">{filled} / {SECTIONS.length} 섹션</p>
          <p className={cn(
            "mt-0.5",
            status === "saved" && "text-emerald-600",
            status === "saving" && "text-muted-foreground",
            status === "error" && "text-destructive",
          )}>
            <Save className="mr-1 inline h-3 w-3" aria-hidden />
            {status === "saving" ? "저장 중…" : status === "saved" ? "저장됨" : status === "error" ? "저장 실패" : "\u00A0"}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {SECTIONS.map((s) => {
          const value = fields[s.key];
          const short = value.trim().length < s.min;
          return (
            <label key={s.key} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-semibold text-foreground">{s.label}</span>
                <span className={cn("text-[11px]", short ? "text-muted-foreground" : "text-emerald-600")}>
                  {value.trim().length}자
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">{s.hint}</p>
              <Textarea
                value={value}
                onChange={(e) => update(s.key, e.target.value.slice(0, s.key === "features" ? 4000 : 2000))}
                placeholder={s.placeholder}
                readOnly={readOnly}
                rows={s.rows}
                className={cn("bg-background/70", readOnly && "opacity-70")}
              />
              {s.key === "features" && (
                <p className={cn("text-[11px]", featureLines >= 3 ? "text-emerald-600" : "text-muted-foreground")}>
                  줄바꿈으로 구분된 기능 {featureLines}개 (최소 3개)
                </p>
              )}
            </label>
          );
        })}
      </div>

      {!canSubmitV1 && (
        <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900">
          아직 제출할 수 없어요 — 모든 섹션을 채우고 핵심 기능을 3줄 이상 입력해 주세요.
        </p>
      )}
    </div>
  );
}
