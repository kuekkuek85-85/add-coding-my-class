import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="mt-8 border-t border-border/60 bg-background/80 py-4 text-xs text-muted-foreground">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 px-4 sm:flex-row">
        <p>© 내 수업에 코딩 한 스푼 · 심화반</p>
        <nav className="flex items-center gap-3">
          <Link to="/terms" className="hover:text-foreground hover:underline">
            이용약관
          </Link>
          <span aria-hidden>·</span>
          <Link to="/privacy" className="hover:text-foreground hover:underline">
            개인정보처리방침
          </Link>
        </nav>
      </div>
    </footer>
  );
}
