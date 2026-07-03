import { Printer, Stamp } from "lucide-react";
import { STAGES } from "@/components/school/TimetableCard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { StampSet } from "./CompletionStamp";

export function CertificateCard({
  nickname,
  sessionName,
  stamps,
  completedAt,
  allDone,
}: {
  nickname: string;
  sessionName: string;
  stamps: StampSet;
  completedAt: string | null;
  allDone: boolean;
}) {
  return (
    <div className="print:m-0">
      <div className="mb-2 flex items-center justify-between print:hidden">
        <p className="text-sm text-muted-foreground">
          {allDone
            ? "인쇄 버튼으로 명찰형 수료증을 저장하거나 인쇄할 수 있어요."
            : "수료 항목을 모두 완료하면 수료증이 발급됩니다."}
        </p>
        <Button
          size="sm"
          variant="outline"
          disabled={!allDone}
          onClick={() => window.print()}
        >
          <Printer className="mr-1 h-3.5 w-3.5" aria-hidden />
          인쇄 / PDF 저장
        </Button>
      </div>

      <div
        id="certificate-print-area"
        className={cn(
          "certificate-card mx-auto max-w-2xl rounded-3xl border-4 p-8 shadow-sm print:border-2 print:shadow-none",
          allDone
            ? "border-primary/70 bg-accent/20"
            : "border-border/60 bg-muted/30",
        )}
      >
        <div className="mb-2 text-center">
          <p className="text-xs uppercase tracking-[0.35em] text-primary/70">
            Certificate of Completion
          </p>
          <h2 className="mt-1 font-display text-2xl font-bold text-primary">
            심화반 수료 명찰
          </h2>
        </div>
        <div className="my-4 border-y-2 border-primary/25 py-4 text-center">
          <p className="text-xs text-muted-foreground">이 명찰의 주인</p>
          <p className="mt-1 font-display text-3xl font-bold text-foreground">
            {nickname}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            연수명 · <b className="text-foreground">{sessionName}</b>
          </p>
        </div>
        <div className="mb-4 grid grid-cols-6 gap-2">
          {STAGES.map((s) => {
            const done = stamps[`s${s.no}` as keyof StampSet];
            return (
              <div
                key={s.code}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl border-2 py-2",
                  done
                    ? "border-primary/60 bg-primary/10 text-primary"
                    : "border-border/60 bg-card text-muted-foreground",
                )}
                title={s.title}
              >
                <Stamp className="h-4 w-4" aria-hidden />
                <span className="text-[10px] font-bold">{s.code}</span>
              </div>
            );
          })}
        </div>
        <p className="text-center text-sm text-foreground">
          위 사람은 「내 수업에 코딩 한 스푼 · 심화반」의 6개 스테이지를 모두 통과하고
          오늘의 회고를 남겼음을 명찰로 증명합니다.
        </p>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          수료 시각 ·{" "}
          {completedAt
            ? new Date(completedAt).toLocaleString("ko-KR")
            : "아직 완료되지 않음"}
        </p>
      </div>
    </div>
  );
}
