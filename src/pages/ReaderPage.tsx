import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function ReaderPage() {
  const { id, chapterId } = useParams<{ id: string; chapterId: string }>();
  const navigate = useNavigate();

  const [chapter,  setChapter]  = useState<any>(null);
  const [chapters, setChapters] = useState<any[]>([]);
  const [novel,    setNovel]    = useState<any>(null);
  const [loading,  setLoading]  = useState(true);
  const [fontSize, setFontSize] = useState(19);
  const [showUI,      setShowUI]      = useState(true);
  const [showSidebar, setShowSidebar] = useState(false);
  const [progress,    setProgress]    = useState(0);

  const contentRef = useRef<HTMLDivElement>(null);
  const uiTimer    = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (id && chapterId) fetchData();
  }, [id, chapterId]);

  async function fetchData() {
    setLoading(true);
    const [chapRes, allChapRes, novelRes] = await Promise.all([
      supabase.from("chapters").select("*").eq("id", chapterId).single(),
      supabase.from("chapters").select("id,chapter_number,title").eq("novel_id", id).order("chapter_number", { ascending: true }),
      supabase.from("novels").select("title,style").eq("id", id).single(),
    ]);
    if (chapRes.data)    setChapter(chapRes.data);
    if (allChapRes.data) setChapters(allChapRes.data);
    if (novelRes.data)   setNovel(novelRes.data);
    setLoading(false);
    window.scrollTo(0, 0);
  }

  // Track scroll progress
  useEffect(() => {
    function onScroll() {
      const el  = document.documentElement;
      const pct = el.scrollTop / (el.scrollHeight - el.clientHeight);
      setProgress(Math.min(100, Math.round(pct * 100)));
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Auto-hide UI on inactivity
  function resetUITimer() {
    setShowUI(true);
    clearTimeout(uiTimer.current);
    uiTimer.current = setTimeout(() => setShowUI(false), 4000);
  }

  useEffect(() => {
    resetUITimer();
    window.addEventListener("mousemove", resetUITimer);
    window.addEventListener("touchstart", resetUITimer);
    return () => {
      window.removeEventListener("mousemove", resetUITimer);
      window.removeEventListener("touchstart", resetUITimer);
      clearTimeout(uiTimer.current);
    };
  }, []);

  const currentIndex = chapters.findIndex((c) => c.id === chapterId);
  const prevChap     = chapters[currentIndex - 1];
  const nextChap     = chapters[currentIndex + 1];

  function goTo(chapId: string) {
    navigate(`/novel/${id}/read/${chapId}`);
  }

  if (loading) return (
    <div className="min-h-screen bg-[#0d0b12] flex items-center justify-center">
      <div className="relative w-14 h-14">
        <div className="absolute inset-0 rounded-full border border-[var(--gold)] opacity-30" />
        <div className="absolute inset-0 rounded-full border-2 border-t-transparent border-[var(--gold)] animate-spin" />
      </div>
    </div>
  );

  if (!chapter) return (
    <div className="min-h-screen bg-[#0d0b12] flex items-center justify-center">
      <p className="font-cinzel text-[var(--text-dim)] tracking-widest">BAB TIDAK DITEMUKAN</p>
    </div>
  );

  const estimatedMinutes = Math.ceil((chapter.word_count || 0) / 200);

  return (
    <div className="min-h-screen bg-[#0c0a10] text-[#e8e0d0]">

      {/* ── Mystic background ── */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="spirit-wisp" style={{"--wx":"10%","--wy":"30%","--wsize":"200px","--wc":"rgba(138,43,226,0.07)","--wdur":"11s"} as any} />
        <div className="spirit-wisp" style={{"--wx":"80%","--wy":"65%","--wsize":"180px","--wc":"rgba(201,168,76,0.05)","--wdur":"14s","--wdelay":"5s"} as any} />
        <span className="rune-particle" style={{"--rx":"3%","--ry":"45%","--rd":"7s","--rdelay":"1s","--rs":"0.75rem"} as any}>ᚠ</span>
        <span className="rune-particle" style={{"--rx":"93%","--ry":"30%","--rd":"5s","--rdelay":"2.5s","--rs":"0.7rem"} as any}>ᛟ</span>
        <span className="rune-particle" style={{"--rx":"50%","--ry":"90%","--rd":"6s","--rdelay":"0s","--rs":"0.65rem"} as any}>ᚦ</span>
      </div>

      {/* Reading progress bar */}
      <div className="fixed top-0 left-0 right-0 h-[2px] z-50"
        style={{ background: "rgba(255,255,255,0.05)" }}>
        <div className="h-full transition-all duration-150"
          style={{
            width: `${progress}%`,
            background: "linear-gradient(90deg, var(--gold-dim), var(--gold))",
          }} />
      </div>

      {/* Top Nav — auto-hides */}
      <div className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${showUI ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-full"}`}>
        <div className="h-12 flex items-center justify-between px-6 md:px-10"
          style={{ background: "rgba(12,10,16,0.95)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(201,168,76,0.12)" }}>
          <button onClick={() => navigate(`/novel/${id}`)}
            className="font-cinzel text-[10px] tracking-[0.25em] text-[var(--text-dim)] hover:text-[var(--gold)] transition">
            ← {novel?.title || "Novel"}
          </button>
          <span className="font-cinzel text-[10px] tracking-widest text-[var(--text-muted)] hidden md:block">
            {novel?.style?.toUpperCase()}
          </span>
          <div className="flex items-center gap-3">
            {/* Font size */}
            <button onClick={() => setFontSize((v) => Math.max(14, v - 1))}
              className="w-7 h-7 rounded-lg border border-[rgba(201,168,76,0.2)] text-[var(--text-dim)]
                hover:border-[var(--gold)] hover:text-[var(--gold)] transition text-xs font-bold flex items-center justify-center">A-</button>
            <button onClick={() => setFontSize((v) => Math.min(28, v + 1))}
              className="w-7 h-7 rounded-lg border border-[rgba(201,168,76,0.2)] text-[var(--text-dim)]
                hover:border-[var(--gold)] hover:text-[var(--gold)] transition text-sm font-bold flex items-center justify-center">A+</button>
          {/* Chapter list toggle */}
            <button
              onClick={() => setShowSidebar((v) => !v)}
              className={`w-7 h-7 rounded-lg border transition flex items-center justify-center ${
                showSidebar
                  ? "border-[var(--gold)] text-[var(--gold)]"
                  : "border-[rgba(201,168,76,0.2)] text-[var(--text-dim)] hover:border-[var(--gold)] hover:text-[var(--gold)]"
              }`}
              title="Daftar Bab"
            >
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                <rect x="0" y="1" width="14" height="1.5" rx="0.75" fill="currentColor"/>
                <rect x="0" y="6" width="14" height="1.5" rx="0.75" fill="currentColor"/>
                <rect x="0" y="11" width="14" height="1.5" rx="0.75" fill="currentColor"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Chapter Sidebar */}
      <>
        {/* Backdrop */}
        <div
          className={`fixed inset-0 z-40 transition-opacity duration-300 ${showSidebar ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setShowSidebar(false)}
        />
        {/* Panel */}
        <div
          className={`fixed top-0 right-0 h-full z-50 w-72 flex flex-col transition-transform duration-300 ${showSidebar ? "translate-x-0" : "translate-x-full"}`}
          style={{ background: "rgba(12,10,16,0.98)", backdropFilter: "blur(24px)", borderLeft: "1px solid rgba(201,168,76,0.15)" }}
        >
          {/* Sidebar header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(201,168,76,0.12)] relative">
            <div className="aether-line absolute bottom-0 left-0 right-0" />
            <span className="font-cinzel text-[11px] tracking-[0.3em] text-[var(--gold)] animate-rune-flicker">ᚠ DAFTAR BAB ᛟ</span>
            <button
              onClick={() => setShowSidebar(false)}
              className="text-[var(--text-muted)] hover:text-[var(--gold)] transition text-lg leading-none"
            >✕</button>
          </div>
          {/* Chapter list */}
          <div className="flex-1 overflow-y-auto py-2">
            {chapters.map((c) => {
              const isActive = c.id === chapterId;
              return (
                <button
                  key={c.id}
                  onClick={() => { goTo(c.id); setShowSidebar(false); }}
                  className={`w-full text-left px-5 py-3 transition-colors ${
                    isActive
                      ? "bg-[rgba(201,168,76,0.1)] border-r-2 border-[var(--gold)]"
                      : "hover:bg-[rgba(255,255,255,0.03)]"
                  }`}
                >
                  <div className={`font-cinzel text-[9px] tracking-[0.25em] mb-0.5 ${isActive ? "text-[var(--gold)]" : "text-[var(--text-muted)]"}`}>
                    BAB {c.chapter_number}
                  </div>
                  <div className={`font-crimson text-sm leading-snug truncate ${isActive ? "text-[var(--gold)]" : "text-[var(--text-dim)]"}`}>
                    {c.title}
                  </div>
                </button>
              );
            })}
          </div>
          {/* Footer */}
          <div className="px-5 py-3 border-t border-[rgba(201,168,76,0.12)]">
            <p className="font-cinzel text-[9px] tracking-widest text-[var(--text-muted)] text-center">
              {chapter.chapter_number} / {chapters.length} BAB
            </p>
          </div>
        </div>
      </>

      {/* Content */}
      <div className="max-w-[680px] mx-auto px-6 md:px-0 pt-20 pb-32" ref={contentRef}>

        {/* Chapter header */}
        <div className="text-center mb-12 pt-8">
          <p className="font-cinzel text-[10px] tracking-[0.5em] text-[var(--gold-dim)] mb-3 uppercase animate-rune-flicker">
            ✦ Bab {chapter.chapter_number} ✦
          </p>
          <h1 className="font-cinzel text-2xl md:text-3xl font-bold text-[#f0e8d5] mb-4 leading-snug">
            {chapter.title}
          </h1>
          <div className="flex items-center justify-center gap-4 text-[11px] font-cinzel text-[var(--text-muted)] tracking-wider">
            <span>{chapter.word_count?.toLocaleString() || 0} kata</span>
            <span>·</span>
            <span>~{estimatedMinutes} menit baca</span>
            <span>·</span>
            <span>{progress}%</span>
          </div>
          <div className="mt-6 flex items-center gap-3">
            <div className="flex-1 aether-line" />
            <div className="rune-seal rune-seal--sm">
              <span className="rune-seal__inner text-sm">✦</span>
            </div>
            <div className="flex-1 aether-line" />
          </div>
        </div>

        {/* Chapter body */}
        <div className="font-crimson leading-[2.0] whitespace-pre-wrap break-words"
          style={{ fontSize: `${fontSize}px`, color: "#ddd4c0", letterSpacing: "0.01em" }}>
          {chapter.content_text}
        </div>

        {/* Bottom divider */}
        <div className="mt-16 mb-12">
          <div className="mystic-divider">
            <span className="mystic-divider__glyphs">ᛟ ✦ Tamat ✦ ᚠ</span>
          </div>
        </div>

        {/* Chapter navigation */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => prevChap && goTo(prevChap.id)}
            disabled={!prevChap}
            className={`rounded-xl border p-4 text-left transition ${
              prevChap
                ? "border-[var(--border-gold)] hover:border-[var(--gold)] cursor-pointer"
                : "border-[rgba(255,255,255,0.05)] opacity-30 cursor-default"
            }`}
            style={{ background: "rgba(201,168,76,0.04)" }}
          >
            <div className="font-cinzel text-[9px] tracking-[0.3em] text-[var(--gold-dim)] mb-1">← SEBELUMNYA</div>
            {prevChap && (
              <div className="font-cinzel text-xs text-[var(--text-main)] truncate">
                Bab {prevChap.chapter_number} — {prevChap.title}
              </div>
            )}
          </button>

          <button
            onClick={() => nextChap && goTo(nextChap.id)}
            disabled={!nextChap}
            className={`rounded-xl border p-4 text-right transition ${
              nextChap
                ? "border-[var(--border-gold)] hover:border-[var(--gold)] cursor-pointer"
                : "border-[rgba(255,255,255,0.05)] opacity-30 cursor-default"
            }`}
            style={{ background: "rgba(201,168,76,0.04)" }}
          >
            <div className="font-cinzel text-[9px] tracking-[0.3em] text-[var(--gold-dim)] mb-1">BERIKUTNYA →</div>
            {nextChap && (
              <div className="font-cinzel text-xs text-[var(--text-main)] truncate">
                Bab {nextChap.chapter_number} — {nextChap.title}
              </div>
            )}
          </button>
        </div>

        {/* Back to novel */}
        <div className="text-center mt-8">
          <button onClick={() => navigate(`/novel/${id}`)}
            className="font-cinzel text-[10px] tracking-[0.3em] text-[var(--text-muted)] hover:text-[var(--gold)] transition uppercase">
            ✦ Kembali ke Novel ✦
          </button>
        </div>
      </div>

      {/* Chapter list sidebar trigger — bottom center */}
      <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-40 transition-all duration-300 ${showUI ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
        <div className="flex items-center gap-2 rounded-full border border-[rgba(201,168,76,0.2)] px-4 py-2"
          style={{ background: "rgba(12,10,16,0.9)", backdropFilter: "blur(20px)" }}>
          <span className="font-cinzel text-[9px] text-[var(--gold-dim)] animate-rune-flicker">ᚠ</span>
          <span className="font-cinzel text-[10px] tracking-widest text-[var(--gold-dim)]">
            {chapter.chapter_number} / {chapters.length}
          </span>
          <span className="font-cinzel text-[9px] text-[var(--gold-dim)] animate-rune-flicker delay-3">ᛟ</span>
        </div>
      </div>
    </div>
  );
}
