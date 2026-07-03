import { Stamp } from "lucide-react";
import { cn } from "@/lib/utils";

export function Nametag({
  nickname,
  role,
  className,
}: {
  nickname: string;
  role: "participant" | "instructor";
  className?: string;
}) {
  return (
    <div className={cn("nametag font-display", className)}>
      <span className="text-xs text-primary/70">
        {role === "instructor" ? "강사" : "참가 교사"}
      </span>
      <span className="text-base">{nickname}</span>
    </div>
  );
}

export function StageStamp({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full border-2 border-primary/70 bg-accent/40 px-2.5 py-1 text-xs font-bold text-primary">
      <Stamp className="h-3.5 w-3.5" aria-hidden />
      <span>{children}</span>
    </div>
  );
}
