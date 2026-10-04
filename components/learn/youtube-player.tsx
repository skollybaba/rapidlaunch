"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize, Pause, Play, Volume2, VolumeX } from "lucide-react";

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
  destroy: () => void;
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

const controlButton =
  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/90 transition-colors hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-40";

export function YouTubePlayer({
  videoId,
  title,
}: {
  videoId: string;
  title: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YouTubePlayerInstance | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);

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
            fs: 0,
            origin: window.location.origin,
          },
          events: {
            onReady: (event) => {
              if (cancelled) return;
              setReady(true);
              setDuration(event.target.getDuration() ?? 0);
            },
            onStateChange: (event) => {
              if (cancelled) return;
              const state = window.YT?.PlayerState;
              setPlaying(event.data === state?.PLAYING);
              if (event.data === state?.ENDED) setPlaying(false);
            },
            onError: () => {
              if (!cancelled) setFailed(true);
            },
          },
        });
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
  }, [videoId]);

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

  const toggleFullscreen = useCallback(() => {
    const host = hostRef.current;
    if (!host) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void host.requestFullscreen?.();
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
      ref={hostRef}
      className="group relative aspect-video w-full overflow-hidden rounded-[12px] bg-neutral-950"
      onContextMenu={(event) => event.preventDefault()}
    >
      {/*
        The shield. It is a real button covering the entire frame, so a click
        anywhere toggles playback and YouTube never receives a pointer event.
      */}
      <button
        type="button"
        aria-label={playing ? `Pause ${title}` : `Play ${title}`}
        onClick={togglePlay}
        className="absolute inset-0 z-10 cursor-pointer"
      />

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

      <div className="absolute inset-x-0 bottom-0 z-20 flex items-center gap-2.5 bg-gradient-to-t from-black/85 to-transparent px-3 pb-2.5 pt-8 text-white">
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
      </div>
    </div>
  );
}
