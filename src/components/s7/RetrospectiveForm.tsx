import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Save, CheckCircle2, Lock } from "lucide-react";

import { getMyRetrospective, saveMyRetrospective } from "@/lib/s7.functions";
import { Button } from "@/components/ui/button";

export function RetrospectiveForm({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const fetchRetro = useServerFn(getMyRetrospective);
  const saveRetro = useServerFn(saveMyRetrospective);

  const key = ["s7-retro", userId];
  const { data } = useQuery({
    queryKey: key,
    queryFn: () => fetchRetro({ data: { userId } }),
    refetchInterval: 20_000,
  });

  const [learned, setLearned] = useState("");
  const [nextTry, setNextTry] = useState("");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (data?.ok && data.retro && !dirty) {
      setLearned(data.retro.learned ?? "");
      setNextTry(data.retro.next_try ?? "");
    }
  }, [data, dirty]);

  const closed = data?.ok ? data.closed : false;

  const mut = useMutation({
    mutationFn: () =>
      saveRetro({ data: { userId, learned: learned.trim(), nextTry: nextTry.trim() } }),
    onSuccess: (res) => {
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("회고가 저장되었습니다.");
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: key });
      queryClient.invalidateQueries({ queryKey: ["s7-completion", userId] });
      queryClient.invalidateQueries({ queryKey: ["s7-portfolio", userId] });
    },
    onError: () => toast.error("저장 중 오류가 발생했습니다."),
  });

  const learnedLen = learned.trim().length;
  const canSubmit = learnedLen >= 10 && !closed && !mut.isPending;

  return (
    <div className="rounded-2xl border-2 border-primary/20 bg-card p-5 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-base font-bold text-foreground">
          오늘의 회고
        </h2>
        {data?.ok && data.retro?.submitted_at && (
          <span className="inline-flex items-center gap-1 text-xs text-primary">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
            제출 완료 · {new Date(data.retro.submitted_at).toLocaleString("ko-KR")}
          </span>
        )}
      </div>

      <div className="space-y-4">
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-foreground">
            오늘 배운 것 <span className="text-rose-600">*</span>
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              10자 이상 (현재 {learnedLen}자)
            </span>
          </span>
          <textarea
            className="min-h-[80px] w-full resize-y rounded-lg border-2 border-primary/20 bg-background p-3 text-sm outline-none focus:border-primary disabled:cursor-not-allowed disabled:bg-muted"
            placeholder="예: 프롬프트에 '입력 형식'을 붙이면 결과가 훨씬 안정적이라는 걸 배웠어요."
            value={learned}
            maxLength={500}
            disabled={closed}
            onChange={(e) => {
              setLearned(e.target.value);
              setDirty(true);
            }}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-foreground">
            다음 수업에 시도할 것
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              선택
            </span>
          </span>
          <textarea
            className="min-h-[60px] w-full resize-y rounded-lg border-2 border-primary/20 bg-background p-3 text-sm outline-none focus:border-primary disabled:cursor-not-allowed disabled:bg-muted"
            placeholder="예: 3학년 서술형 채점 루브릭 프롬프트에 오늘 배운 예시 3개 붙여 다시 돌려보기."
            value={nextTry}
            maxLength={500}
            disabled={closed}
            onChange={(e) => {
              setNextTry(e.target.value);
              setDirty(true);
            }}
          />
        </label>

        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            AI는 회고를 대신 쓰지 않습니다. 짧아도 좋으니 직접 남겨 주세요.
          </p>
          {closed ? (
            <span className="inline-flex items-center gap-1 text-xs text-amber-700">
              <Lock className="h-3.5 w-3.5" aria-hidden />
              연수 종료 — 편집 잠금
            </span>
          ) : (
            <Button
              type="button"
              size="sm"
              onClick={() => mut.mutate()}
              disabled={!canSubmit}
            >
              <Save className="mr-1 h-3.5 w-3.5" aria-hidden />
              회고 저장
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
