import { ChevronLeft, ChevronRight, Shuffle } from "lucide-react";
import {
  type Avatar,
  HAIR_STYLES,
  TOP_STYLES,
  ACCESSORIES,
  HAIR_COLORS,
  TOP_COLORS,
  SKIN_TONES,
  randomAvatar,
} from "@/lib/avatar-presets";
import { AvatarSvg } from "./AvatarSvg";
import { Button } from "@/components/ui/button";

type Field = keyof Avatar;

const OPTIONS: Record<Field, readonly string[]> = {
  hair: HAIR_STYLES,
  hairColor: HAIR_COLORS,
  top: TOP_STYLES,
  topColor: TOP_COLORS,
  skin: SKIN_TONES,
  accessory: ACCESSORIES,
};

const LABELS: Record<Field, string> = {
  hair: "머리 모양",
  hairColor: "머리 색",
  top: "상의",
  topColor: "상의 색",
  skin: "피부 톤",
  accessory: "액세서리",
};

export function AvatarBuilder({
  value,
  onChange,
}: {
  value: Avatar;
  onChange: (next: Avatar) => void;
}) {
  function cycle(field: Field, dir: 1 | -1) {
    const opts = OPTIONS[field];
    const idx = opts.indexOf(value[field]);
    const next = opts[(idx + dir + opts.length) % opts.length];
    onChange({ ...value, [field]: next });
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="rounded-2xl border-2 border-primary/20 bg-gradient-to-b from-accent/30 to-transparent p-4">
        <AvatarSvg avatar={value} size={144} />
      </div>
      <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
        {(Object.keys(OPTIONS) as Field[]).map((f) => (
          <div
            key={f}
            className="flex items-center justify-between gap-2 rounded-lg border border-border/70 bg-card px-3 py-2 text-sm"
          >
            <span className="font-medium text-muted-foreground">{LABELS[f]}</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => cycle(f, -1)}
                aria-label={`${LABELS[f]} 이전`}
                className="grid h-7 w-7 place-items-center rounded-full border hover:bg-muted"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {f === "hairColor" || f === "topColor" || f === "skin" ? (
                <span
                  className="inline-block h-5 w-8 rounded border"
                  style={{ background: value[f] }}
                />
              ) : (
                <span className="min-w-[52px] text-center text-xs font-semibold uppercase text-foreground">
                  {value[f]}
                </span>
              )}
              <button
                type="button"
                onClick={() => cycle(f, 1)}
                aria-label={`${LABELS[f]} 다음`}
                className="grid h-7 w-7 place-items-center rounded-full border hover:bg-muted"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
      <Button type="button" variant="outline" size="sm" onClick={() => onChange(randomAvatar())}>
        <Shuffle className="mr-1 h-3.5 w-3.5" /> 랜덤
      </Button>
    </div>
  );
}
