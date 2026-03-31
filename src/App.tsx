import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import { Link } from "react-router-dom";

export default function App() {
  const [novels, setNovels] = useState<any[]>([]);

  async function fetchNovels() {
    const { data } = await supabase
      .from("novels")
      .select("*")
      .order("created_at", { ascending: false });
    setNovels(data || []);
  }

  useEffect(() => {
    fetchNovels();
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text-main)] relative overflow-hidden">

      {/* ── Atmospheric background ── */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[900px] h-[500px]"
          style={{ background: "radial-gradient(ellipse, rgba(201,168,76,0.07) 0%, transparent 70%)" }} />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px]"
          style={{ background: "radial-gradient(ellipse, rgba(45,27,78,0.35) 0%, transparent 65%)" }} />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px]"
          style={{ background: "radial-gradient(ellipse, rgba(139,26,26,0.1) 0%, transparent 65%)" }} />
        {/* Spirit wisps */}
        <div className="spirit-wisp" style={{"--wx":"15%","--wy":"30%","--wsize":"180px","--wc":"rgba(138,43,226,0.1)","--wdur":"9s"} as any} />
        <div className="spirit-wisp" style={{"--wx":"75%","--wy":"60%","--wsize":"220px","--wc":"rgba(201,168,76,0.07)","--wdur":"12s","--wdelay":"3s"} as any} />
        <div className="spirit-wisp" style={{"--wx":"50%","--wy":"80%","--wsize":"150px","--wc":"rgba(80,120,220,0.07)","--wdur":"8s","--wdelay":"1.5s"} as any} />
        {/* Floating rune particles */}
        <span className="rune-particle text-base" style={{"--rx":"8%","--ry":"70%","--rd":"5s","--rdelay":"0s"} as any}>ᚠ</span>
        <span className="rune-particle text-sm"  style={{"--rx":"88%","--ry":"40%","--rd":"7s","--rdelay":"2s"} as any}>ᛟ</span>
        <span className="rune-particle text-xs"  style={{"--rx":"22%","--ry":"85%","--rd":"4s","--rdelay":"1s"} as any}>ᚦ</span>
        <span className="rune-particle text-base" style={{"--rx":"65%","--ry":"20%","--rd":"6s","--rdelay":"3s"} as any}>ᛞ</span>
        <span className="rune-particle text-sm"  style={{"--rx":"45%","--ry":"55%","--rd":"8s","--rdelay":"4s"} as any}>ᚱ</span>
        <span className="rune-particle text-xs"  style={{"--rx":"78%","--ry":"88%","--rd":"5.5s","--rdelay":"0.5s"} as any}>ᛃ</span>
      </div>

      {/* ── Header ── */}
      <header className="relative z-10 flex items-center justify-between px-8 md:px-12 h-20
        border-b border-[var(--border-gold)] backdrop-blur-xl"
        style={{ background: "rgba(7,5,10,0.92)" }}
      >
        {/* Logo */}
        <div className="flex items-center gap-4">
          {/* Rune circle */}
          <div className="relative w-10 h-10 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border border-[var(--border-gold)] animate-spin-slow opacity-50" />
            <div className="absolute inset-[6px] rounded-full border border-[var(--gold-dim)] animate-spin-slow-rev opacity-50" />
            <span className="text-[var(--gold-dim)] text-[10px] animate-rune-flicker">✦</span>
          </div>
          <h1 className="font-cinzel text-xl md:text-2xl tracking-[0.3em] font-bold gold-text">
            NOVEL AI
          </h1>
        </div>

        <Link to="/create">
          <button className="btn-gold px-6 py-2.5 rounded-lg text-[11px]">
            ✦ Ciptakan Novel
          </button>
        </Link>
      </header>

      {/* ── Hero ── */}
      <section className="relative z-10 text-center px-6 md:px-12 pt-20 pb-14 animate-fadeUp">
        {/* Rune seal centerpiece */}
        <div className="rune-seal rune-seal--lg mx-auto mb-8 animate-float">
          <span className="rune-seal__inner text-2xl">✦</span>
        </div>

        <p className="font-cinzel text-[10px] tracking-[0.5em] text-[var(--gold-dim)] mb-4 uppercase">
          ✦ Forge Your Legend ✦
        </p>

        <h2 className="font-cinzel text-4xl md:text-6xl font-bold leading-tight mb-6 gold-text">
          Kisah Epik<br />Menanti
        </h2>

        <p className="max-w-xl mx-auto text-[var(--text-dim)] italic leading-relaxed text-lg font-crimson">
          Setiap dunia belum lahir sampai kamu menuliskannya.
          Biarkan AI menjadi pena yang menempa takdir.
        </p>
      </section>

      {/* ── Divider ── */}
      <div className="relative z-10 px-8 md:px-12 mb-10">
        <div className="mystic-divider">
          <span className="mystic-divider__glyphs">ᚠ ✦ Koleksi Novel ✦ ᛟ</span>
        </div>
      </div>

      {/* ── Novel Grid ── */}
      <main className="relative z-10 px-8 md:px-12 pb-28">
        {novels.length === 0 ? (
          <div className="text-center py-20">
            <div className="font-cinzel text-[var(--text-muted)] text-sm tracking-widest mb-4">
              BELUM ADA NOVEL
            </div>
            <p className="text-[var(--text-dim)] italic font-crimson">
              Mulailah menempa legenda pertamamu.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {novels.map((n, i) => (
              <Link to={`/novel/${n.id}`} key={n.id} className="block">
                <div
                  className="mystic-card card-hover rounded-2xl cursor-pointer h-full"
                  style={{
                    animationDelay: `${i * 0.1}s`,
                  }}
                >
                  <div className="mystic-sweep" />
                  {/* Corner glow */}
                  <div className="absolute top-0 right-0 w-20 h-20 rounded-bl-full"
                    style={{ background: "linear-gradient(225deg, rgba(201,168,76,0.12), transparent)" }} />
                  <div className="absolute top-3 right-4 text-[var(--gold-dim)] text-base animate-rune-flicker">✦</div>
                  {/* Rune particle */}
                  <span className="rune-particle text-xs" style={{"--rx":"80%","--ry":"75%","--rd":"5s","--rdelay":`${i*0.8}s`} as any}>ᚱ</span>

                  {/* Top accent line */}
                  <div className="absolute top-0 left-0 right-0 aether-line" />

                  <div className="p-7">
                    {/* Genre badges */}
                    {n.genre?.length > 0 && (
                      <div className="flex gap-2 flex-wrap mb-4">
                        {n.genre.slice(0, 2).map((g: string) => (
                          <span key={g} className="font-cinzel text-[9px] tracking-[0.2em] px-3 py-1 rounded-full
                            border border-[var(--border-gold)] text-[var(--gold-dim)] uppercase">
                            {g}
                          </span>
                        ))}
                      </div>
                    )}

                    <h3 className="font-cinzel text-base font-bold text-[var(--text-main)] mb-3 leading-snug
                      group-hover:text-[var(--gold)] transition">
                      {n.title}
                    </h3>

                    <p className="text-sm text-[var(--text-dim)] line-clamp-3 leading-relaxed font-crimson mb-6 italic">
                      {n.synopsis || "Tiada synopsis..."}
                    </p>

                    <div className="flex justify-between items-center pt-4
                      border-t border-[var(--border-gold)]">
                      <div className="flex gap-5 text-xs text-[var(--text-dim)]">
                        <span>
                          <span className="font-cinzel text-[var(--gold)] mr-1">
                            {n.chapter_count || 0}
                          </span>Bab
                        </span>
                      </div>
                      <span className="font-cinzel text-[10px] text-[var(--gold-dim)] tracking-[0.2em]">
                        {n.style?.toUpperCase()} →
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
