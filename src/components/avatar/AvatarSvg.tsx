import type { Avatar } from "@/lib/avatar-presets";

/**
 * 픽셀 느낌의 각진 아바타 SVG. viewBox 64x64.
 * 상반신(가슴~머리)만 나오는 top-down 게임 캐릭터 스타일.
 */
export function AvatarSvg({
  avatar,
  size = 64,
  ringColor,
  className,
}: {
  avatar: Avatar;
  size?: number;
  ringColor?: string;
  className?: string;
}) {
  const { skin, hair, hairColor, top, topColor, accessory } = avatar;
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      style={{ imageRendering: "pixelated" }}
      aria-hidden
    >
      {ringColor && (
        <circle cx="32" cy="32" r="30" fill="none" stroke={ringColor} strokeWidth="4" />
      )}
      {/* Body / shirt */}
      <Top style={top} color={topColor} />
      {/* Neck */}
      <rect x="27" y="34" width="10" height="6" fill={skin} />
      {/* Head */}
      <rect x="20" y="14" width="24" height="24" rx="3" fill={skin} />
      {/* Ears */}
      <rect x="18" y="24" width="3" height="6" fill={skin} />
      <rect x="43" y="24" width="3" height="6" fill={skin} />
      {/* Eyes */}
      <rect x="25" y="26" width="3" height="3" fill="#111" />
      <rect x="36" y="26" width="3" height="3" fill="#111" />
      {/* Mouth */}
      <rect x="29" y="32" width="6" height="1.5" fill="#7f1d1d" />
      {/* Hair */}
      <Hair style={hair} color={hairColor} />
      {/* Accessory */}
      <Accessory kind={accessory} />
    </svg>
  );
}

function Hair({ style, color }: { style: string; color: string }) {
  switch (style) {
    case "h1": // short cap
      return (
        <>
          <rect x="19" y="12" width="26" height="8" fill={color} />
          <rect x="19" y="18" width="4" height="6" fill={color} />
          <rect x="41" y="18" width="4" height="6" fill={color} />
        </>
      );
    case "h2": // side part
      return (
        <>
          <rect x="19" y="12" width="26" height="7" fill={color} />
          <rect x="19" y="19" width="10" height="4" fill={color} />
        </>
      );
    case "h3": // bob
      return (
        <>
          <rect x="17" y="12" width="30" height="10" fill={color} />
          <rect x="17" y="20" width="4" height="14" fill={color} />
          <rect x="43" y="20" width="4" height="14" fill={color} />
        </>
      );
    case "h4": // ponytail
      return (
        <>
          <rect x="19" y="12" width="26" height="7" fill={color} />
          <rect x="44" y="19" width="6" height="10" fill={color} />
        </>
      );
    case "h5": // buzz
      return <rect x="20" y="13" width="24" height="4" fill={color} />;
    case "h6": // wavy
      return (
        <>
          <rect x="18" y="11" width="28" height="9" fill={color} />
          <rect x="16" y="13" width="4" height="10" fill={color} />
          <rect x="44" y="13" width="4" height="10" fill={color} />
          <rect x="18" y="20" width="6" height="4" fill={color} />
          <rect x="40" y="20" width="6" height="4" fill={color} />
        </>
      );
    case "h7": // long straight
      return (
        <>
          <rect x="19" y="12" width="26" height="7" fill={color} />
          <rect x="15" y="16" width="4" height="22" fill={color} />
          <rect x="45" y="16" width="4" height="22" fill={color} />
        </>
      );
    case "h8": // twin tails
      return (
        <>
          <rect x="19" y="12" width="26" height="7" fill={color} />
          <rect x="14" y="18" width="6" height="12" fill={color} />
          <rect x="44" y="18" width="6" height="12" fill={color} />
        </>
      );
    case "h9": // braid
      return (
        <>
          <rect x="19" y="12" width="26" height="7" fill={color} />
          <rect x="42" y="18" width="8" height="12" fill={color} />
          <rect x="40" y="28" width="6" height="4" fill={color} />
          <rect x="38" y="32" width="4" height="4" fill={color} />
        </>
      );
    case "h10": // bun
      return (
        <>
          <rect x="20" y="13" width="24" height="6" fill={color} />
          <rect x="25" y="6" width="14" height="7" fill={color} />
          <rect x="19" y="18" width="3" height="8" fill={color} />
          <rect x="42" y="18" width="3" height="8" fill={color} />
        </>
      );
    case "h11": // long wavy
      return (
        <>
          <rect x="18" y="11" width="28" height="8" fill={color} />
          <rect x="14" y="16" width="4" height="18" fill={color} />
          <rect x="46" y="16" width="4" height="18" fill={color} />
          <rect x="13" y="24" width="3" height="6" fill={color} />
          <rect x="48" y="24" width="3" height="6" fill={color} />
        </>
      );
    case "h12": // pixie headband
      return (
        <>
          <rect x="19" y="14" width="26" height="6" fill={color} />
          <rect x="19" y="12" width="26" height="2" fill="#FF6B57" />
          <rect x="24" y="10" width="16" height="2" fill="#FF6B57" />
          <rect x="19" y="19" width="4" height="6" fill={color} />
          <rect x="41" y="19" width="4" height="6" fill={color} />
        </>
      );
    default:
      return null;
  }
}

function Top({ style, color }: { style: string; color: string }) {
  const collar = "#00000022";
  switch (style) {
    case "t1": // crewneck
      return (
        <>
          <rect x="10" y="40" width="44" height="22" fill={color} />
          <rect x="26" y="40" width="12" height="4" fill={collar} />
        </>
      );
    case "t2": // v-neck
      return (
        <>
          <rect x="10" y="40" width="44" height="22" fill={color} />
          <polygon points="26,40 38,40 32,48" fill={collar} />
        </>
      );
    case "t3": // suit
      return (
        <>
          <rect x="10" y="40" width="44" height="22" fill={color} />
          <polygon points="18,40 32,40 26,62" fill="#00000033" />
          <polygon points="46,40 32,40 38,62" fill="#00000033" />
          <rect x="30" y="40" width="4" height="22" fill="#f8fafc" />
        </>
      );
    case "t4": // hoodie
      return (
        <>
          <rect x="10" y="40" width="44" height="22" fill={color} />
          <rect x="18" y="38" width="28" height="6" fill="#00000033" />
          <rect x="31" y="44" width="2" height="10" fill="#00000055" />
        </>
      );
    case "t5": // striped
      return (
        <>
          <rect x="10" y="40" width="44" height="22" fill={color} />
          <rect x="10" y="44" width="44" height="2" fill="#ffffff88" />
          <rect x="10" y="50" width="44" height="2" fill="#ffffff88" />
          <rect x="10" y="56" width="44" height="2" fill="#ffffff88" />
        </>
      );
    default:
      return <rect x="10" y="40" width="44" height="22" fill={color} />;
  }
}

function Accessory({ kind }: { kind: string }) {
  switch (kind) {
    case "glasses":
      return (
        <>
          <rect x="24" y="25" width="6" height="5" fill="none" stroke="#111" strokeWidth="1.2" />
          <rect x="34" y="25" width="6" height="5" fill="none" stroke="#111" strokeWidth="1.2" />
          <rect x="30" y="27" width="4" height="1" fill="#111" />
        </>
      );
    case "hat":
      return (
        <>
          <rect x="16" y="10" width="32" height="4" fill="#111" />
          <rect x="20" y="6" width="24" height="6" fill="#111" />
        </>
      );
    case "headset":
      return (
        <>
          <rect x="18" y="14" width="28" height="3" fill="#111" />
          <rect x="16" y="17" width="4" height="8" fill="#111" />
          <rect x="44" y="17" width="4" height="8" fill="#111" />
        </>
      );
    default:
      return null;
  }
}
