import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { GraduationCap } from "lucide-react";

import { enterSession } from "@/lib/session.functions";
import { readStoredSession, writeStoredSession } from "@/lib/local-session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const enter = useServerFn(enterSession);
  const [code, setCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkedStored, setCheckedStored] = useState(false);

  useEffect(() => {
    const s = readStoredSession();
    if (s) {
      navigate({ to: s.role === "instructor" ? "/instructor" : "/home" });
    } else {
      setCheckedStored(true);
    }
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || !nickname.trim()) return;
    setLoading(true);
    try {
      const res = await enter({ data: { code, nickname } });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      writeStoredSession({
        userId: res.userId,
        sessionId: res.sessionId,
        nickname: res.nickname,
        role: res.role,
      });
      toast.success(`${res.role === "instructor" ? "강사" : "참가 교사"}로 입장했습니다`);
      navigate({ to: res.role === "instructor" ? "/instructor" : "/home" });
    } catch (err) {
      console.error(err);
      toast.error("입장 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  if (!checkedStored) {
    return <div className="min-h-screen" />;
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
            <GraduationCap className="h-7 w-7" aria-hidden />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            내 수업에 코딩 한 스푼
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">심화반 연수 · 입장</p>
        </div>

        <form
          onSubmit={onSubmit}
          className="rounded-2xl border-2 border-primary/20 bg-card p-6 shadow-sm"
        >
          <div className="space-y-4">
            <div>
              <Label htmlFor="code">입장 코드</Label>
              <Input
                id="code"
                inputMode="text"
                autoComplete="off"
                autoCapitalize="characters"
                placeholder="예: SPOON1"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="mt-1.5 h-11 text-base tracking-widest uppercase"
                maxLength={20}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                강사가 알려준 코드를 입력하세요.
              </p>
            </div>
            <div>
              <Label htmlFor="nickname">닉네임</Label>
              <Input
                id="nickname"
                placeholder="예: 이승엽"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="mt-1.5 h-11 text-base"
                maxLength={20}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                실명 사용 가능. 이메일·개인정보는 수집하지 않습니다.
              </p>
            </div>
            <Button
              type="submit"
              disabled={loading || !code.trim() || !nickname.trim()}
              className="h-11 w-full text-base"
            >
              {loading ? "입장 중…" : "입장하기"}
            </Button>
          </div>
        </form>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          기기가 바뀌어도 같은 코드·닉네임으로 다시 입장하면 이어집니다.
        </p>
      </div>
    </main>
  );
}
