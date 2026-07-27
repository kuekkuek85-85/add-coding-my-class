import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MessageCircle, Send, Megaphone, X, Bug, Lightbulb, HelpCircle, Utensils, Presentation as PresentationIcon, MessageSquare, ImagePlus, Loader2 } from "lucide-react";

import {
  sendMessage,
  listMyMessages,
  listInstructorInbox,
  markMessagesRead,
  getUnreadMessageIds,
  uploadMessageImage,
} from "@/lib/messages.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { StoredSession } from "@/lib/local-session";

/** 본문 렌더러 — `![alt](url)` 는 이미지로, http(s) URL 은 하이퍼링크로 자동 변환. */
function MessageBody({ text }: { text: string }) {
  // 1) 이미지 마크다운 우선 분리
  const IMG = /!\[[^\]]*\]\((https?:\/\/[^\s)]+)\)/g;
  const URL_RE = /(https?:\/\/[^\s<]+)/g;
  const parts: Array<{ type: "text" | "image"; value: string }> = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = IMG.exec(text)) !== null) {
    if (m.index > last) parts.push({ type: "text", value: text.slice(last, m.index) });
    parts.push({ type: "image", value: m[1] });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ type: "text", value: text.slice(last) });

  return (
    <div className="space-y-1">
      {parts.map((p, i) => {
        if (p.type === "image") {
          return (
            <a key={i} href={p.value} target="_blank" rel="noreferrer" className="block">
              <img
                src={p.value}
                alt="첨부 이미지"
                className="max-h-64 max-w-full rounded-lg border object-contain"
                loading="lazy"
              />
            </a>
          );
        }
        // 텍스트 안의 URL 하이퍼링크
        const nodes: React.ReactNode[] = [];
        let lastIdx = 0;
        let mm: RegExpExecArray | null;
        const re = new RegExp(URL_RE.source, "g");
        while ((mm = re.exec(p.value)) !== null) {
          if (mm.index > lastIdx) nodes.push(p.value.slice(lastIdx, mm.index));
          const url = mm[0].replace(/[.,;!?)]+$/, "");
          const trail = mm[0].slice(url.length);
          nodes.push(
            <a
              key={`${i}-${mm.index}`}
              href={url}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2 break-all"
              onClick={(e) => e.stopPropagation()}
            >
              {url}
            </a>,
          );
          if (trail) nodes.push(trail);
          lastIdx = mm.index + mm[0].length;
        }
        if (lastIdx < p.value.length) nodes.push(p.value.slice(lastIdx));
        return (
          <div key={i} className="whitespace-pre-wrap break-words">
            {nodes.length ? nodes : p.value}
          </div>
        );
      })}
    </div>
  );
}

/** 이미지 첨부 버튼 — 클릭 시 파일 선택 → base64 로 읽어 콜백에 넘김. */
function ImageAttachButton({
  session,
  onAttached,
}: {
  session: StoredSession;
  onAttached: (url: string) => void;
}) {
  const upload = useServerFn(uploadMessageImage);
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const pick = () => inputRef.current?.click();
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("이미지 파일만 첨부할 수 있어요.");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      toast.error("이미지는 최대 4MB 까지 첨부할 수 있어요.");
      return;
    }
    setBusy(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.onerror = () => reject(new Error("파일을 읽지 못했어요."));
        r.readAsDataURL(file);
      });
      const res = await upload({ data: { userId: session.userId, dataUrl, filename: file.name } });
      if (!("ok" in res) || !res.ok) throw new Error((res as { error?: string }).error ?? "업로드 실패");
      onAttached(res.url);
      toast.success("이미지를 첨부했어요.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "업로드 실패");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={onFile} />
      <Button
        type="button"
        onClick={pick}
        disabled={busy}
        size="sm"
        variant="outline"
        className="h-10 w-10 shrink-0 p-0"
        aria-label="이미지 첨부"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
      </Button>
    </>
  );
}


type MessageRow = {
  id: string;
  sender_id: string;
  sender_role: "participant" | "instructor";
  recipient_id: string | null;
  kind: "direct" | "broadcast";
  category: string;
  body: string;
  created_at: string;
};

type Member = { id: string; nickname: string; avatar?: unknown };

const CATEGORY_LABEL: Record<string, string> = {
  suggestion: "건의",
  bug: "오류",
  question: "질문",
  meal: "식사",
  presentation: "발표",
  general: "일반",
};

function CategoryIcon({ category, className }: { category: string; className?: string }) {
  const cls = cn("h-3.5 w-3.5", className);
  switch (category) {
    case "suggestion": return <Lightbulb className={cls} />;
    case "bug": return <Bug className={cls} />;
    case "question": return <HelpCircle className={cls} />;
    case "meal": return <Utensils className={cls} />;
    case "presentation": return <PresentationIcon className={cls} />;
    default: return <MessageSquare className={cls} />;
  }
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

export function MessageCenter({ session }: { session: StoredSession }) {
  const [open, setOpen] = useState(false);
  const isInstructor = session.role === "instructor";
  return (
    <>
      <MessageBell session={session} open={open} onOpen={() => setOpen(true)} />
      {open ? (
        isInstructor ? (
          <InstructorPanel session={session} onClose={() => setOpen(false)} />
        ) : (
          <ParticipantPanel session={session} onClose={() => setOpen(false)} />
        )
      ) : null}
    </>
  );
}

/** 안읽음 감지 + 팝업 토스트 + FAB */
function MessageBell({
  session,
  open,
  onOpen,
}: {
  session: StoredSession;
  open: boolean;
  onOpen: () => void;
}) {
  const fetchUnread = useServerFn(getUnreadMessageIds);
  const seenRef = useRef<Set<string> | null>(null);
  const bootedRef = useRef(false);
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["messages-unread", session.userId],
    queryFn: () => fetchUnread({ data: { userId: session.userId } }),
    refetchInterval: 5_000,
  });

  const unreadIds = useMemo(
    () => (data?.ok ? data.unread : []),
    [data],
  );

  // 신규 도착 시 토스트
  useEffect(() => {
    if (!data?.ok) return;
    const current = new Set(unreadIds);
    if (!bootedRef.current) {
      seenRef.current = current;
      bootedRef.current = true;
      return;
    }
    const prev = seenRef.current ?? new Set<string>();
    const newIds = unreadIds.filter((id) => !prev.has(id));
    if (newIds.length > 0 && !open) {
      // 최신 메시지 내용 가져오기 (참가자용/강사용 스레드 캐시에서)
      const cachedParticipant = qc.getQueryData<{ ok: boolean; messages: MessageRow[] }>(["messages-me", session.userId]);
      const cachedInstructor = qc.getQueryData<{ ok: boolean; messages: MessageRow[]; members: Member[] }>(["messages-inbox", session.userId]);
      const allMsgs: MessageRow[] = [
        ...(cachedParticipant?.messages ?? []),
        ...(cachedInstructor?.messages ?? []),
      ];
      newIds.forEach((id) => {
        const m = allMsgs.find((x) => x.id === id);
        const label = m?.kind === "broadcast" ? "📢 전체 공지" : "새 메시지";
        toast(label, {
          description: m?.body?.slice(0, 100) ?? "메시지가 도착했습니다.",
          position: "bottom-right",
          duration: 5000,
          className: m?.kind === "broadcast" ? "border-amber-400" : undefined,
          action: {
            label: "열기",
            onClick: () => onOpen(),
          },
        });
      });
    }
    seenRef.current = current;
  }, [unreadIds, data, open, onOpen, qc, session.userId]);

  const count = unreadIds.length;
  if (open) return null;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="fixed bottom-4 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition hover:scale-105 hover:shadow-xl"
      aria-label="메시지 열기"
    >
      <MessageCircle className="h-6 w-6" />
      {count > 0 ? (
        <span className="absolute -right-1 -top-1 flex h-6 min-w-[24px] items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white shadow">
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </button>
  );
}

/* ============================== 참가자 패널 ============================== */
function ParticipantPanel({ session, onClose }: { session: StoredSession; onClose: () => void }) {
  const fetchList = useServerFn(listMyMessages);
  const send = useServerFn(sendMessage);
  const markRead = useServerFn(markMessagesRead);
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["messages-me", session.userId],
    queryFn: () => fetchList({ data: { userId: session.userId } }),
    refetchInterval: 5_000,
  });

  const messages: MessageRow[] = data?.ok ? (data.messages as MessageRow[]) : [];

  // 열릴 때, 그리고 새 메시지 도착 시 자동 read
  useEffect(() => {
    const ids = messages.filter((m) => m.sender_id !== session.userId).map((m) => m.id);
    if (ids.length === 0) return;
    markRead({ data: { userId: session.userId, messageIds: ids } }).then(() => {
      qc.invalidateQueries({ queryKey: ["messages-unread", session.userId] });
    });
  }, [messages, session.userId, markRead, qc]);

  const [body, setBody] = useState("");
  const [category, setCategory] = useState<string>("question");

  const sendMut = useMutation({
    mutationFn: async () => {
      const trimmed = body.trim();
      if (!trimmed) throw new Error("내용을 입력하세요.");
      const res = await send({
        data: { userId: session.userId, body: trimmed, category, kind: "direct" },
      });
      if (!("ok" in res) || !res.ok) throw new Error((res as { error?: string }).error ?? "전송 실패");
    },
    onSuccess: () => {
      setBody("");
      qc.invalidateQueries({ queryKey: ["messages-me", session.userId] });
      toast.success("강사에게 전송했어요.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  return (
    <PanelShell title="강사와 메시지" onClose={onClose}>
      <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
        {messages.length === 0 ? (
          <p className="mt-8 text-center text-sm text-muted-foreground">
            아직 주고받은 메시지가 없어요.<br />궁금한 점·건의·오류를 강사에게 남겨보세요.
          </p>
        ) : null}
        {messages.map((m) => {
          const mine = m.sender_id === session.userId;
          const isBroadcast = m.kind === "broadcast";
          return (
            <div
              key={m.id}
              className={cn("flex", mine ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm",
                  mine
                    ? "bg-primary text-primary-foreground"
                    : isBroadcast
                      ? "border border-amber-300 bg-amber-50 text-amber-900"
                      : "bg-muted text-foreground",
                )}
              >
                {isBroadcast ? (
                  <div className="mb-1 flex items-center gap-1 text-xs font-semibold text-amber-700">
                    <Megaphone className="h-3.5 w-3.5" /> 전체 공지
                  </div>
                ) : !mine ? (
                  <div className="mb-1 text-xs font-semibold opacity-70">강사</div>
                ) : null}
                <MessageBody text={m.body} />
                <div className="mt-1 flex items-center gap-1 text-[10px] opacity-70">
                  {!isBroadcast && !mine ? null : (
                    <span className="inline-flex items-center gap-0.5">
                      <CategoryIcon category={m.category} />
                      {CATEGORY_LABEL[m.category] ?? "일반"}
                    </span>
                  )}
                  <span className="ml-auto">{formatTime(m.created_at)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="border-t bg-background p-3">
        <div className="mb-2 flex items-center gap-2">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-8 w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="question">질문</SelectItem>
              <SelectItem value="suggestion">건의</SelectItem>
              <SelectItem value="bug">오류 제보</SelectItem>
              <SelectItem value="general">일반</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">강사에게만 보입니다.</span>
        </div>
        <div className="flex items-end gap-2">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="메시지를 입력하세요 (Ctrl+Enter 전송)"
            rows={2}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                sendMut.mutate();
              }
            }}
            className="min-h-[56px] flex-1 resize-none"
          />
          <Button
            onClick={() => sendMut.mutate()}
            disabled={sendMut.isPending || !body.trim()}
            size="sm"
            className="h-10"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </PanelShell>
  );
}

/* ============================== 강사 패널 ============================== */
function InstructorPanel({ session, onClose }: { session: StoredSession; onClose: () => void }) {
  const fetchInbox = useServerFn(listInstructorInbox);
  const send = useServerFn(sendMessage);
  const markRead = useServerFn(markMessagesRead);
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["messages-inbox", session.userId],
    queryFn: () => fetchInbox({ data: { userId: session.userId } }),
    refetchInterval: 5_000,
  });

  const members: Member[] = data?.ok ? data.members : [];
  const messages: MessageRow[] = data?.ok ? (data.messages as MessageRow[]) : [];

  const [selected, setSelected] = useState<string | "broadcast">("broadcast");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<string>("general");

  // 스레드별 그룹
  const threadOf = (memberId: string) =>
    messages.filter(
      (m) =>
        m.kind === "direct" &&
        ((m.sender_id === memberId && m.recipient_id === session.userId) ||
          (m.sender_id === session.userId && m.recipient_id === memberId)),
    );
  const broadcasts = messages.filter((m) => m.kind === "broadcast");

  const unreadPerMember = useMemo(() => {
    const map = new Map<string, number>();
    // 참가자가 보낸 메시지 중, 강사가 아직 읽지 않았을 수 있는 것 — 서버 unread 로도 반영되지만 UI 배지는 세션 로컬 read set 근사
    return map;
  }, []);

  // 자동 read (열린 스레드 것)
  useEffect(() => {
    let visibleIds: string[] = [];
    if (selected === "broadcast") {
      visibleIds = broadcasts.filter((m) => m.sender_id !== session.userId).map((m) => m.id);
    } else {
      visibleIds = threadOf(selected)
        .filter((m) => m.sender_id !== session.userId)
        .map((m) => m.id);
    }
    if (visibleIds.length === 0) return;
    markRead({ data: { userId: session.userId, messageIds: visibleIds } }).then(() => {
      qc.invalidateQueries({ queryKey: ["messages-unread", session.userId] });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, messages.length]);

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [selected, messages.length]);

  const sendMut = useMutation({
    mutationFn: async () => {
      const trimmed = body.trim();
      if (!trimmed) throw new Error("내용을 입력하세요.");
      const payload =
        selected === "broadcast"
          ? { userId: session.userId, body: trimmed, category, kind: "broadcast" as const, recipientId: null }
          : { userId: session.userId, body: trimmed, category, kind: "direct" as const, recipientId: selected };
      const res = await send({ data: payload });
      if (!("ok" in res) || !res.ok) throw new Error((res as { error?: string }).error ?? "전송 실패");
    },
    onSuccess: () => {
      setBody("");
      qc.invalidateQueries({ queryKey: ["messages-inbox", session.userId] });
      toast.success(selected === "broadcast" ? "전체 공지를 발송했어요." : "답장을 보냈어요.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const activeMessages =
    selected === "broadcast" ? broadcasts : threadOf(selected);
  const activeMemberName =
    selected === "broadcast"
      ? "전체 공지"
      : members.find((m) => m.id === selected)?.nickname ?? "참가자";

  return (
    <PanelShell title="메시지함" onClose={onClose} wide>
      <div className="flex flex-1 overflow-hidden">
        {/* 좌측 스레드 리스트 */}
        <div className="w-48 shrink-0 overflow-y-auto border-r bg-muted/30">
          <button
            type="button"
            onClick={() => setSelected("broadcast")}
            className={cn(
              "flex w-full items-center gap-2 border-b px-3 py-2 text-left text-sm",
              selected === "broadcast" ? "bg-background font-semibold" : "hover:bg-background/60",
            )}
          >
            <Megaphone className="h-4 w-4 text-amber-600" />
            전체 공지
            <Badge variant="secondary" className="ml-auto">{broadcasts.length}</Badge>
          </button>
          {members.map((m) => {
            const t = threadOf(m.id);
            const last = t[t.length - 1];
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelected(m.id)}
                className={cn(
                  "flex w-full flex-col items-start gap-0.5 border-b px-3 py-2 text-left text-sm",
                  selected === m.id ? "bg-background font-semibold" : "hover:bg-background/60",
                )}
              >
                <span className="flex w-full items-center gap-2">
                  {m.nickname}
                  {t.length > 0 ? (
                    <Badge variant="secondary" className="ml-auto text-[10px]">{t.length}</Badge>
                  ) : null}
                </span>
                {last ? (
                  <span className="line-clamp-1 text-xs font-normal text-muted-foreground">
                    {last.sender_id === session.userId ? "나: " : ""}{last.body}
                  </span>
                ) : (
                  <span className="text-xs font-normal text-muted-foreground/70">대화 없음</span>
                )}
              </button>
            );
          })}
        </div>

        {/* 우측 대화창 */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="border-b bg-background px-3 py-2 text-sm font-semibold">
            {activeMemberName}
            {selected === "broadcast" ? (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                모든 참가자에게 즉시 발송됩니다.
              </span>
            ) : null}
          </div>
          <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
            {activeMessages.length === 0 ? (
              <p className="mt-8 text-center text-sm text-muted-foreground">
                {selected === "broadcast" ? "아직 발송한 공지가 없어요." : "아직 대화가 없어요."}
              </p>
            ) : null}
            {activeMessages.map((m) => {
              const mine = m.sender_id === session.userId;
              return (
                <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm",
                      mine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
                    )}
                  >
                    <div className="mb-1 flex items-center gap-1 text-[10px] opacity-70">
                      <CategoryIcon category={m.category} />
                      {CATEGORY_LABEL[m.category] ?? "일반"}
                    </div>
                    <MessageBody text={m.body} />
                    <div className="mt-1 text-right text-[10px] opacity-70">{formatTime(m.created_at)}</div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="border-t bg-background p-3">
            <div className="mb-2 flex items-center gap-2">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-8 w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">일반</SelectItem>
                  <SelectItem value="meal">식사</SelectItem>
                  <SelectItem value="presentation">발표</SelectItem>
                  <SelectItem value="question">질문</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground">
                {selected === "broadcast" ? "전체 참가자에게 알림 팝업으로 표시됩니다." : "선택한 참가자에게만 전달됩니다."}
              </span>
            </div>
            <div className="flex items-end gap-2">
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={
                  selected === "broadcast"
                    ? "예: 점심은 3층 식당에서 12:30까지 진행합니다."
                    : "답장을 입력하세요 (Ctrl+Enter 전송)"
                }
                rows={2}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    sendMut.mutate();
                  }
                }}
                className="min-h-[56px] flex-1 resize-none"
              />
              <Button
                onClick={() => sendMut.mutate()}
                disabled={sendMut.isPending || !body.trim()}
                size="sm"
                className={cn("h-10", selected === "broadcast" && "bg-amber-500 hover:bg-amber-600")}
              >
                {selected === "broadcast" ? <Megaphone className="h-4 w-4" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </PanelShell>
  );
}

function PanelShell({
  title,
  children,
  onClose,
  wide,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-40 flex flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl",
        wide ? "h-[70vh] max-h-[640px] w-[min(760px,calc(100vw-2rem))]" : "h-[70vh] max-h-[560px] w-[min(400px,calc(100vw-2rem))]",
      )}
    >
      <div className="flex items-center justify-between border-b bg-primary px-4 py-2 text-primary-foreground">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <MessageCircle className="h-4 w-4" />
          {title}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 hover:bg-white/10"
          aria-label="닫기"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {children}
    </div>
  );
}
