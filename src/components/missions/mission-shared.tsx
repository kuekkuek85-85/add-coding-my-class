import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { MissionStatus } from "@/lib/missions.functions";

export const STATUS_LABEL: Record<MissionStatus, string> = {
  open: "대기중",
  in_progress: "진행중",
  resolved: "해결됨",
  cancelled: "종료",
};

export const STATUS_COLOR: Record<MissionStatus, string> = {
  open: "border-amber-300 bg-amber-100 text-amber-900",
  in_progress: "border-sky-300 bg-sky-100 text-sky-900",
  resolved: "border-emerald-300 bg-emerald-100 text-emerald-900",
  cancelled: "border-slate-300 bg-slate-100 text-slate-700",
};

export function StatusBadge({ status, className }: { status: MissionStatus; className?: string }) {
  return (
    <Badge variant="outline" className={cn("border", STATUS_COLOR[status], className)}>
      {STATUS_LABEL[status]}
    </Badge>
  );
}

/** 첨부: 이미지는 렌더 + 다운로드, 링크는 하이퍼링크 */
export function AttachmentList({
  items,
}: {
  items: Array<{ type: "image" | "link"; url: string; caption?: string | null }>;
}) {
  if (!items || items.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {items.map((a, i) => {
        if (a.type === "image") {
          return (
            <div key={i} className="flex flex-col gap-1">
              <a href={a.url} target="_blank" rel="noreferrer">
                <img
                  src={a.url}
                  alt={a.caption ?? "첨부 이미지"}
                  className="max-h-48 max-w-xs rounded-lg border object-contain"
                  loading="lazy"
                />
              </a>
              <a
                href={a.url}
                download
                className="text-xs text-primary underline underline-offset-2"
              >
                다운로드
              </a>
            </div>
          );
        }
        return (
          <a
            key={i}
            href={a.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex max-w-full items-center gap-1 truncate rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs text-primary underline underline-offset-2"
          >
            {a.caption || a.url}
          </a>
        );
      })}
    </div>
  );
}

/** 텍스트 내 URL 자동 하이퍼링크 */
export function LinkifiedText({ text }: { text: string }) {
  const RE = /(https?:\/\/[^\s<]+)/g;
  const nodes: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = RE.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const url = m[0].replace(/[.,;!?)]+$/, "");
    const trail = m[0].slice(url.length);
    nodes.push(
      <a
        key={m.index}
        href={url}
        target="_blank"
        rel="noreferrer"
        className="underline underline-offset-2 break-all text-primary"
        onClick={(e) => e.stopPropagation()}
      >
        {url}
      </a>,
    );
    if (trail) nodes.push(trail);
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return <span className="whitespace-pre-wrap break-words">{nodes.length ? nodes : text}</span>;
}
