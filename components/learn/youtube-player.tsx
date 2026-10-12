"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import {
  ChevronsLeft,
  ChevronsRight,
  Maximize,
  Pause,
  Play,
  Subtitles,
  Volume2,
  VolumeX,
} from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * A thin wrapper around the YouTube IFrame Player API.
 *
 * The player is deliberately built so a student can never reach youtube.com:
 * the embed runs without YouTube's own controls, and a transparent button
 * covers the whole frame, so every pointer event stops here. Playback is driven
 * by our own controls, which means the title, logo, share panel and end screen
 * YouTube draws underneath are unreachable.
 */

interface YouTubePlayerInstance {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  mute: () => void;
  unMute: () => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  setPlaybackRate: (suggestedRate: number) => void;
  getAvailablePlaybackRates: () => number[];
  getIframe: () => HTMLIFrameElement;
  loadModule: (module: string) => void;
  getOption: (module: string, option: string) => unknown;
  setOption: (module: string, option: string, value: unknown) => void;
  destroy: () => void;
}

/** A caption track as reported by the captions module's `tracklist`. */
interface CaptionTrack {
  languageCode: string;
  languageName?: string;
  kind?: string;
  name?: string;
}

interface YouTubePlayerEvent {
  target: YouTubePlayerInstance;
  data: number;
}

interface YouTubeApi {
  Player: new (
    element: HTMLElement,
    options: {
      videoId: string;
      host?: string;
      playerVars: Record<string, number | string>;
      events: {
        onReady: (event: { target: YouTubePlayerInstance }) => void;
        onStateChange: (event: YouTubePlayerEvent) => void;
        onApiChange: () => void;
        onError: () => void;
      };
    }
  ) => YouTubePlayerInstance;
  PlayerState: { PLAYING: number; PAUSED: number; ENDED: number };
}

declare global {
  interface Window {
    YT?: YouTubeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<YouTubeApi> | null = null;

function loadYouTubeApi(): Promise<YouTubeApi> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("The video player can only load in a browser."));
  }
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!apiPromise) {
    apiPromise = new Promise<YouTubeApi>((resolve) => {
      const previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        previous?.();
        if (window.YT) resolve(window.YT);
      };
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      document.head.appendChild(script);
    });
  }
  return apiPromise;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const minutes = Math.floor(total / 60);
  const remainder = total % 60;
  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}

const FALLBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

const SEEK_STEP_SECONDS = 10;
const DOUBLE_TAP_MS = 260;

function normalizeRates(rates: number[] | undefined): number[] {
  if (!rates?.length) return FALLBACK_RATES;
  const unique = Array.from(
    new Set(rates.filter((rate) => Number.isFinite(rate) && rate > 0))
  ).sort((a, b) => a - b);
  return unique.length ? unique : FALLBACK_RATES;
}

function formatRate(rate: number): string {
  return `${rate}×`;
}

const controlButton =
  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/90 transition-colors hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-40";

export function YouTubePlayer({
  videoId,
  title,
}: {
  videoId: string;
  title: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const isFullscreenRef = useRef(false);
  const playerRef = useRef<YouTubePlayerInstance | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [muted, setMuted] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rate, setRate] = useState(1);
  const [rates, setRates] = useState<number[]>(FALLBACK_RATES);
  const [speedOpen, setSpeedOpen] = useState(false);
  const [captionTracks, setCaptionTracks] = useState<CaptionTrack[]>([]);
  const [activeCaption, setActiveCaption] = useState<string | null>(null);
  const [captionsOpen, setCaptionsOpen] = useState(false);
  const [prevVideoId, setPrevVideoId] = useState(videoId);
  const [skip, setSkip] = useState<{
    side: "left" | "right";
    seconds: number;
  } | null>(null);
  const activeCaptionRef = useRef<string | null>(null);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset per-video controls when the lesson changes. Adjusting state during
  // render (rather than in an effect) avoids a stale frame and an extra pass.
  if (prevVideoId !== videoId) {
    setPrevVideoId(videoId);
    setRate(1);
    setSpeedOpen(false);
    setCaptionTracks([]);
    setActiveCaption(null);
    setCaptionsOpen(false);
    setHasPlayed(false);
  }

  // Keep the ref in sync so the YouTube API callbacks (which capture an older
  // render) always read the viewer's current caption choice.
  useEffect(() => {
    activeCaptionRef.current = activeCaption;
  }, [activeCaption]);

  useEffect(() => {
    if (!speedOpen && !captionsOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setSpeedOpen(false);
      setCaptionsOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [speedOpen, captionsOpen]);

  useEffect(() => {
    const onChange = () =>
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // YouTube pins its title/avatar/share overlay to the iframe's top corners and
  // always shows it before playback, on pause, and on end (showinfo is
  // deprecated and controls=0 does not remove it). Widening the iframe past the
  // frame and clipping the overflow pushes those corner-anchored items
  // off-screen while the video itself stays full-size. Fullscreen reverts this
  // because the frame is no longer guaranteed to be 16:9 there.
  const applyFrameCrop = useCallback(() => {
    const iframe = playerRef.current?.getIframe?.();
    if (!iframe) return;
    if (isFullscreenRef.current) {
      iframe.style.width = "100%";
      iframe.style.marginLeft = "0";
    } else {
      iframe.style.width = "200%";
      iframe.style.marginLeft = "-50%";
    }
  }, []);

  useEffect(() => {
    isFullscreenRef.current = isFullscreen;
    applyFrameCrop();
  }, [isFullscreen, ready, applyFrameCrop]);

  useEffect(() => {
    return () => {
      if (tapTimer.current) clearTimeout(tapTimer.current);
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    };
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !videoId) return;

    let cancelled = false;

    // The API replaces the element it is given with an iframe, which React does
    // not own, so the mount node is created imperatively and removed on cleanup.
    const mount = document.createElement("div");
    mount.className = "absolute inset-0 h-full w-full";
    host.appendChild(mount);

    loadYouTubeApi()
      .then((YT) => {
        if (cancelled) return;
        playerRef.current = new YT.Player(mount, {
          videoId,
          host: "https://www.youtube-nocookie.com",
          playerVars: {
            controls: 0,
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
            iv_load_policy: 3,
            disablekb: 1,
            fs: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: (event) => {
              if (cancelled) return;
              setReady(true);
              setDuration(event.target.getDuration() ?? 0);
              setRates(
                normalizeRates(event.target.getAvailablePlaybackRates?.())
              );
              // Load captions so we can list them, and keep them off by default.
              event.target.loadModule("captions");
              event.target.setOption("captions", "track", {});
              applyFrameCrop();
            },
            onStateChange: (event) => {
              if (cancelled) return;
              const state = window.YT?.PlayerState;
              setPlaying(event.data === state?.PLAYING);
              if (event.data === state?.PLAYING) setHasPlayed(true);
              if (event.data === state?.ENDED) setPlaying(false);
            },
            onApiChange: () => {
              if (cancelled) return;
              const player = playerRef.current;
              if (!player) return;
              const list = player.getOption("captions", "tracklist");
              if (Array.isArray(list)) setCaptionTracks(list as CaptionTrack[]);
              // Keep auto-captions off until the viewer explicitly picks one.
              if (!activeCaptionRef.current) {
                const current = player.getOption("captions", "track") as
                  | CaptionTrack
                  | null;
                if (current?.languageCode) {
                  player.setOption("captions", "track", {});
                }
              }
            },
            onError: () => {
              if (!cancelled) setFailed(true);
            },
          },
        });
        // Apply the crop immediately, before the embed can paint its overlay.
        applyFrameCrop();
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      try {
        playerRef.current?.destroy();
      } catch {
        // The widget can already be gone if the browser blocked it.
      }
      playerRef.current = null;
      mount.remove();
    };
  }, [videoId, applyFrameCrop]);

  useEffect(() => {
    if (!ready) return;
    const timer = window.setInterval(() => {
      const player = playerRef.current;
      if (!player) return;
      setCurrent(player.getCurrentTime() ?? 0);
      const nextDuration = player.getDuration() ?? 0;
      if (nextDuration) setDuration(nextDuration);
    }, 500);
    return () => window.clearInterval(timer);
  }, [ready]);

  const togglePlay = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    if (playing) {
      player.pauseVideo();
      setPlaying(false);
    } else {
      player.playVideo();
      setPlaying(true);
    }
  }, [playing]);

  const toggleMute = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    if (muted) {
      player.unMute();
      setMuted(false);
    } else {
      player.mute();
      setMuted(true);
    }
  }, [muted]);

  const seek = useCallback((value: number) => {
    const player = playerRef.current;
    if (!player) return;
    setCurrent(value);
    player.seekTo(value, true);
  }, []);

  const changeSpeed = useCallback((value: number) => {
    setRate(value);
    setSpeedOpen(false);
    playerRef.current?.setPlaybackRate(value);
  }, []);

  const selectCaption = useCallback((track: CaptionTrack | null) => {
    const player = playerRef.current;
    const code = track?.languageCode ?? null;
    setActiveCaption(code);
    activeCaptionRef.current = code;
    setCaptionsOpen(false);
    if (!player) return;
    if (track) {
      player.setOption("captions", "track", {
        languageCode: track.languageCode,
        ...(track.kind ? { kind: track.kind } : {}),
      });
    } else {
      player.setOption("captions", "track", {});
    }
  }, []);

  const skipBy = useCallback((direction: "left" | "right") => {
    const player = playerRef.current;
    if (!player) return;
    const now = player.getCurrentTime() ?? 0;
    const duration = player.getDuration() ?? 0;
    const target =
      direction === "right"
        ? duration > 0
          ? Math.min(duration, now + SEEK_STEP_SECONDS)
          : now + SEEK_STEP_SECONDS
        : Math.max(0, now - SEEK_STEP_SECONDS);
    player.seekTo(target, true);
    setCurrent(target);
    setSkip((prev) =>
      prev && prev.side === direction
        ? { side: direction, seconds: prev.seconds + SEEK_STEP_SECONDS }
        : { side: direction, seconds: SEEK_STEP_SECONDS }
    );
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setSkip(null), 800);
  }, []);

  const handleSurfaceTap = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const direction =
        event.clientX - rect.left >= rect.width / 2 ? "right" : "left";
      // A second tap inside the window means double-tap: cancel the pending
      // play/pause toggle and seek instead, matching YouTube's behaviour.
      if (tapTimer.current) {
        clearTimeout(tapTimer.current);
        tapTimer.current = null;
        skipBy(direction);
        return;
      }
      tapTimer.current = setTimeout(() => {
        tapTimer.current = null;
        togglePlay();
      }, DOUBLE_TAP_MS);
    },
    [skipBy, togglePlay]
  );

  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    // Fullscreen the wrapper (video + controls), not the iframe: the shield and
    // our controls stay on top, so YouTube's own UI is never reachable.
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void container.requestFullscreen?.();
    }
  }, []);

  if (failed) {
    return (
      <div className="rounded-[12px] border border-neutral-200 bg-paper-50 px-5 py-10 text-center text-sm text-neutral-500">
        This video is unavailable right now.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "group flex w-full flex-col overflow-hidden rounded-[12px] bg-neutral-950",
        isFullscreen && "rounded-none"
      )}
    >
      <div
        ref={hostRef}
        className={cn(
          "relative w-full overflow-hidden",
          isFullscreen ? "min-h-0 flex-1" : "aspect-video"
        )}
        onContextMenu={(event) => event.preventDefault()}
      >
        {/*
          The shield. It is a real button covering the entire frame, so a tap
          anywhere toggles playback (single) or seeks (double) and YouTube never
          receives a pointer event.
        */}
        <button
          type="button"
          aria-label={playing ? `Pause ${title}` : `Play ${title}`}
          onClick={handleSurfaceTap}
          className="absolute inset-0 z-10 cursor-pointer touch-manipulation"
        />

        {/* YouTube's own poster uses object-fit: cover, so in the widened frame
            it renders zoomed. Show our own correctly-sized poster until the
            real video frame (object-fit: contain) starts. */}
        {!hasPlayed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`}
            alt=""
            aria-hidden="true"
            draggable={false}
            className="pointer-events-none absolute inset-0 z-[5] h-full w-full object-cover"
            onError={(event) => {
              const img = event.currentTarget;
              if (img.dataset.fallback) return;
              img.dataset.fallback = "1";
              img.src = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
            }}
          />
        ) : null}

        {!ready ? (
          <span className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center text-sm text-neutral-400">
            Loading video…
          </span>
        ) : null}

        {ready && !playing ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 z-10 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white"
          >
            <Play className="ml-1 h-7 w-7" />
          </span>
        ) : null}

        {skip ? (
          <div
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-y-0 z-20 flex items-center justify-center",
              skip.side === "right" ? "left-1/2 right-0" : "left-0 right-1/2"
            )}
          >
            <span className="flex h-16 w-16 animate-pulse flex-col items-center justify-center rounded-full bg-black/60 text-white">
              {skip.side === "right" ? (
                <ChevronsRight className="h-6 w-6" />
              ) : (
                <ChevronsLeft className="h-6 w-6" />
              )}
              <span className="mt-0.5 text-[11px] font-semibold leading-none">
                {skip.seconds}s
              </span>
            </span>
          </div>
        ) : null}
      </div>

      <div className="relative flex items-center gap-2.5 border-t border-white/10 bg-neutral-950 px-3 py-2.5 text-white">
        <button
          type="button"
          onClick={togglePlay}
          aria-label={playing ? "Pause" : "Play"}
          className={controlButton}
        >
          {playing ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="ml-0.5 h-4 w-4" />
          )}
        </button>
        <span className="w-9 shrink-0 text-center font-mono text-[11px] tabular-nums">
          {formatTime(current)}
        </span>
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={1}
          value={Math.min(current, duration || 0)}
          disabled={!duration}
          onChange={(event) => seek(Number(event.target.value))}
          aria-label="Seek"
          className={cn(
            "h-1.5 flex-1 cursor-pointer accent-terracotta-500",
            "disabled:cursor-default disabled:opacity-50"
          )}
        />
        <span className="w-9 shrink-0 text-center font-mono text-[11px] tabular-nums text-white/70">
          {formatTime(duration)}
        </span>
        <button
          type="button"
          onClick={() => {
            setSpeedOpen((prev) => !prev);
            setCaptionsOpen(false);
          }}
          aria-label={`Playback speed, ${formatRate(rate)}`}
          aria-haspopup="true"
          aria-expanded={speedOpen}
          className={cn(
            controlButton,
            "w-auto min-w-8 px-2 text-xs font-semibold tabular-nums"
          )}
        >
          {formatRate(rate)}
        </button>
        <button
          type="button"
          onClick={() => {
            setCaptionsOpen((prev) => !prev);
            setSpeedOpen(false);
          }}
          aria-label={activeCaption ? "Captions on" : "Captions off"}
          aria-haspopup="true"
          aria-expanded={captionsOpen}
          aria-pressed={activeCaption !== null}
          className={cn(
            controlButton,
            "relative",
            activeCaption !== null && "bg-terracotta-500/25"
          )}
        >
          <Subtitles className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={toggleMute}
          aria-label={muted ? "Unmute" : "Mute"}
          className={controlButton}
        >
          {muted ? (
            <VolumeX className="h-4 w-4" />
          ) : (
            <Volume2 className="h-4 w-4" />
          )}
        </button>
        <button
          type="button"
          onClick={toggleFullscreen}
          aria-label="Fullscreen"
          className={controlButton}
        >
          <Maximize className="h-4 w-4" />
        </button>

        {speedOpen ? (
          <div className="absolute inset-x-0 bottom-full z-30 mb-2 px-2">
            <div className="mx-auto flex w-fit max-w-full flex-wrap justify-center gap-1.5 rounded-2xl bg-black/85 p-1.5 shadow-lg backdrop-blur">
              {rates.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => changeSpeed(value)}
                  aria-pressed={value === rate}
                  className={cn(
                    "min-w-[3.25rem] rounded-full px-3 py-1 text-xs font-medium transition-colors",
                    value === rate
                      ? "bg-white text-neutral-900"
                      : "bg-white/10 text-white hover:bg-white/20"
                  )}
                >
                  {formatRate(value)}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {captionsOpen ? (
          <div className="absolute inset-x-0 bottom-full z-30 mb-2 px-2">
            <div className="mx-auto flex w-fit max-w-full flex-col gap-1 rounded-2xl bg-black/85 p-1.5 shadow-lg backdrop-blur">
              <button
                type="button"
                onClick={() => selectCaption(null)}
                aria-pressed={activeCaption === null}
                className={cn(
                  "min-w-[10rem] rounded-xl px-3 py-1.5 text-left text-xs font-medium transition-colors",
                  activeCaption === null
                    ? "bg-white text-neutral-900"
                    : "text-white hover:bg-white/10"
                )}
              >
                Off
              </button>
              {captionTracks.length === 0 ? (
                <span className="px-3 py-1.5 text-xs text-white/60">
                  No captions available
                </span>
              ) : (
                captionTracks.map((track) => (
                  <button
                    key={`${track.languageCode}-${track.kind ?? ""}`}
                    type="button"
                    onClick={() => selectCaption(track)}
                    aria-pressed={activeCaption === track.languageCode}
                    className={cn(
                      "min-w-[10rem] rounded-xl px-3 py-1.5 text-left text-xs font-medium transition-colors",
                      activeCaption === track.languageCode
                        ? "bg-white text-neutral-900"
                        : "text-white hover:bg-white/10"
                    )}
                  >
                    {track.languageName ?? track.languageCode}
                  </button>
                ))
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
