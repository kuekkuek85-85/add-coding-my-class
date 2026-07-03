import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, MessageCircle, Mic, Send, Timer } from "lucide-react";

import {
  getPresentationState,
  getPresenterComments,
  submitComment,
} from "@/lib/s6.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { SlidePreview } from "@/components/s6/SlidePreview";

export function PresentationStage({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const fetchState = useServerFn(getPresentationState);
  const submit = useServerFn(submitComment);

  const stateKey = ["s6-presentation", userId];
  const { data: state } = useQuery({
    queryKey: stateKey,
    queryFn: () => fetchState({ data: { userId } }),
    refetchInterval: 3_000,
  });

  const [good, setGood] = useState("");
  const [question, setQuestion] = useState("");
  const submitMut = useMutation({
    mutationFn: (presenterId: string) =>
      submit({ data: { userId, presenterId, good, question } }),
    onSuccess: (res) => {
      if (!res.ok) return toast.error(res.error);
      toast.success("좋은 점을 전달했어요.");
      setGood("");
      setQuestion("");
      qc.invalidateQueries({ queryKey: ["s6-presenter-comments"] });
    },
  });

  if (!state?.ok)
    return (
      <div className="rounded-2xl border-2 border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
        발표 진행 정보를 불러오는 중…
      </div>
    );

  const current = state.current;
  const isMe = current?.userId === userId;

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border-2 border-primary/25 bg-card p-4 shadow-sm">
        <div className="flex items-center gap-2 text-primary">
          <Mic className="h-4 w-4" aria-hidden />
          <h3 className="font-display text-sm font-bold">지금 발표 중</h3>
        </div>
        {current ? (
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-lg font-semibold text-foreground">
              {isMe ? `${current.nickname} (나)` : current.nickname}
            </p>
            {state.timerStartedAt && <TimerBadge startedAt={state.timerStartedAt} />}
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            아직 발표가 시작되지 않았어요. 강사의 안내를 기다려 주세요.
          </p>
        )}
      </div>
      {current && state.currentDeck && (
        <SlideDeckViewer
          title={state.currentDeck.title}
          slides={state.currentDeck.slides}
          presenterName={current.nickname}
        />
      )}


      {state.queue.length > 0 && (
        <div className="rounded-2xl border-2 border-primary/15 bg-card p-4 shadow-sm">
          <h4 className="mb-2 text-xs font-semibold text-muted-foreground">발표 순서</h4>
          <ol className="flex flex-wrap gap-1.5">
            {state.queue.map((q) => (
              <li
                key={q.userId}
                className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${
                  q.state === "current"
                    ? "bg-primary text-primary-foreground"
                    : q.state === "done"
                      ? "bg-accent/40 text-primary"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {q.orderIndex}. {q.nickname}
              </li>
            ))}
          </ol>
        </div>
      )}

      {current && !isMe && (
        <div className="rounded-2xl border-2 border-primary/20 bg-card p-4 shadow-sm">
          <div className="mb-2 flex items-center gap-2 text-primary">
            <MessageCircle className="h-4 w-4" aria-hidden />
            <h4 className="font-display text-sm font-bold">
              {current.nickname} 님에게 코멘트
            </h4>
          </div>
          <Label htmlFor="good" className="text-xs">
            좋은 점 <span className="text-rose-600">*</span> (필수, 5자 이상)
          </Label>
          <Textarea
            id="good"
            value={good}
            onChange={(e) => setGood(e.target.value)}
            placeholder="예: 문제 정의가 아주 명확했어요"
            rows={3}
            maxLength={1000}
            className="mt-1"
          />
          <Label htmlFor="question" className="mt-3 text-xs">
            질문/제안 (선택)
          </Label>
          <Textarea
            id="question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="더 궁금한 점이나 아이디어를 남겨주세요"
            rows={2}
            maxLength={1000}
            className="mt-1"
          />
          <Button
            type="button"
            className="mt-3 gap-1.5"
            disabled={good.trim().length < 5 || submitMut.isPending}
            onClick={() => submitMut.mutate(current.userId)}
          >
            <Send className="h-4 w-4" aria-hidden />
            {submitMut.isPending ? "보내는 중…" : "코멘트 보내기"}
          </Button>
        </div>
      )}

      {isMe && current && <ReceivedComments userId={userId} presenterId={current.userId} />}
    </div>
  );
}

function TimerBadge({ startedAt }: { startedAt: string }) {
  const start = new Date(startedAt).getTime();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(t);
  }, []);
  const secs = Math.max(0, Math.floor((now - start) / 1000));
  const mm = String(Math.floor(secs / 60)).padStart(2, "0");
  const ss = String(secs % 60).padStart(2, "0");
  const over = secs > 180;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
        over ? "bg-rose-100 text-rose-800" : "bg-primary/10 text-primary"
      }`}
    >
      <Timer className="h-3 w-3" aria-hidden />
      {mm}:{ss}
    </span>
  );
}

function ReceivedComments({
  userId,
  presenterId,
}: {
  userId: string;
  presenterId: string;
}) {
  const fetchComments = useServerFn(getPresenterComments);
  const { data } = useQuery({
    queryKey: ["s6-presenter-comments", presenterId],
    queryFn: () => fetchComments({ data: { userId, presenterId } }),
    refetchInterval: 3_000,
  });
  const comments = data?.ok ? data.comments : [];
  return (
    <div className="rounded-2xl border-2 border-primary/20 bg-card p-4 shadow-sm">
      <h4 className="mb-2 font-display text-sm font-bold text-primary">
        방금 받은 코멘트 · {comments.length}건
      </h4>
      {comments.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          청중이 코멘트를 보내면 여기 실시간으로 뜹니다.
        </p>
      ) : (
        <ul className="space-y-2">
          {comments.map((c) => (
            <li
              key={c.id}
              className="rounded-lg border border-primary/10 bg-muted/30 p-2 text-xs"
            >
              <p className="font-semibold text-primary">{c.commenterNickname}</p>
              <p className="mt-0.5 whitespace-pre-wrap text-foreground/90">
                <b>좋은 점: </b>
                {c.good}
              </p>
              {c.question && (
                <p className="mt-0.5 whitespace-pre-wrap text-foreground/80">
                  <b>질문/제안: </b>
                  {c.question}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SlideDeckViewer({
  title,
  slides,
  presenterName,
}: {
  title: string;
  slides: Array<{ heading: string; body: string }>;
  presenterName: string;
}) {
  const [index, setIndex] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 640, h: 360 });

  useEffect(() => {
    setIndex(0);
  }, [title, presenterName, slides.length]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      setSize({ w, h: Math.round((w * 9) / 16) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (slides.length === 0) return null;
  const total = slides.length;
  const clamped = Math.min(Math.max(index, 0), total - 1);
  const s = slides[clamped]!;
  const isCover = clamped === 0;

  return (
    <div className="rounded-2xl border-2 border-primary/25 bg-card p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-2 px-1">
        <p className="truncate font-display text-sm font-bold text-primary">
          {title}
        </p>
        <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
          {clamped + 1} / {total}
        </span>
      </div>
      <div ref={wrapRef} className="w-full">
        <SlidePreview
          heading={s.heading}
          body={s.body}
          page={clamped + 1}
          total={total}
          presenterName={presenterName}
          width={size.w}
          height={size.h}
          variant={isCover ? "cover" : "default"}
        />
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={clamped === 0}
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          aria-label="이전 슬라이드"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden /> 이전
        </Button>
        <div className="flex flex-wrap items-center justify-center gap-1">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`슬라이드 ${i + 1}`}
              className={`h-2.5 w-2.5 rounded-full transition-all ${
                i === clamped
                  ? "scale-125 bg-primary"
                  : "bg-primary/25 hover:bg-primary/50"
              }`}
            />
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={clamped >= total - 1}
          onClick={() => setIndex((i) => Math.min(total - 1, i + 1))}
          aria-label="다음 슬라이드"
        >
          다음 <ChevronRight className="h-4 w-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}
