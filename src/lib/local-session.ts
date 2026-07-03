import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";

const KEY = "spoon.session.v1";

export type StoredSession = {
  userId: string;
  sessionId: string;
  nickname: string;
  role: "participant" | "instructor";
};

export function readStoredSession(): StoredSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

export function writeStoredSession(s: StoredSession) {
  window.localStorage.setItem(KEY, JSON.stringify(s));
}

export function clearStoredSession() {
  window.localStorage.removeItem(KEY);
}

/**
 * Client-only hook. Reads localStorage after mount to avoid SSR mismatch.
 * Optionally enforces a required role, redirecting elsewhere on mismatch.
 */
export function useStoredSession(options?: {
  requireRole?: "participant" | "instructor";
  redirectTo?: string;
}) {
  const navigate = useNavigate();
  const [state, setState] = useState<{ ready: boolean; session: StoredSession | null }>({
    ready: false,
    session: null,
  });

  useEffect(() => {
    const s = readStoredSession();
    setState({ ready: true, session: s });
    const requireRole = options?.requireRole;
    const redirectTo = options?.redirectTo ?? "/";
    if (requireRole) {
      if (!s || s.role !== requireRole) {
        navigate({ to: redirectTo });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return state;
}
