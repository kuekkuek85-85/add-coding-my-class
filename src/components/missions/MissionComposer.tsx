import { useState, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Sparkles, ImagePlus, Link as LinkIcon, X, Loader2, Send } from "lucide-react";

import { structureMissionDraft, createMission } from "@/lib/missions.functions";
import { uploadMessageImage } from "@/lib/messages.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import type { StoredSession } from "@/lib/local-session";

type Attachment = { type: "image" | "link"; url: string; caption?: string | null };

export function MissionComposer({
  session,
  open,
  onOpenChange,
  defaultRaw,
}: {
  session: StoredSession;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultRaw?: string;
}) {
  const structure = useServerFn(structureMissionDraft);
  const create = useServerFn(createMission);
  const upload = useServerFn(uploadMessageImage);
  const qc = useQueryClient();

  const [raw, setRaw] = useState(defaultRaw ?? "");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [linkInput, setLinkInput] = useState("");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [reproSteps, setReproSteps] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [structured, setStructured] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() {
    setRaw(""); setAttachments([]); setLinkInput("");
    setTitle(""); setSummary(""); setReproSteps(""); setTags([]); setTagInput("");
    setStructured(false);
  }

  const structureMut = useMutation({
    mutationFn: async () => {
      const res = await structure({
        data: { userId: session.userId, rawText: raw.trim(), attachments },
      });
      if (!("ok" in res) || !res.ok) throw new Error((res as { error?: string }).error ?? "AI 정리 실패");
      return res.draft;
    },
    onSuccess: (draft) => {
      setTitle(draft.title);
      setSummary(draft.summary);
      setReproSteps(draft.reproSteps);
      setTags(draft.tags);
      setStructured(true);
      toast.success("AI가 카드를 정리했어요. 편집 후 게시하세요.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createMut = useMutation({
    mutationFn: async () => {
      if (!title.trim() || !summary.trim()) throw new Error("제목과 요약은 필수예요.");
      const res = await create({
        data: {
          userId: session.userId,
          title: title.trim(),
          summary: summary.trim(),
          reproSteps: reproSteps.trim(),
          tags,
          rawDescription: raw.trim(),
          attachments,
        },
      });
      if (!("ok" in res) || !res.ok) throw new Error((res as { error?: string }).error ?? "게시 실패");
    },
    onSuccess: () => {
      toast.success("도움 미션을 게시했어요. 동료들에게 알림이 갑니다.");
      qc.invalidateQueries({ queryKey: ["missions-list"] });
      qc.invalidateQueries({ queryKey: ["missions-overview"] });
      reset();
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (f.size > 4 * 1024 * 1024) return toast.error("이미지는 최대 4MB");
    setUploadBusy(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.onerror = () => reject(new Error("파일 읽기 실패"));
        r.readAsDataURL(f);
      });
      const res = await upload({ data: { userId: session.userId, dataUrl, filename: f.name } });
      if (!("ok" in res) || !res.ok) throw new Error((res as { error?: string }).error ?? "업로드 실패");
      setAttachments((a) => [...a, { type: "image", url: res.url, caption: f.name }]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "업로드 실패");
    } finally {
      setUploadBusy(false);
    }
  }

  function addLink() {
    const url = linkInput.trim();
    if (!/^https?:\/\//i.test(url)) return toast.error("http(s) URL만 가능");
    setAttachments((a) => [...a, { type: "link", url }]);
    setLinkInput("");
  }

  function addTag() {
    const t = tagInput.trim();
    if (!t) return;
    if (tags.includes(t)) return setTagInput("");
    setTags((prev) => [...prev, t].slice(0, 6));
    setTagInput("");
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>🎯 동료에게 도움 미션 올리기</DialogTitle>
          <DialogDescription>
            막힌 상황을 자유롭게 서술하세요. AI가 카드로 정리해 드립니다.
            학생이 최종 확인·편집한 뒤 게시됩니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-semibold">1. 상황 · 오류 서술</label>
            <Textarea
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              rows={5}
              placeholder="예: 로그인 후 대시보드로 이동하면 흰 화면만 나옵니다. 콘솔에는 'Cannot read properties of undefined' 오류가 뜹니다..."
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-sm font-semibold">2. 첨부 (스크린샷·링크)</label>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
              <Button
                type="button" size="sm" variant="outline"
                onClick={() => fileRef.current?.click()}
                disabled={uploadBusy}
              >
                {uploadBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                <span className="ml-1">이미지</span>
              </Button>
              <div className="flex items-center gap-1">
                <Input
                  value={linkInput}
                  onChange={(e) => setLinkInput(e.target.value)}
                  placeholder="https://..."
                  className="h-8 w-52 text-sm"
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addLink(); } }}
                />
                <Button size="sm" variant="outline" onClick={addLink}>
                  <LinkIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {attachments.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-2">
                {attachments.map((a, i) => (
                  <li key={i} className="flex items-center gap-1 rounded-full border bg-muted px-2 py-1 text-xs">
                    {a.type === "image" ? "🖼️" : "🔗"} {a.caption || a.url.slice(0, 40)}
                    <button
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => setAttachments((prev) => prev.filter((_, idx) => idx !== i))}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <Button
              onClick={() => structureMut.mutate()}
              disabled={!raw.trim() || structureMut.isPending}
              className="w-full"
            >
              {structureMut.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />AI가 카드로 정리하는 중…</>
              ) : (
                <><Sparkles className="mr-2 h-4 w-4" />3. AI로 카드 정리하기</>
              )}
            </Button>
          </div>

          {structured && (
            <div className="space-y-3 rounded-2xl border-2 border-primary/20 bg-primary/5 p-4">
              <p className="text-xs font-semibold text-primary">📇 미션 카드 미리보기 · 편집 후 게시</p>
              <div>
                <label className="text-xs font-medium">제목</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} />
              </div>
              <div>
                <label className="text-xs font-medium">요약</label>
                <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} />
              </div>
              <div>
                <label className="text-xs font-medium">재현 단계 · 확인 포인트</label>
                <Textarea value={reproSteps} onChange={(e) => setReproSteps(e.target.value)} rows={3} />
              </div>
              <div>
                <label className="text-xs font-medium">태그</label>
                <div className="mt-1 flex flex-wrap items-center gap-1">
                  {tags.map((t, i) => (
                    <Badge key={i} variant="secondary" className="gap-1">
                      {t}
                      <button onClick={() => setTags((prev) => prev.filter((_, idx) => idx !== i))}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                    placeholder="태그 추가"
                    className="h-7 w-32 text-xs"
                  />
                </div>
              </div>
              <Button
                onClick={() => createMut.mutate()}
                disabled={createMut.isPending}
                className="w-full"
                size="lg"
              >
                {createMut.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />게시 중…</>
                ) : (
                  <><Send className="mr-2 h-4 w-4" />4. 게시판에 올리기</>
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
