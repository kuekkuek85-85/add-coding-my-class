import { createContext, useContext, type ReactNode } from "react";

export type SlideTheme = "default" | "bamti";

const SlideThemeContext = createContext<SlideTheme>("default");

export function SlideThemeProvider({
  theme,
  children,
}: {
  theme: SlideTheme;
  children: ReactNode;
}) {
  return (
    <SlideThemeContext.Provider value={theme}>{children}</SlideThemeContext.Provider>
  );
}

export function useSlideTheme(): SlideTheme {
  return useContext(SlideThemeContext);
}

/**
 * 세션 정보(참가자 코드 / 이름)에서 슬라이드 테마를 계산한다.
 * 7기 세션(SPOON7... 또는 이름에 "7기" 포함) → 보노보노 밤티 테마.
 */
export function themeFromSession(session?: {
  participant_code?: string | null;
  name?: string | null;
} | null): SlideTheme {
  if (!session) return "default";
  const code = (session.participant_code ?? "").toUpperCase();
  const name = session.name ?? "";
  if (code.startsWith("SPOON7") || /(^|[^\d])7기/.test(name)) return "bamti";
  return "default";
}
