import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from "react";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";

type Props = {
  youtubeId: string;
  autoplay?: boolean;
  className?: string;
  showOverlay?: boolean; // whether to show the overlay controls
  // if true, overlay won't be rendered; parent can control playback via ref
  onPlay?: () => void; // called once when playback starts
  onDurationChange?: (duration: number) => void; // called when duration is available
};

export type YouTubePlayerHandle = {
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  requestFullscreen: () => void;
};

// Minimal player interface used by this component (avoid `any`)
interface YouTubeApiPlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  mute: () => void;
  unMute: () => void;
  getPlayerState: () => number;
  destroy?: () => void;
}

interface YouTubePlayerOptions {
  videoId: string;
  playerVars?: Record<string, unknown>;
  events?: {
    onReady?: (e: { target: YouTubeApiPlayer }) => void;
    onStateChange?: (e: { data: number }) => void;
  };
}

declare global {
  interface Window {
    YT?: {
      Player: new (elementId: string, options: YouTubePlayerOptions) => YouTubeApiPlayer;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

// Lazy-load YT API
let ytApiLoading: Promise<void> | null = null;
const YT_API_TIMEOUT_MS = 5000;
function loadYouTubeApi() {
  if (typeof window.YT !== "undefined" && window.YT.Player) {
    return Promise.resolve();
  }
  if (ytApiLoading) return ytApiLoading;

  ytApiLoading = new Promise((resolve, reject) => {
    const existing = document.getElementById("yt-iframe-api");
    if (!existing) {
      const tag = document.createElement("script");
      tag.id = "yt-iframe-api";
      tag.src = "https://www.youtube.com/iframe_api";
      tag.async = true;
      document.head.appendChild(tag);
    }

    const timer = setTimeout(() => {
      // Timeout: likely blocked by browser extension or network
      reject(new Error('YouTube API load timeout'));
    }, YT_API_TIMEOUT_MS);

    window.onYouTubeIframeAPIReady = () => {
      clearTimeout(timer);
      resolve();
    };
  })
    .catch((err) => {
      // Reset so callers can retry later
      ytApiLoading = null;
      throw err;
    });

  return ytApiLoading;
}

const YouTubePlayer = forwardRef<YouTubePlayerHandle, Props>(({ youtubeId, autoplay = false, className, showOverlay = true, onPlay: propsOnPlay, onDurationChange }, ref) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YouTubeApiPlayer | null>(null);
  const hasSentPlay = useRef(false);
  const playTimer = useRef<number | null>(null);
  const [playing, setPlaying] = useState<boolean>(!!autoplay);
  const [muted, setMuted] = useState<boolean>(false);
  const [duration, setDuration] = useState<number>(0);
  const [current, setCurrent] = useState<number>(0);
  const progressRef = useRef<HTMLInputElement | null>(null);
  const [apiAvailable, setApiAvailable] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    let player: YouTubeApiPlayer | undefined;

    loadYouTubeApi()
      .then(() => {
        if (!mounted || !containerRef.current) return;
        const id = `ytplayer-${youtubeId}-${Math.random().toString(36).slice(2, 9)}`;
        containerRef.current.id = id;

        player = new window.YT!.Player(id, {
          videoId: youtubeId,
          playerVars: {
            autoplay: autoplay ? 1 : 0,
            controls: 0, // hide native controls
            modestbranding: 1,
            rel: 0,
            playsinline: 1,
            showinfo: 0,
            disablekb: 1,
            iv_load_policy: 3,
            cc_load_policy: 0
          },
          events: {
            onReady: (e: { target: YouTubeApiPlayer }) => {
              playerRef.current = e.target;
              if (autoplay) {
                try { e.target.playVideo(); } catch (err) { /* ignore */ }
              }
              // grab duration when ready
              try {
                const d = e.target.getDuration();
                setDuration(d || 0);
                // Notify parent component of duration change
                if (onDurationChange && d) {
                  onDurationChange(d);
                }
              } catch (err) { /* ignore */ }
            },
            onStateChange: (e: { data: number }) => {
              // 1 = playing, 2 = paused, 0 = ended
              const state = e.data;
              if (state === 1) {
                setPlaying(true);
                // start a 10s timer to mark as a view
                if (!hasSentPlay.current && !playTimer.current) {
                  playTimer.current = window.setTimeout(() => {
                    hasSentPlay.current = true;
                    try { if (typeof propsOnPlay === 'function') propsOnPlay(); } catch (err) { /* ignore */ }
                    playTimer.current = null;
                  }, 10000);
                }
              }
              if (state === 2 || state === 0) {
                setPlaying(false);
                // clear pending timer if user paused/stopped before 10s
                if (playTimer.current) {
                  clearTimeout(playTimer.current);
                  playTimer.current = null;
                }
              }
            }
          }
        });
      })
      .catch((err) => {
        // YouTube API load failed (likely blocked by extension or network). Fall back to opening video in new tab.
        console.warn('YouTube API load failed:', err);
        setApiAvailable(false);
      });

    // poll current time every 500ms
    const iv = setInterval(() => {
      try {
        if (playerRef.current && playerRef.current.getCurrentTime) {
          const t = playerRef.current.getCurrentTime();
          setCurrent(t || 0);
                  const d = playerRef.current.getDuration && playerRef.current.getDuration();
        if (d) {
          setDuration(d);
          // Notify parent component of duration change
          if (onDurationChange) {
            onDurationChange(d);
          }
        }
        }
      } catch (err) { /* ignore */ }
    }, 500);

    return () => {
      mounted = false;
      try {
        if (playerRef.current && playerRef.current.destroy) playerRef.current.destroy();
      } catch (err) { /* ignore */ }
      clearInterval(iv);
    };
  }, [youtubeId, autoplay]);

  const togglePlay = () => {
    const p = playerRef.current;
    if (!p) return;
    const state = p.getPlayerState();
    // playing = 1
    if (state === 1) {
      p.pauseVideo();
      setPlaying(false);
    } else {
      p.playVideo();
      setPlaying(true);
    }
  };

  const seekTo = (seconds: number) => {
    const p = playerRef.current;
    if (!p) return;
    p.seekTo(seconds, true);
    setCurrent(seconds);
  };

  const toggleMute = () => {
    const p = playerRef.current;
    if (!p) return;
    if (muted) {
      p.unMute();
      setMuted(false);
    } else {
      p.mute();
      setMuted(true);
    }
  };

  useImperativeHandle(ref, () => ({
    play: () => {
      if (!apiAvailable) {
        if (youtubeId) window.open(`https://www.youtube.com/watch?v=${youtubeId}`, '_blank');
        return;
      }
      playerRef.current?.playVideo?.();
    },
    pause: () => {
      if (!apiAvailable) return;
      playerRef.current?.pauseVideo?.();
    },
    togglePlay: () => {
      if (!apiAvailable) {
        if (youtubeId) window.open(`https://www.youtube.com/watch?v=${youtubeId}`, '_blank');
        return;
      }
      togglePlay();
    },
    requestFullscreen: () => {
      try {
        const el = containerRef.current;
        if (!el) return;
        if (el.requestFullscreen) el.requestFullscreen();
        else if ((el as HTMLElement & { webkitRequestFullscreen?: () => void }).webkitRequestFullscreen) {
          (el as HTMLElement & { webkitRequestFullscreen?: () => void }).webkitRequestFullscreen!();
        }
      } catch (err) { /* ignore */ }
    }
  }), []);

  if (!apiAvailable) {
    // Fallback UI when YT API is blocked: show thumbnail and open YouTube in new tab on click
    const thumbnail = youtubeId ? `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg` : '/placeholder.svg';
    return (
      <div className={className}>
        <div className="w-full h-full bg-black relative">
          <img src={thumbnail} alt="Video thumbnail" className="w-full h-full object-cover" />
          {showOverlay && (
            <div className="absolute inset-0 flex items-center justify-center">
              <button
                onClick={() => { if (youtubeId) window.open(`https://www.youtube.com/watch?v=${youtubeId}`, '_blank'); }}
                aria-label="Open video"
                className="text-white bg-black/60 p-4 rounded-full"
              >
                <Play className="h-6 w-6" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div ref={containerRef} className="w-full h-full bg-black relative" />

      {/* Controls (either overlay or hidden if showOverlay=false) */}
      {showOverlay ? (
        <div className="absolute bottom-3 left-3 right-3 flex items-center gap-3 pointer-events-auto">
          <button onClick={togglePlay} aria-label={playing ? 'Pause' : 'Play'} className="text-white bg-black/50 p-2 rounded">
            {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </button>

          <div className="flex-1">
            <input
              ref={progressRef}
              type="range"
              min={0}
              max={Math.max(0, Math.round(duration))}
              value={Math.round(current)}
              onChange={(e) => seekTo(Number(e.target.value))}
              aria-label="Seek video"
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <div>{new Date(current * 1000).toISOString().substr(11, 8)}</div>
              <div>{new Date(duration * 1000).toISOString().substr(11, 8)}</div>
            </div>
          </div>

          <button onClick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'} className="text-white bg-black/50 p-2 rounded">
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
        </div>
      ) : null}
    </div>
  );
});

export default YouTubePlayer;
