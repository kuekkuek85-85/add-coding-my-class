import { useState, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, Send, ImagePlus, Link as LinkIcon, Loader2, UserPlus, X, XCircle } from "lucide-react";

import {
  getMission,
  joinMission,
  submitSolution,
  acceptSolution,
  cancelMission,
  addMissionComment,
} from "@/lib/missions.functions";
import { uploadMessageImage } from "@/lib/messages.functions";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { StoredSession } from "@/lib/local-session";
import { StatusBadge, AttachmentList, LinkifiedText } from "./mission-shared";

type Attachment = { type: "image" | "link"; url: string; caption?: string | null };

function formatTime(iso: string) {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

export function MissionDetailDialog({
  session,
  missionId,
  onClose,
}: {
  session: StoredSession;
  missionId: string | null;
  onClose: () => void;
}) {
  const fetchFn = useServerFn(getMission);
  const joinFn = useServerFn(joinMission);
  const submitFn = useServerFn(submitSolution);
  const acceptFn = useServerFn(acceptSolution);
  const cancelFn = useServerFn(cancelMission);
  const commentFn = useServerFn(addMissionComment);
  const upload = useServerFn(uploadMessageImage);
  const qc = useQueryClient();

  const open = !!missionId;
  const { data } = useQuery({
    queryKey: ["mission", missionId],
    queryFn: () => fetchFn({ data: { userId: session.userId, missionId: missionId! } }),
    enabled: open,
    refetchInterval: 4_000,
  });

  const [subText, setSubText] = useState("");
  const [subAttachments, setSubAttachments] = useState<Attachment[]>([]);
  const [linkInput, setLinkInput] = useState("");
  const [commentText, setCommentText] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["mission", missionId] });
    qc.invalidateQueries({ queryKey: ["missions-list"] });
    qc.invalidateQueries({ queryKey: ["missions-overview"] });
  };

  const joinMut = useMutation({
    mutationFn: async () => {
      const res = await joinFn({ data: { userId: session.userId, missionId: missionId! } });
      if (!("ok" in res) || !res.ok) throw new Error((res as { error?: string }).error ?? "참여 실패");
    },
    onSuccess: () => { toast.success("참여했어요! 해결책을 준비해 제출하세요."); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const submitMut = useMutation({
    mutationFn: async () => {
      if (!subText.trim()) throw new Error("해결책을 입력하세요.");
      const res = await submitFn({
        data: { userId: session.userId, missionId: missionId!, text: subText.trim(), attachments: subAttachments },
      });
      if (!("ok" in res) || !res.ok) throw new Error((res as { error?: string }).error ?? "제출 실패");
    },
    onSuccess: () => {
      toast.success("해결책 제출! 의뢰자에게 알림이 갔어요.");
      setSubText(""); setSubAttachments([]);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const acceptMut = useMutation({
    mutationFn: async (helperId: string) => {
      const res = await acceptFn({ data: { userId: session.userId, missionId: missionId!, helperId } });
      if (!("ok" in res) || !res.ok) throw new Error((res as { error?: string }).error ?? "채택 실패");
    },
    onSuccess: () => { toast.success("채택했어요. 미션 종료!"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const cancelMut = useMutation({
    mutationFn: async () => {
      const res = await cancelFn({ data: { userId: session.userId, missionId: missionId! } });
      if (!("ok" in res) || !res.ok) throw new Error((res as { error?: string }).error ?? "종료 실패");
    },
    onSuccess: () => { toast("미션을 종료했어요."); invalidate(); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const commentMut = useMutation({
    mutationFn: async () => {
      if (!commentText.trim()) return;
      const res = await commentFn({ data: { userId: session.userId, missionId: missionId!, body: commentText.trim() } });
      if (!("ok" in res) || !res.ok) throw new Error((res as { error?: string }).error ?? "실패");
    },
    onSuccess: () => { setCommentText(""); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (f.size > 4 * 1024 * 1024) return toast.error("이미지는 최대 4MB");
    setBusy(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.onerror = () => reject(new Error("read fail"));
        r.readAsDataURL(f);
      });
      const res = await upload({ data: { userId: session.userId, dataUrl, filename: f.name } });
      if (!("ok" in res) || !res.ok) throw new Error((res as { error?: string }).error ?? "업로드 실패");
      setSubAttachments((a) => [...a, { type: "image", url: res.url, caption: f.name }]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "업로드 실패");
    } finally {
      setBusy(false);
    }
  }

  function addLink() {
    const url = linkInput.trim();
    if (!/^https?:\/\//i.test(url)) return toast.error("http(s) URL만");
    setSubAttachments((a) => [...a, { type: "link", url }]);
    setLinkInput("");
  }

  if (!open) return null;
  if (!data || !("ok" in data) || !data.ok) {
    return (
      <Dialog open onOpenChange={() => onClose()}>
        <DialogContent><p className="py-8 text-center text-sm text-muted-foreground">불러오는 중…</p></DialogContent>
      </Dialog>
    );
  }

  const { mission, helpers, comments, me } = data;
  const isRequester = me.id === mission.requesterId;
  const myHelper = helpers.find((h) => h.helperId === me.id);
  const isInstructor = me.role === "instructor";
  const closed = mission.status === "resolved" || mission.status === "cancelled";

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <StatusBadge status={mission.status} />
            <DialogTitle className="text-lg">{mission.title}</DialogTitle>
          </div>
          <p className="text-xs text-muted-foreground">
            의뢰: <b>{mission.requesterNickname}</b>
            {mission.requesterRole === "instructor" && " · 강사"}
            {" · "}{new Date(mission.createdAt).toLocaleString("ko-KR")}
          </p>
        </DialogHeader>

        <div className="space-y-4">
          <section className="rounded-xl border bg-card p-3">
            <p className="text-sm"><LinkifiedText text={mission.summary} /></p>
            {mission.reproSteps && (
              <div className="mt-2">
                <p className="text-xs font-semibold text-muted-foreground">재현 · 확인</p>
                <p className="text-sm"><LinkifiedText text={mission.reproSteps} /></p>
              </div>
            )}
            {mission.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {mission.tags.map((t, i) => (
                  <Badge key={i} variant="outline" className="text-xs">{t}</Badge>
                ))}
              </div>
            )}
            <AttachmentList items={mission.attachments} />
          </section>

          <section>
            <h4 className="mb-2 font-display text-sm font-bold">
              참여 헬퍼 ({helpers.length}명)
              {mission.status === "in_progress" && helpers.filter((h) => h.state === "submitted").length > 0 && (
                <span className="ml-2 text-xs text-amber-700">
                  · 제출됨 {helpers.filter((h) => h.state === "submitted").length}
                </span>
              )}
            </h4>
            {helpers.length === 0 ? (
              <p className="text-xs text-muted-foreground">아직 참여한 헬퍼가 없어요.</p>
            ) : (
              <ul className="space-y-2">
                {helpers.map((h) => {
                  const stateLabel =
                    h.state === "accepted" ? "🏆 채택됨" :
                    h.state === "submitted" ? "✅ 해결 제출" : "🖐️ 참여 중";
                  return (
                    <li key={h.helperId} className={cn(
                      "rounded-lg border p-3",
                      h.state === "accepted" && "border-emerald-400 bg-emerald-50",
                      h.state === "submitted" && "border-sky-300 bg-sky-50",
                    )}>
                      <div className="flex items-center gap-2 text-sm">
                        <b>{h.nickname}</b>
                        <span className="text-xs text-muted-foreground">{stateLabel}</span>
                        {(isRequester || isInstructor) && h.state === "submitted" && !closed && (
                          <Button size="sm" className="ml-auto h-7" onClick={() => acceptMut.mutate(h.helperId)}>
                            채택
                          </Button>
                        )}
                      </div>
                      {h.submissionText && (
                        <div className="mt-2 text-sm">
                          <LinkifiedText text={h.submissionText} />
                          <AttachmentList items={h.submissionAttachments} />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {!isRequester && !closed && (
            <section className="rounded-xl border-2 border-primary/20 bg-primary/5 p-3">
              {!myHelper ? (
                <Button onClick={() => joinMut.mutate()} disabled={joinMut.isPending} className="w-full">
                  <UserPlus className="mr-1 h-4 w-4" /> 나도 도와주기 (참여 신청)
                </Button>
              ) : myHelper.state === "accepted" ? (
                <p className="text-center text-sm font-semibold text-emerald-700">
                  🏆 채택된 해결책이에요. 고생하셨습니다!
                </p>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-primary">
                    {myHelper.state === "submitted" ? "제출한 해결책 (수정 가능)" : "해결책 제출"}
                  </p>
                  <Textarea
                    value={subText || myHelper.submissionText}
                    onChange={(e) => setSubText(e.target.value)}
                    rows={3}
                    placeholder="어떻게 해결했는지 설명해 주세요. 링크·이미지 첨부 가능."
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
                    <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={busy}>
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                    </Button>
                    <Input
                      value={linkInput}
                      onChange={(e) => setLinkInput(e.target.value)}
                      placeholder="https://..."
                      className="h-8 w-48 text-sm"
                    />
                    <Button size="sm" variant="outline" onClick={addLink}><LinkIcon className="h-4 w-4" /></Button>
                    <Button
                      onClick={() => submitMut.mutate()}
                      disabled={submitMut.isPending || !subText.trim()}
                      className="ml-auto"
                      size="sm"
                    >
                      <CheckCircle2 className="mr-1 h-4 w-4" /> 해결 제출
                    </Button>
                  </div>
                  {subAttachments.length > 0 && (
                    <ul className="flex flex-wrap gap-1 text-xs">
                      {subAttachments.map((a, i) => (
                        <li key={i} className="inline-flex items-center gap-1 rounded-full border bg-background px-2 py-0.5">
                          {a.type === "image" ? "🖼️" : "🔗"} {a.caption || a.url.slice(0, 30)}
                          <button onClick={() => setSubAttachments((p) => p.filter((_, idx) => idx !== i))}>
                            <X className="h-3 w-3" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </section>
          )}

          {(isRequester || isInstructor) && !closed && (
            <Button variant="outline" size="sm" onClick={() => cancelMut.mutate()} disabled={cancelMut.isPending}>
              <XCircle className="mr-1 h-4 w-4" /> 미션 종료 (해결됨 없이)
            </Button>
          )}

          <Separator />

          <section>
            <h4 className="mb-2 font-display text-sm font-bold">대화 ({comments.length})</h4>
            <ul className="mb-2 max-h-48 space-y-1 overflow-y-auto rounded-lg bg-muted/40 p-2">
              {comments.length === 0 && (
                <li className="text-center text-xs text-muted-foreground">대화가 없어요.</li>
              )}
              {comments.map((c) => (
                <li key={c.id} className="text-sm">
                  <b>{c.authorNickname}</b>
                  <span className="ml-1 text-[10px] text-muted-foreground">{formatTime(c.createdAt)}</span>
                  <div className="pl-1"><LinkifiedText text={c.body} /></div>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <Input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="짧은 코멘트 (Enter)"
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commentMut.mutate(); } }}
              />
              <Button size="sm" onClick={() => commentMut.mutate()} disabled={!commentText.trim() || commentMut.isPending}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
