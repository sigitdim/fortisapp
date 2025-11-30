"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  X,
  RotateCcw,
  RotateCw,
} from "lucide-react";

type Video = {
  id: string;
  title: string;
  author: string;
  youtubeId: string;
};

const VIDEOS: Video[] = [
  { id: "psychology-of-money", title: "Psychology of Money", author: "Morgan Housel", youtubeId: "GjuR4joAO6Y" },
  { id: "the-art-of-war", title: "The Art of War", author: "Sun Tzu", youtubeId: "FJ0Ki2iEDLo" },
  { id: "thinking-fast-and-slow", title: "Thinking Fast and Slow", author: "Daniel Kahneman", youtubeId: "LeoLlD_Ly_0" },
  { id: "atomic-habits", title: "Atomic Habits", author: "James Clear", youtubeId: "DrDxsx0l9bI" },
  { id: "12-rules-for-life", title: "12 Rules for Life", author: "Jordan B. Peterson", youtubeId: "ZPb-qzmluRs" },
  { id: "grit", title: "GRIT", author: "Angela Duckworth", youtubeId: "PLGiLkR2chw" },

  { id: "cashflow-quadrant", title: "Cashflow Quadrant", author: "Robert Kiyosaki", youtubeId: "fGKpbHnH2EE" },
  { id: "crushing-it", title: "Crushing It!", author: "Gary Vaynerchuk", youtubeId: "JggZ4L5usc4" },
  { id: "drive", title: "Drive!", author: "Daniel H. Pink", youtubeId: "i8NhhRqSPLk" },
  { id: "emotional-intelligence", title: "Emotional Intelligence", author: "Daniel Goleman", youtubeId: "OnQTsvJwZJI" },
  { id: "emotional-intelligence-2", title: "Emotional Intelligence 2.0", author: "Travis Bradberry", youtubeId: "dyJpVo3ohCU" },
  { id: "eat-that-frog", title: "Eat That Frog!", author: "Brian Tracy", youtubeId: "GcALM8KiSbw" },
  { id: "extreme-ownership", title: "Extreme Ownership", author: "Jocko Willink", youtubeId: "ovve62tdUbk" },
  { id: "fanatical-prospecting", title: "Fanatical Prospecting", author: "Jeb Blount", youtubeId: "OzjdOJuplPA" },
  { id: "good-to-great", title: "Good to Great", author: "Jim Collins", youtubeId: "ZsfrPu2sDxs" },
  { id: "outliers", title: "Outliers", author: "Malcolm Gladwell", youtubeId: "d1NSt7B8tEw" },
  { id: "millionaire-success-habits", title: "Millionaire Success Habits", author: "Dean Graziosi", youtubeId: "rS781-1vq38" },
  { id: "retire-young-rich", title: "Retire Young Retire Rich", author: "Robert Kiyosaki", youtubeId: "GqBTNQmYanY" },
  { id: "rich-dad-poor-dad", title: "Rich Dad Poor Dad", author: "Robert Kiyosaki", youtubeId: "seM_t6CAoVk" },
  { id: "rich-kid-smart-kid", title: "Rich Kid Smart Kid", author: "Robert Kiyosaki", youtubeId: "hwkHqmvy4O0" },
  { id: "science-of-getting-rich", title: "The Science of Getting Rich", author: "Wallace D. Wattles", youtubeId: "z1FU-hhuAHE" },
  { id: "see-you-at-the-top", title: "See You At the Top", author: "Zig Ziglar", youtubeId: "e8kItXC9v10" },
  { id: "sell-or-be-sold", title: "Sell or Be Sold", author: "Grant Cardone", youtubeId: "tc_RsyNZi5g" },
  { id: "serial-winner", title: "Serial Winner", author: "Larry Weidel", youtubeId: "h14D1Vtxk4s" },
  { id: "millionaire-morning", title: "The Millionaire Morning", author: "Dean Graziosi", youtubeId: "bDDNQ69gGKc" },
  { id: "the-one-thing", title: "The ONE Thing", author: "Gary Keller", youtubeId: "r5vEzbBKxkw" },
  { id: "power-of-habit", title: "The Power of Habit", author: "Charles Duhigg", youtubeId: "vliMWmBOII4" },
  { id: "richest-man-in-babylon", title: "The Richest Man in Babylon", author: "George S. Clason", youtubeId: "PUePKKThX10" },
  { id: "the-secret", title: "The Secret", author: "Rhonda Byrne", youtubeId: "iDThzkDkFks" },
  { id: "the-5am-club", title: "The 5AM Club", author: "Robin Sharma", youtubeId: "xaSc9ZgoE0Y" },
];

function ytThumb(id: string) {
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
}

const INITIAL_COUNT = 6;
const LOAD_MORE_COUNT = 6;

function formatTime(sec: number) {
  if (!sec || Number.isNaN(sec)) return "0:00";
  const total = Math.floor(sec);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Player khusus: YouTube di belakang, semua kontrol di overlay */
function YoutubeCustomPlayer({ video }: { video: Video }) {
  const frameHostRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<any>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);

  const AVAILABLE_RATES = [0.75, 1, 1.5];

  useEffect(() => {
    let interval: number | undefined;

    const initPlayer = () => {
      const w = window as any;
      if (!frameHostRef.current || !w.YT || !w.YT.Player) return;

      if (playerRef.current && typeof playerRef.current.destroy === "function") {
        playerRef.current.destroy();
        playerRef.current = null;
      }

      playerRef.current = new w.YT.Player(frameHostRef.current, {
        videoId: video.youtubeId,
        playerVars: {
          autoplay: 1,
          controls: 0,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
        },
        events: {
          onReady: (e: any) => {
            e.target.playVideo();
            e.target.setPlaybackRate(1);
            setPlaybackRate(1);
            setIsPlaying(true);
          },
          onStateChange: (e: any) => {
            if (e.data === w.YT.PlayerState.PLAYING) {
              setIsPlaying(true);
            } else if (
              e.data === w.YT.PlayerState.PAUSED ||
              e.data === w.YT.PlayerState.ENDED
            ) {
              setIsPlaying(false);
            }
          },
        },
      });

      interval = window.setInterval(() => {
        const p = playerRef.current;
        if (!p || typeof p.getCurrentTime !== "function") return;
        const ct = p.getCurrentTime();
        const dur = p.getDuration();
        setCurrentTime(ct || 0);
        setDuration(dur || 0);
        setProgress(dur ? Math.max(0, Math.min(1, ct / dur)) : 0);
      }, 500);
    };

    if (typeof window !== "undefined") {
      const w = window as any;
      if (w.YT && w.YT.Player) {
        initPlayer();
      } else {
        if (!document.getElementById("youtube-iframe-api")) {
          const tag = document.createElement("script");
          tag.id = "youtube-iframe-api";
          tag.src = "https://www.youtube.com/iframe_api";
          document.body.appendChild(tag);
        }
        w.onYouTubeIframeAPIReady = () => {
          initPlayer();
        };
      }
    }

    return () => {
      if (interval) window.clearInterval(interval);
      if (playerRef.current && typeof playerRef.current.destroy === "function") {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [video.youtubeId]);

  const handleTogglePlay = () => {
    const p = playerRef.current;
    if (!p) return;
    if (isPlaying) {
      p.pauseVideo();
    } else {
      p.playVideo();
    }
  };

  const handleToggleMute = () => {
    const p = playerRef.current;
    if (!p) return;
    if (isMuted) {
      p.unMute();
      setIsMuted(false);
    } else {
      p.mute();
      setIsMuted(true);
    }
  };

  const handleSeek = (deltaSeconds: number) => {
    const p = playerRef.current;
    if (!p || typeof p.getCurrentTime !== "function") return;
    const ct = p.getCurrentTime();
    const dur = p.getDuration() || 0;
    const target = Math.max(0, Math.min(dur, ct + deltaSeconds));
    p.seekTo(target, true);
  };

  const handleChangeRate = (rate: number) => {
    const p = playerRef.current;
    if (!p || typeof p.setPlaybackRate !== "function") return;
    p.setPlaybackRate(rate);
    setPlaybackRate(rate);
  };

  return (
    <div className="bg-white rounded-[28px] overflow-hidden shadow-2xl">
      <div className="relative w-full aspect-[16/9] bg-black">
        {/* kanvas YouTube */}
        <div ref={frameHostRef} className="absolute inset-0 w-full h-full" />

        {/* overlay full: semua klik kena ke overlay ini, bukan iframe */}
        <div className="absolute inset-0 pointer-events-auto">
          {/* area kosong atas */}
          <div className="absolute inset-0" />

          {/* kontrol bawah */}
          <div className="absolute inset-x-0 bottom-0 px-4 pb-3 pt-2 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
            {/* progress (view only) */}
            <div className="w-full h-1.5 rounded-full bg-white/20 overflow-hidden mb-2">
              <div
                className="h-full bg-white"
                style={{ width: `${progress * 100}%` }}
              />
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs text-white">
              {/* kiri: back / play / forward + time */}
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => handleSeek(-10)}
                  className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/90 text-slate-900 shadow hover:bg-white"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={handleTogglePlay}
                  className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-white text-slate-900 shadow hover:bg-slate-100"
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4 ml-[1px]" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleSeek(10)}
                  className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/90 text-slate-900 shadow hover:bg-white"
                >
                  <RotateCw className="w-4 h-4" />
                </button>

                <span className="tabular-nums ml-1">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              {/* kanan: mute + speed */}
              <div className="flex items-center justify-start sm:justify-end gap-3">
                <button
                  type="button"
                  onClick={handleToggleMute}
                  className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/90 text-slate-900 shadow hover:bg-white"
                >
                  {isMuted ? (
                    <VolumeX className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </button>

                <div className="flex items-center gap-1 bg-white/10 rounded-full px-2 py-1">
                  {AVAILABLE_RATES.map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => handleChangeRate(rate)}
                      className={[
                        "px-2 py-0.5 rounded-full text-[11px] font-medium",
                        playbackRate === rate
                          ? "bg-white text-slate-900"
                          : "text-white/80 hover:bg-white/20",
                      ].join(" ")}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================== PAGE =========================== */

type PlayerMode = "modal" | "mini" | null;

const FortisInsightPage: React.FC = () => {
  const [activeVideo, setActiveVideo] = useState<Video | null>(null);
  const [playerMode, setPlayerMode] = useState<PlayerMode>(null);
  const [visibleCount, setVisibleCount] = useState(INITIAL_COUNT);

  const visibleVideos = VIDEOS.slice(0, visibleCount);
  const hasMore = visibleCount < VIDEOS.length;

  const openVideo = (video: Video) => {
    setActiveVideo(video);
    setPlayerMode("modal");
  };

  const closeVideoCompletely = () => {
    setPlayerMode(null);
    setActiveVideo(null);
  };

  return (
    <div className="px-4 py-4 lg:px-8 lg:py-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-2 mb-6">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
          Fortis Insight
        </h1>
        <p className="text-sm md:text-base text-slate-500 max-w-2xl">
          Kumpulan ringkasan buku pilihan dari FortisLab. Klik salah satu kartu
          untuk mulai menonton tanpa perlu keluar dari FortisApp.
        </p>
      </div>

      {/* Grid cards */}
      <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
        {visibleVideos.map((video) => (
          <article
            key={video.id}
            className="bg-white rounded-[28px] shadow-[0_18px_45px_rgba(15,23,42,0.08)] overflow-hidden"
          >
            <button
              type="button"
              onClick={() => openVideo(video)}
              className="relative w-full aspect-[16/9] group"
            >
              <img
                src={ytThumb(video.youtubeId)}
                alt={video.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <div className="flex items-center justify-center w-14 h-14 rounded-full bg-white/95 shadow-lg group-hover:scale-110 transition-transform duration-150">
                  <Play className="w-6 h-6 text-red-500 ml-0.5" />
                </div>
                <span className="text-xs font-semibold tracking-[0.12em] text-white uppercase">
                  Mulai Tonton
                </span>
              </div>
            </button>

            <div className="px-6 pt-4 pb-6">
              <h2 className="text-lg md:text-xl font-semibold leading-tight text-slate-900">
                {video.title}
              </h2>
              <p className="text-xs md:text-sm text-slate-500 mt-1">
                {video.author}
              </p>
            </div>
          </article>
        ))}
      </div>

      {/* Load more */}
      {hasMore && (
        <div className="flex justify-center mt-8">
          <button
            type="button"
            onClick={() =>
              setVisibleCount((prev) =>
                Math.min(prev + LOAD_MORE_COUNT, VIDEOS.length)
              )
            }
            className="inline-flex items-center justify-center rounded-full px-6 py-2 text-sm font-medium bg-slate-900 text-white hover:bg-slate-800 shadow-md"
          >
            Lihat Video Lainnya
          </button>
        </div>
      )}

      {/* PLAYER (modal / mini) */}
      {activeVideo && playerMode && (
        <>
          {/* backdrop cuma kalau modal */}
          {playerMode === "modal" && (
            <div className="fixed inset-0 z-40 bg-black/70" />
          )}

          {/* container player: posisi tergantung mode */}
          <div
            className={
              playerMode === "modal"
                ? "fixed inset-0 z-50 flex items-center justify-center px-4"
                : "fixed bottom-4 right-4 z-50 w-[280px]"
            }
          >
            <div
              className={
                playerMode === "modal"
                  ? "relative w-full max-w-4xl"
                  : "relative w-full cursor-pointer"
              }
              // klik mini → balik ke modal
              onClick={() => {
                if (playerMode === "mini") {
                  setPlayerMode("modal");
                }
              }}
            >
              {/* Tombol close / minimize */}
              {playerMode === "modal" ? (
                // modal: X = MINIMIZE (video tetap jalan)
                <button
                  type="button"
                  onClick={() => setPlayerMode("mini")}
                  className="absolute -top-10 right-0 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow-lg hover:bg-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : (
                // mini: X = CLOSE TOTAL
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeVideoCompletely();
                  }}
                  className="absolute -top-2 -right-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-slate-800 shadow-md hover:bg-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              <YoutubeCustomPlayer video={activeVideo} />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default FortisInsightPage;
