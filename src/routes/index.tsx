import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { GraduationCap, ChevronLeft } from "lucide-react";

import { enterSession, getOccupiedSeats, checkExistingUser } from "@/lib/session.functions";
import { readStoredSession, writeStoredSession } from "@/lib/local-session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AvatarBuilder } from "@/components/avatar/AvatarBuilder";
import { SeatPicker } from "@/components/office/SeatPicker";
import { DEFAULT_AVATAR, type Avatar, randomAvatar } from "@/lib/avatar-presets";

export const Route = createFileRoute("/")({
  component: LoginPage,
});

type Step = "join" | "avatar" | "seat";

function LoginPage() {
  const navigate = useNavigate();
  const enter = useServerFn(enterSession);
  const fetchSeats = useServerFn(getOccupiedSeats);
  const checkExisting = useServerFn(checkExistingUser);

  const [step, setStep] = useState<Step>("join");
  const [code, setCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [avatar, setAvatar] = useState<Avatar>(DEFAULT_AVATAR);
  const [seatId, setSeatId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkedStored, setCheckedStored] = useState(false);
  const [isInstructor, setIsInstructor] = useState(false);

  useEffect(() => {
    const s = readStoredSession();
    if (s) {
      navigate({ to: s.role === "instructor" ? "/instructor" : "/home" });
    } else {
      setAvatar(randomAvatar());
      setCheckedStored(true);
    }
  }, [navigate]);

  const { data: seatData } = useQuery({
    queryKey: ["occupied-seats", code],
    queryFn: () => fetchSeats({ data: { code } }),
    enabled: step === "seat" && !!code.trim() && !isInstructor,
    refetchInterval: 3_000,
  });
  const occupied = new Map<string, string>();
  if (seatData?.ok) {
    for (const s of seatData.seats) occupied.set(s.seatId, s.nickname);
  }

  async function submitFinal(finalSeatId: string | null) {
    setLoading(true);
    try {
      const res = await enter({
        data: { code, nickname, avatar, seatId: finalSeatId },
      });
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

  async function onJoinContinue(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || !nickname.trim()) return;
    const looksInstructor = code.trim().toUpperCase().startsWith("TEACHER");
    setIsInstructor(looksInstructor);
    // 재입장 감지: 이미 등록된 닉네임이면 아바타·자리 단계 건너뛰기
    setLoading(true);
    try {
      const chk = await checkExisting({ data: { code, nickname } });
      if (chk.ok && chk.exists) {
        await submitFinal(null);
        return;
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
    setStep("avatar");
  }

  function onAvatarContinue() {
    if (isInstructor) {
      void submitFinal(null); // server assigns instructor-desk
    } else {
      setStep("seat");
    }
  }

  if (!checkedStored) return <div className="min-h-screen" />;

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
            <GraduationCap className="h-7 w-7" aria-hidden />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            내 수업에 코딩 한 스푼
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">심화반 연수 · 입장</p>
        </div>

        <Stepper step={step} isInstructor={isInstructor} />

        {step === "join" && (
          <form
            onSubmit={onJoinContinue}
            className="mt-4 rounded-2xl border-2 border-primary/20 bg-card p-6 shadow-sm"
          >
            <div className="space-y-4">
              <div>
                <Label htmlFor="code">입장 코드</Label>
                <Input
                  id="code"
                  autoComplete="off"
                  autoCapitalize="characters"
                  placeholder="예: SPOON7"
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
                disabled={!code.trim() || !nickname.trim()}
                className="h-11 w-full text-base"
              >
                다음: 아바타 꾸미기
              </Button>
            </div>
          </form>
        )}

        {step === "avatar" && (
          <div className="mt-4 rounded-2xl border-2 border-primary/20 bg-card p-6 shadow-sm">
            <p className="mb-4 text-sm text-muted-foreground">
              나를 표현할 아바타를 골라 주세요. 사무실 대시보드에 이 모습으로 표시됩니다.
            </p>
            <AvatarBuilder value={avatar} onChange={setAvatar} />
            <div className="mt-6 flex items-center justify-between gap-2">
              <Button variant="ghost" onClick={() => setStep("join")}>
                <ChevronLeft className="mr-1 h-4 w-4" /> 뒤로
              </Button>
              <Button onClick={onAvatarContinue} disabled={loading}>
                {isInstructor
                  ? loading
                    ? "입장 중…"
                    : "강사석으로 입장"
                  : "다음: 자리 고르기"}
              </Button>
            </div>
          </div>
        )}

        {step === "seat" && (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              앉을 자리를 선택하세요. 이미 사용 중인 자리는 회색으로 표시됩니다.
            </p>
            <SeatPicker
              occupied={occupied}
              selected={seatId}
              onSelect={setSeatId}
              myNickname={nickname}
            />
            <div className="flex items-center justify-between gap-2">
              <Button variant="ghost" onClick={() => setStep("avatar")}>
                <ChevronLeft className="mr-1 h-4 w-4" /> 뒤로
              </Button>
              <Button
                onClick={() => submitFinal(seatId)}
                disabled={!seatId || loading}
              >
                {loading ? "입장 중…" : seatId ? "이 자리로 입장" : "자리를 선택하세요"}
              </Button>
            </div>
          </div>
        )}

        <p className="mt-4 text-center text-xs text-muted-foreground">
          기기가 바뀌어도 같은 코드·닉네임으로 다시 입장하면 이어집니다.
        </p>
      </div>
    </main>
  );
}

function Stepper({ step, isInstructor }: { step: Step; isInstructor: boolean }) {
  const steps = isInstructor
    ? [
        { key: "join", label: "입장" },
        { key: "avatar", label: "아바타" },
      ]
    : [
        { key: "join", label: "입장" },
        { key: "avatar", label: "아바타" },
        { key: "seat", label: "자리" },
      ];
  return (
    <div className="flex items-center justify-center gap-2">
      {steps.map((s, i) => {
        const active = s.key === step;
        const done = steps.findIndex((x) => x.key === step) > i;
        return (
          <div key={s.key} className="flex items-center gap-2">
            <div
              className={
                "flex h-7 items-center gap-1 rounded-full px-3 text-xs font-semibold " +
                (active
                  ? "bg-primary text-primary-foreground"
                  : done
                    ? "bg-primary/15 text-primary"
                    : "bg-muted text-muted-foreground")
              }
            >
              {i + 1}. {s.label}
            </div>
            {i < steps.length - 1 && <span className="text-muted-foreground">›</span>}
          </div>
        );
      })}
    </div>
  );
}
