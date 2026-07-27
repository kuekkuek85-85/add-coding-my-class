/**
 * 아바타 프리셋. 부담 없이 만들 수 있도록 SVG 부품 몇 가지를 조합하는 방식.
 */

export type Avatar = {
  hair: string; // preset id
  hairColor: string;
  top: string;
  topColor: string;
  skin: string;
  accessory: string;
};

export const HAIR_STYLES = ["h1", "h2", "h3", "h4", "h5", "h6"] as const;
export const TOP_STYLES = ["t1", "t2", "t3", "t4", "t5"] as const;
export const ACCESSORIES = ["none", "glasses", "hat", "headset"] as const;

export const HAIR_COLORS = [
  "#2b1d13", // dark brown
  "#4a2c1a", // brown
  "#8b5a2b", // chestnut
  "#c9a24a", // blonde
  "#d97706", // ginger
  "#111111", // black
  "#9ca3af", // silver
  "#7c3aed", // purple (fun)
];

export const TOP_COLORS = [
  "#2F6B4F", // chalkboard green (theme)
  "#FFC94A", // accent yellow
  "#FF6B57", // coral
  "#3b82f6", // blue
  "#1f2937", // charcoal
  "#f8fafc", // white
  "#dc2626", // red
  "#0d9488", // teal
];

export const SKIN_TONES = ["#f6d5b7", "#e6b587", "#c68d63", "#8a5a3b"];

export const DEFAULT_AVATAR: Avatar = {
  hair: "h1",
  hairColor: HAIR_COLORS[0],
  top: "t1",
  topColor: TOP_COLORS[0],
  skin: SKIN_TONES[0],
  accessory: "none",
};

export function randomAvatar(): Avatar {
  const pick = <T>(arr: readonly T[]) => arr[Math.floor(Math.random() * arr.length)];
  return {
    hair: pick(HAIR_STYLES),
    hairColor: pick(HAIR_COLORS),
    top: pick(TOP_STYLES),
    topColor: pick(TOP_COLORS),
    skin: pick(SKIN_TONES),
    accessory: pick(ACCESSORIES),
  };
}
