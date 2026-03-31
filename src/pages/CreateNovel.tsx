import { useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate, Link } from "react-router-dom";
import { generateCharacters } from "../features/character/api";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const STYLES = ["Cultivation", "Fantasy", "RPG", "Dark Fantasy", "Isekai", "Xianxia"];

export default function CreateNovel() {
  const [title, setTitle]     = useState("");
  const [synopsis, setSynopsis] = useState("");
  const [genre, setGenre]     = useState("");
  const [style, setStyle]     = useState("Cultivation");
  const [loading, setLoading] = useState(false);
  const isCreating            = useRef(false);

  const navigate = useNavigate();

  async function handleCreate() {
    if (!title.trim()) return alert("Judul wajib diisi");
    if (isCreating.current) return;
    isCreating.current = true;
    setLoading(true);

    const { data, error } = await supabase
      .from("novels")
      .insert({
        title: title.trim(),
        synopsis,
        genre: genre.split(",").map((g) => g.trim()).filter(Boolean),
        style,
      })
      .select()
      .single();

    if (error) {
      console.error(error);
      alert("Error membuat novel");
      setLoading(false);
      isCreating.current = false;
      return;
    }

    navigate(`/novel/${data.id}`);

    generateCharacters(data.id, synopsis).catch((err) =>
      console.error("❌ Generate background error:", err)
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text-main)] relative overflow-hidden">

      {/* ── Background ── */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute left-1/2 -translate-x-1/2 top-[-15%] w-[800px] h-[500px]"
          style={{ background: "radial-gradient(ellipse, rgba(201,168,76,0.07) 0%, transparent 70%)" }} />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px]"
          style={{ background: "radial-gradient(ellipse, rgba(45,27,78,0.3) 0%, transparent 65%)" }} />
        {/* Spirit wisps */}
        <div className="spirit-wisp" style={{"--wx":"5%","--wy":"50%","--wsize":"200px","--wc":"rgba(138,43,226,0.09)","--wdur":"10s"} as any} />
        <div className="spirit-wisp" style={{"--wx":"80%","--wy":"30%","--wsize":"160px","--wc":"rgba(201,168,76,0.06)","--wdur":"13s","--wdelay":"4s"} as any} />
        {/* Rune particles */}
        <span className="rune-particle" style={{"--rx":"5%","--ry":"60%","--rd":"6s","--rdelay":"0s","--rs":"0.9rem"} as any}>ᚨ</span>
        <span className="rune-particle" style={{"--rx":"90%","--ry":"50%","--rd":"5s","--rdelay":"1.5s","--rs":"0.7rem"} as any}>ᛒ</span>
        <span className="rune-particle" style={{"--rx":"30%","--ry":"80%","--rd":"7s","--rdelay":"3s","--rs":"0.8rem"} as any}>ᛗ</span>
        <span className="rune-particle" style={{"--rx":"70%","--ry":"70%","--rd":"4.5s","--rdelay":"2s","--rs":"0.65rem"} as any}>ᚲ</span>
      </div>

      {/* ── Header ── */}
      <header className="relative z-10 flex items-center justify-between px-8 md:px-12 h-20
        border-b border-[var(--border-gold)] backdrop-blur-xl"
        style={{ background: "rgba(7,5,10,0.92)" }}
      >
        <Link to="/">
          <button className="font-cinzel text-[11px] tracking-[0.2em] text-[var(--text-dim)]
            hover:text-[var(--gold)] transition flex items-center gap-2">
            ← Beranda
          </button>
        </Link>
        <h1 className="font-cinzel text-base tracking-[0.2em] gold-text font-bold">
          Creation Ritual
        </h1>
        <div className="w-24" />
      </header>

      {/* ── Form ── */}
      <div className="relative z-10 max-w-xl mx-auto px-6 py-16 animate-fadeUp">

        {/* Title area */}
        <div className="text-center mb-12">
          <div className="rune-seal mx-auto mb-6 animate-float">
            <span className="rune-seal__inner">✦</span>
          </div>
          <p className="font-cinzel text-[10px] tracking-[0.4em] text-[var(--gold-dim)] uppercase mb-3">
            ✦ Tempa Legenda Baru ✦
          </p>
          <h2 className="font-cinzel text-3xl font-bold gold-text">Ciptakan Dunia Baru</h2>
          <p className="text-[var(--text-dim)] italic font-crimson mt-3 text-base">
            Setiap kisah agung berawal dari sebuah synopsis.
          </p>
        </div>

        {/* Card form */}
        <div className="mystic-card rune-border rounded-2xl overflow-hidden">
          <div className="mystic-sweep" />
          {/* Top accent */}
          <div className="aether-line w-full" />

          <div className="p-8 space-y-7">

            {/* Judul */}
            <div className="space-y-2.5">
              <Label>✦ Judul Novel</Label>
              <Input
                placeholder="Contoh: Warisan Langit Kedelapan"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input-gold bg-white/[0.03] border-[var(--border-gold)]
                  focus-visible:ring-0 font-cinzel text-base placeholder:font-crimson
                  placeholder:text-[var(--text-muted)] placeholder:italic"
              />
            </div>

            {/* Synopsis */}
            <div className="space-y-2.5">
              <Label>✦ Synopsis</Label>
              <Textarea
                placeholder="Ceritakan latar belakang dunia, konflik utama, dan takdir sang protagonis..."
                value={synopsis}
                onChange={(e) => setSynopsis(e.target.value)}
                rows={6}
                className="input-gold bg-white/[0.03] border-[var(--border-gold)]
                  focus-visible:ring-0 font-crimson text-base leading-relaxed resize-none
                  placeholder:text-[var(--text-muted)] placeholder:italic"
              />
            </div>

            {/* Genre + Style */}
            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-2.5">
                <Label>✦ Genre</Label>
                <Input
                  placeholder="Fantasy, Cultivation..."
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  className="input-gold bg-white/[0.03] border-[var(--border-gold)]
                    focus-visible:ring-0 font-crimson placeholder:text-[var(--text-muted)]
                    placeholder:italic text-base"
                />
                <p className="text-[11px] text-[var(--text-muted)] font-cinzel tracking-wider">
                  Pisahkan dengan koma
                </p>
              </div>

              <div className="space-y-2.5">
                <Label>✦ Gaya Penulisan</Label>
                <Select value={style} onValueChange={setStyle}>
                  <SelectTrigger className="input-gold bg-white/[0.03] border-[var(--border-gold)]
                    focus:ring-0 font-crimson text-base">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[var(--bg-card)] border-[var(--border-gold)]">
                    {STYLES.map((s) => (
                      <SelectItem key={s} value={s}
                        className="font-crimson text-[var(--text-main)] focus:bg-[rgba(201,168,76,0.1)]
                          focus:text-[var(--gold)] cursor-pointer">
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Divider */}
            <div className="mystic-divider">
              <span className="mystic-divider__glyphs">ᚠ ✦ ᛟ</span>
            </div>

            {/* Submit */}
            <Button
              onClick={handleCreate}
              disabled={loading}
              className="btn-gold w-full py-6 rounded-xl text-[12px] font-bold"
            >
              {loading ? (
                <span className="flex items-center gap-3">
                  <span className="w-4 h-4 border-2 border-[var(--gold)] border-t-transparent rounded-full animate-spin" />
                  Menempa Novel...
                </span>
              ) : "✦ Tempa Novel Ini ✦"}
            </Button>

          </div>
        </div>
      </div>
    </div>
  );
}
