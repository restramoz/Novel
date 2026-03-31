import { useEffect, useRef, useState } from "react";
import { useMusicStore } from "../store/musicStore";

export default function MusicPlayer() {
  const { tracks, currentIndex, isPlaying, loopMode, togglePlay, next, prev, play, setLoopMode } =
    useMusicStore();

  const audioRef = useRef<HTMLAudioElement>(null);
  const [isOpen, setIsOpen]     = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  /* ── Sync play/pause ── */
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.play().catch((e) => console.warn("autoplay blocked:", e));
    } else {
      audio.pause();
    }
  }, [isPlaying]);

  /* ── Change track ── */
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || tracks.length === 0) return;
    const url = tracks[currentIndex]?.file_url || "";
    if (!url) return;
    audio.src = url;
    audio.load();
    setProgress(0);
    setDuration(0);
    if (isPlaying) {
      // Wait for canplay before playing to avoid AbortError
      const onCanPlay = () => {
        audio.play().catch(() => {});
        audio.removeEventListener("canplay", onCanPlay);
      };
      audio.addEventListener("canplay", onCanPlay);
    }
  }, [currentIndex, tracks]);

  /* ── Progress ── */
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setProgress(audio.currentTime);
    const onMeta = () => setDuration(audio.duration || 0);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
    };
  }, []);

  function handleEnded() {
    if (loopMode === "one") {
      audioRef.current?.play().catch(() => {});
    } else {
      next();
    }
  }

  function handleSeek(e: React.MouseEvent<HTMLDivElement>) {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect  = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    audio.currentTime = ratio * duration;
  }

  function fmt(s: number) {
    if (!s || isNaN(s)) return "0:00";
    const m   = Math.floor(s / 60);
    const sec = Math.floor(s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  }

  const loopConfig = {
    none: { label: "🔁 Off", next: "all"  as const, color: "var(--text-muted)" },
    all:  { label: "🔁 All", next: "one"  as const, color: "var(--gold)" },
    one:  { label: "🔂 One", next: "none" as const, color: "var(--gold-bright)" },
  };

  const current     = tracks[currentIndex];
  const progressPct = duration ? (progress / duration) * 100 : 0;

  /* ─────────────────────────────────────────────────
     CRITICAL: <audio> ALWAYS rendered — never unmounts
     This is what keeps music playing when UI is closed
  ───────────────────────────────────────────────── */
  return (
    <>
      {/* Always-present audio element — never unmounts */}
      <audio ref={audioRef} onEnded={handleEnded} />

      {/* Nothing to show if no tracks */}
      {tracks.length === 0 ? null : isOpen ? (

        /* ── Expanded player ── */
        <div
          className="fixed bottom-6 right-6 z-50 w-[300px] rounded-2xl border border-[var(--border-gold)] overflow-hidden animate-fadeIn"
          style={{
            background: "linear-gradient(160deg, var(--bg-card) 0%, rgba(45,27,78,0.4) 100%)",
            backdropFilter: "blur(24px)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(201,168,76,0.05), inset 0 1px 0 rgba(201,168,76,0.1)",
          }}
        >
          {/* Top accent */}
          <div className="h-px w-full"
            style={{ background: "linear-gradient(90deg, transparent, rgba(201,168,76,0.6), transparent)" }} />

          <div className="p-5">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
              <span className="font-cinzel text-[10px] tracking-[0.3em] text-[var(--gold-dim)] uppercase">
                ♪ Now Playing
              </span>
              <button
                onClick={() => setIsOpen(false)}
                className="text-[var(--text-dim)] hover:text-[var(--text-main)] transition text-lg leading-none"
              >×</button>
            </div>

            {/* Track info */}
            <div className="flex gap-4 items-center mb-4">
              <div
                className="w-14 h-14 rounded-xl flex-shrink-0 flex items-center justify-center border border-[var(--border-gold)]"
                style={{ background: "linear-gradient(135deg, rgba(45,27,78,0.9), var(--bg))" }}
              >
                <div className="relative w-10 h-10">
                  <div className={`absolute inset-0 rounded-full border border-[var(--border-gold)] ${isPlaying ? "animate-spin-slow" : ""} opacity-60`} />
                  <div className={`absolute inset-[5px] rounded-full border border-[var(--gold-dim)] ${isPlaying ? "animate-spin-slow-rev" : ""} opacity-60`} />
                  <div className="absolute inset-0 flex items-center justify-center text-[var(--gold-dim)] text-xs">✦</div>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-cinzel text-sm font-semibold text-[var(--text-main)] truncate">
                  {current?.title || "Unknown"}
                </div>
                <div className="font-cinzel text-[10px] text-[var(--text-dim)] mt-1 tracking-wider">
                  {currentIndex + 1} / {tracks.length}
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mb-1">
              <div
                className="h-1 rounded-full cursor-pointer relative"
                style={{ background: "rgba(255,255,255,0.06)" }}
                onClick={handleSeek}
              >
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${progressPct}%`, background: "linear-gradient(90deg, var(--gold-dim), var(--gold))" }}
                />
                <div
                  className="absolute top-1/2 w-3 h-3 rounded-full"
                  style={{ left: `${progressPct}%`, transform: "translate(-50%, -50%)", background: "var(--gold)", boxShadow: "0 0 8px var(--gold)" }}
                />
              </div>
              <div className="flex justify-between font-cinzel text-[9px] text-[var(--text-muted)] mt-1.5">
                <span>{fmt(progress)}</span>
                <span>{fmt(duration)}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-2 my-4">
              <button onClick={prev} className={playerBtn}>⏮</button>

              <button
                onClick={togglePlay}
                className="w-11 h-11 rounded-full flex items-center justify-center text-[var(--bg)] font-bold text-base transition hover:scale-105"
                style={{ background: "linear-gradient(135deg, var(--gold-dim), var(--gold))", boxShadow: "0 0 20px rgba(201,168,76,0.4)" }}
              >
                {isPlaying ? "⏸" : "▶"}
              </button>

              <button onClick={next} className={playerBtn}>⏭</button>

              <button
                onClick={() => setLoopMode(loopConfig[loopMode].next)}
                className={`${playerBtn} text-[11px]`}
                style={{ color: loopConfig[loopMode].color }}
              >
                {loopConfig[loopMode].label}
              </button>
            </div>

            {/* Track list */}
            <div className="border-t border-[var(--border-gold)] pt-3 max-h-[130px] overflow-y-auto">
              {tracks.map((t, i) => (
                <div
                  key={t.id}
                  onClick={() => play(i)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition"
                  style={{ background: i === currentIndex ? "rgba(201,168,76,0.08)" : "transparent" }}
                >
                  <span className={`font-cinzel text-[11px] flex-1 truncate ${i === currentIndex ? "text-[var(--gold)]" : "text-[var(--text-dim)]"}`}>
                    {i === currentIndex && isPlaying ? "▶ " : `${i + 1}. `}
                    {t.title}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

      ) : (
        /* ── Mini button (collapsed) ── */
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center border border-[var(--border-gold)] animate-glow transition hover:scale-105"
          style={{ background: "linear-gradient(135deg, var(--bg-card), rgba(45,27,78,0.8))" }}
        >
          <span className={`text-xl ${isPlaying ? "animate-pulse-gold" : ""}`}>🎵</span>
        </button>
      )}
    </>
  );
}

const playerBtn =
  "w-9 h-9 rounded-xl flex items-center justify-center text-sm transition hover:scale-105 " +
  "border border-[var(--border-gold)] text-[var(--text-main)] " +
  "bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)]";
