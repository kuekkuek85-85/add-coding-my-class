import { FileText } from "lucide-react";

type Prd = {
  problem: string;
  users: string;
  features: string;
  nonfunctional: string;
  success_metric: string;
  out_of_scope: string;
};

const ROWS: Array<{ key: keyof Prd; label: string }> = [
  { key: "problem", label: "문제" },
  { key: "users", label: "사용자" },
  { key: "features", label: "핵심 기능" },
  { key: "nonfunctional", label: "비기능" },
  { key: "success_metric", label: "성공 지표" },
  { key: "out_of_scope", label: "범위 밖" },
];

export function PrdReadOnly({ prd }: { prd: Prd | null }) {
  if (!prd) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-border/60 bg-muted/30 p-5 text-sm text-muted-foreground">
        S3 2차 제출을 완료해야 S4에서 PRD를 참고할 수 있어요.
      </div>
    );
  }
  return (
    <details className="rounded-2xl border-2 border-primary/20 bg-card shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-4">
        <div className="flex items-center gap-2 font-display text-sm font-bold text-primary">
          <FileText className="h-4 w-4" aria-hidden />
          내 초안 PRD 다시 보기
        </div>
        <span className="text-xs text-muted-foreground">펼치기</span>
      </summary>
      <div className="border-t border-border/50 p-4">
        <dl className="grid gap-3 text-sm">
          {ROWS.map((r) => (
            <div key={r.key}>
              <dt className="text-xs font-semibold uppercase tracking-wide text-primary/70">
                {r.label}
              </dt>
              <dd className="mt-0.5 whitespace-pre-wrap text-foreground">{prd[r.key]}</dd>
            </div>
          ))}
        </dl>
      </div>
    </details>
  );
}
