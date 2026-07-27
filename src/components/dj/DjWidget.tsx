import { useEffect, useRef, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Headphones,
  Play,
  Pause,
  Square,
  SkipBack,
  SkipForward,
  X,
  Plus,
  Trash2,
  Zap,
  Music,
} from "lucide-react";

import {
  listDjQueue,
  enqueueDjTrack,
  removeDjTrack,
  markDjTrackPlayed,
  type DjTrack,
} from "@/lib/dj.functions";
import { extractYoutubeId, youtubeThumbnail } from "@/lib/dj-utils";
import type { StoredSession } from "@/lib/local-session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/* YouTube IFrame API                                                          */
/* -------------------------------------------------------------------------- */

type YTPlayer = {
  loadVideoById: (id: string) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  stopVideo: () => void;
  setVolume: (v: number) => void;
  getPlayerState: () => number;
  destroy: () => void;
};

declare global {
  interface Window {
    YT?: {
      Player: new (
        el: HTMLElement | string,
        opts: {
          height?: string | number;
          width?: string | number;
          videoId?: string;
          playerVars?: Record<string, unknown>;
          events?: {
            onReady?: (e: { target: YTPlayer }) => void;
            onStateChange?: (e: { data: number; target: YTPlayer }) => void;
          };
        },
      ) => YTPlayer;
      PlayerState: { ENDED: 0; PLAYING: 1; PAUSED: 2; BUFFERING: 3; CUED: 5 };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let ytApiLoading: Promise<void> | null = null;

function loadYouTubeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  if (ytApiLoading) return ytApiLoading;
  ytApiLoading = new Promise<void>((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    s.async = true;
    document.body.appendChild(s);
  });
  return ytApiLoading;
}

/* -------------------------------------------------------------------------- */
/* Public Widget                                                               */
/* -------------------------------------------------------------------------- */

export function DjWidget({ session }: { session: StoredSession }) {
  const [open, setOpen] = useState(false);
  const isInstructor = session.role === "instructor";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-4 right-20 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-fuchsia-600 text-white shadow-lg transition hover:scale-105 hover:shadow-xl"
        aria-label="DJ 노동요"
        title="DJ 노동요"
      >
        <Headphones className="h-6 w-6" />
      </button>
      {open && (
        <div className="fixed bottom-4 right-20 z-40 flex w-[min(92vw,360px)] flex-col overflow-hidden rounded-2xl border-2 border-fuchsia-300 bg-background shadow-2xl">
          <header className="flex items-center gap-2 border-b bg-fuchsia-50 px-3 py-2">
            <Headphones className="h-4 w-4 text-fuchsia-600" />
            <span className="font-display text-sm font-bold text-fuchsia-900">
              DJ 노동요
            </span>
            <span className="ml-auto text-[10px] text-fuchsia-800/70">
              {isInstructor ? "재생 · 강사 화면" : "신청 · 재생은 강사 화면"}
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded p-1 text-fuchsia-800/70 hover:bg-fuchsia-100"
              aria-label="닫기"
            >
              <X className="h-4 w-4" />
            </button>
          </header>
          {isInstructor ? (
            <DjPlayerPanel session={session} />
          ) : (
            <DjRequestPanel session={session} />
          )}
        </div>
      )}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Enqueue form                                                                */
/* -------------------------------------------------------------------------- */

function EnqueueForm({
  session,
  showPlayNow,
  onPlayNow,
}: {
  session: StoredSession;
  showPlayNow?: boolean;
  onPlayNow?: (trackId: string, videoId: string) => void;
}) {
  const qc = useQueryClient();
  const enqueue = useServerFn(enqueueDjTrack);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");

  const submit = useMutation({
    mutationFn: (playNow: boolean) =>
      enqueue({
        data: { userId: session.userId, url, title: title || undefined, playNow },
      }),
    onSuccess: (res, playNow) => {
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(playNow ? "바로 실행합니다." : "큐에 추가했습니다.");
      const vid = extractYoutubeId(url);
      setUrl("");
      setTitle("");
      qc.invalidateQueries({ queryKey: ["dj-queue"] });
      if (playNow && vid && onPlayNow) onPlayNow(res.trackId, vid);
    },
    onError: () => toast.error("전송에 실패했습니다."),
  });

  return (
    <div className="flex flex-col gap-2 border-b p-3">
      <Input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="유튜브 링크 붙여넣기"
        className="h-9 text-sm"
      />
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="곡 제목 (선택)"
        className="h-9 text-sm"
      />
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="secondary"
          className="flex-1"
          disabled={!url || submit.isPending}
          onClick={() => submit.mutate(false)}
        >
          <Plus className="mr-1 h-3.5 w-3.5" /> 큐에 추가
        </Button>
        {showPlayNow && (
          <Button
            size="sm"
            className="flex-1 bg-fuchsia-600 hover:bg-fuchsia-700"
            disabled={!url || submit.isPending}
            onClick={() => submit.mutate(true)}
          >
            <Zap className="mr-1 h-3.5 w-3.5" /> 바로 실행
          </Button>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Track list item                                                             */
/* -------------------------------------------------------------------------- */

function TrackRow({
  track,
  isCurrent,
  canDelete,
  onDelete,
  onPlay,
}: {
  track: DjTrack;
  isCurrent?: boolean;
  canDelete: boolean;
  onDelete: () => void;
  onPlay?: () => void;
}) {
  return (
    <li
      className={cn(
        "flex items-center gap-2 rounded-lg border px-2 py-1.5 text-xs",
        isCurrent
          ? "border-fuchsia-400 bg-fuchsia-50"
          : "border-transparent bg-muted/40",
      )}
    >
      <img
        src={youtubeThumbnail(track.videoId)}
        alt=""
        className="h-8 w-14 flex-shrink-0 rounded object-cover"
        loading="lazy"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-foreground">
          {track.title || track.videoId}
        </p>
        <p className="truncate text-[10px] text-muted-foreground">
          {track.requesterNickname}
          {track.requesterRole === "instructor" ? " · 강사" : ""}
        </p>
      </div>
      {onPlay && (
        <button
          type="button"
          onClick={onPlay}
          className="rounded p-1 text-fuchsia-700 hover:bg-fuchsia-100"
          aria-label="이 곡 재생"
          title="이 곡 재생"
        >
          <Play className="h-3.5 w-3.5" />
        </button>
      )}
      {canDelete && (
        <button
          type="button"
          onClick={onDelete}
          className="rounded p-1 text-rose-600 hover:bg-rose-100"
          aria-label="삭제"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/* Instructor: player                                                          */
/* -------------------------------------------------------------------------- */

function DjPlayerPanel({ session }: { session: StoredSession }) {
  const qc = useQueryClient();
  const listFn = useServerFn(listDjQueue);
  const removeFn = useServerFn(removeDjTrack);
  const markPlayedFn = useServerFn(markDjTrackPlayed);

  const { data } = useQuery({
    queryKey: ["dj-queue", session.userId],
    queryFn: () => listFn({ data: { userId: session.userId } }),
    refetchInterval: 5_000,
  });
  const tracks: DjTrack[] = data && data.ok ? data.tracks : [];
  const pending = tracks.filter((t) => !t.playedAt);

  const [currentId, setCurrentId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState<number>(() => {
    if (typeof window === "undefined") return 50;
    const v = Number(window.localStorage.getItem("dj:volume"));
    return Number.isFinite(v) && v >= 0 && v <= 100 ? v : 50;
  });

  const playerRef = useRef<YTPlayer | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const readyRef = useRef(false);
  const currentTrack = pending.find((t) => t.id === currentId) ?? pending[0] ?? null;

  const markPlayed = useCallback(
    async (trackId: string) => {
      await markPlayedFn({ data: { userId: session.userId, trackId } });
      qc.invalidateQueries({ queryKey: ["dj-queue"] });
    },
    [markPlayedFn, qc, session.userId],
  );

  // Initialize player once
  useEffect(() => {
    let cancelled = false;
    loadYouTubeApi().then(() => {
      if (cancelled || !containerRef.current || !window.YT?.Player) return;
      if (playerRef.current) return;
      playerRef.current = new window.YT.Player(containerRef.current, {
        height: "1",
        width: "1",
        playerVars: { autoplay: 0, controls: 0, disablekb: 1, modestbranding: 1 },
        events: {
          onReady: (e) => {
            readyRef.current = true;
            e.target.setVolume(volume);
          },
          onStateChange: (e) => {
            const s = e.data;
            setPlaying(s === 1);
            if (s === 0) {
              // ENDED — mark played & advance
              const t = currentTrack;
              if (t) {
                markPlayed(t.id);
                setCurrentId(null); // will pick next after refetch
              }
            }
          },
        },
      });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist volume
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("dj:volume", String(volume));
    }
    if (readyRef.current && playerRef.current) {
      playerRef.current.setVolume(volume);
    }
  }, [volume]);

  const loadAndPlay = useCallback((videoId: string) => {
    if (!readyRef.current || !playerRef.current) return;
    playerRef.current.loadVideoById(videoId);
    playerRef.current.setVolume(volume);
    playerRef.current.playVideo();
  }, [volume]);

  const handlePlayCurrent = () => {
    if (!currentTrack) {
      toast("큐가 비어 있습니다.");
      return;
    }
    setCurrentId(currentTrack.id);
    loadAndPlay(currentTrack.videoId);
  };
  const handlePause = () => playerRef.current?.pauseVideo();
  const handleStop = () => {
    playerRef.current?.stopVideo();
    setPlaying(false);
  };
  const handleNext = () => {
    if (!currentTrack) return;
    markPlayed(currentTrack.id).then(() => {
      const remaining = pending.filter((t) => t.id !== currentTrack.id);
      const next = remaining[0];
      if (next) {
        setCurrentId(next.id);
        loadAndPlay(next.videoId);
      } else {
        handleStop();
        setCurrentId(null);
      }
    });
  };
  const handlePrev = () => {
    // 재생 완료된 마지막 트랙을 되살려 재생
    const played = tracks.filter((t) => t.playedAt).slice(-1)[0];
    if (!played) {
      toast("이전 곡이 없습니다.");
      return;
    }
    setCurrentId(played.id);
    loadAndPlay(played.videoId);
  };

  return (
    <div className="flex flex-col">
      <EnqueueForm
        session={session}
        showPlayNow
        onPlayNow={(_id, videoId) => {
          setCurrentId(_id);
          loadAndPlay(videoId);
        }}
      />

      {/* Now Playing */}
      <div className="border-b bg-gradient-to-br from-fuchsia-50 to-purple-50 px-3 py-2.5">
        <div className="mb-2 flex items-center gap-2">
          <Music className="h-3.5 w-3.5 text-fuchsia-700" />
          <p className="text-[10px] font-bold uppercase tracking-wider text-fuchsia-800">
            {playing ? "재생 중" : "대기"}
          </p>
        </div>
        <p className="truncate text-sm font-semibold text-foreground">
          {currentTrack?.title || currentTrack?.videoId || "선택된 곡 없음"}
        </p>
        <div className="mt-2 flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={handlePrev} className="h-8 w-8 p-0">
            <SkipBack className="h-4 w-4" />
          </Button>
          {playing ? (
            <Button
              size="sm"
              onClick={handlePause}
              className="h-8 flex-1 bg-fuchsia-600 hover:bg-fuchsia-700"
            >
              <Pause className="mr-1 h-4 w-4" /> 일시정지
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handlePlayCurrent}
              className="h-8 flex-1 bg-fuchsia-600 hover:bg-fuchsia-700"
            >
              <Play className="mr-1 h-4 w-4" /> 재생
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={handleStop} className="h-8 w-8 p-0">
            <Square className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={handleNext} className="h-8 w-8 p-0">
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>
        <label className="mt-2 flex items-center gap-2 text-[11px] text-fuchsia-900">
          <span>🔊 {volume}</span>
          <input
            type="range"
            min={0}
            max={100}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="flex-1 accent-fuchsia-600"
          />
        </label>
      </div>

      {/* Queue */}
      <div className="max-h-64 overflow-y-auto p-2">
        {pending.length === 0 ? (
          <p className="px-2 py-4 text-center text-xs text-muted-foreground">
            대기 중인 곡이 없습니다.
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {pending.map((t) => (
              <TrackRow
                key={t.id}
                track={t}
                isCurrent={t.id === currentTrack?.id}
                canDelete
                onDelete={async () => {
                  await removeFn({ data: { userId: session.userId, trackId: t.id } });
                  qc.invalidateQueries({ queryKey: ["dj-queue"] });
                }}
                onPlay={() => {
                  setCurrentId(t.id);
                  loadAndPlay(t.videoId);
                }}
              />
            ))}
          </ul>
        )}
      </div>

      {/* Hidden YouTube player */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          opacity: 0,
          pointerEvents: "none",
          left: -9999,
          top: -9999,
        }}
      >
        <div ref={containerRef} />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Participant: request panel                                                  */
/* -------------------------------------------------------------------------- */

function DjRequestPanel({ session }: { session: StoredSession }) {
  const qc = useQueryClient();
  const listFn = useServerFn(listDjQueue);
  const removeFn = useServerFn(removeDjTrack);

  const { data } = useQuery({
    queryKey: ["dj-queue", session.userId],
    queryFn: () => listFn({ data: { userId: session.userId } }),
    refetchInterval: 7_000,
  });
  const tracks: DjTrack[] = data && data.ok ? data.tracks : [];
  const pending = tracks.filter((t) => !t.playedAt);

  return (
    <div className="flex flex-col">
      <EnqueueForm session={session} />
      <p className="border-b bg-amber-50 px-3 py-1.5 text-[11px] text-amber-900">
        재생은 강사 화면에서 진행돼요. 신청만 등록하면 큐에 바로 올라갑니다.
      </p>
      <div className="max-h-64 overflow-y-auto p-2">
        {pending.length === 0 ? (
          <p className="px-2 py-4 text-center text-xs text-muted-foreground">
            대기 중인 곡이 없습니다.
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {pending.map((t) => (
              <TrackRow
                key={t.id}
                track={t}
                canDelete={t.requesterId === session.userId}
                onDelete={async () => {
                  await removeFn({ data: { userId: session.userId, trackId: t.id } });
                  qc.invalidateQueries({ queryKey: ["dj-queue"] });
                }}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
