import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { generateCharacters, addCharacterManually } from "../features/character/api";
import { generateMasterConcept } from "../features/masterConcept/api";
import { generateNextChapter } from "../features/chapter/api";
import { useMusicStore } from "../store/musicStore";
import { useSettingsStore, AVAILABLE_MODELS } from "../store/settingsStore";

import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input }    from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label }    from "@/components/ui/label";
import {
  Select, SelectTrigger, SelectContent, SelectItem, SelectValue,
} from "@/components/ui/select";

/* ──────────────────────────────────────
   TYPES
────────────────────────────────────── */
type Tab          = "bab" | "character" | "masterConcept" | "musik";
type LoadingStage = "" | "character" | "concept" | "chapter";

const ROLE_CFG: Record<string, { bg: string; border: string; color: string; icon: string }> = {
  protagonist: { bg:"rgba(107,70,193,0.15)", border:"rgba(107,70,193,0.45)", color:"#A78BFA", icon:"⚔️" },
  antagonist:  { bg:"rgba(139,26,26,0.2)",   border:"rgba(192,57,43,0.5)",   color:"#F87171", icon:"💀" },
  supporting:  { bg:"rgba(201,168,76,0.1)",  border:"rgba(201,168,76,0.3)",  color:"#C9A84C", icon:"🌟" },
};

/* ──────────────────────────────────────
   SMALL REUSABLE COMPONENTS
────────────────────────────────────── */
function RoleBadge({ role }: { role: string }) {
  const c = ROLE_CFG[role?.toLowerCase()] || ROLE_CFG.supporting;
  return (
    <span className="font-cinzel text-[9px] tracking-[0.2em] px-3 py-1 rounded-full uppercase"
      style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.color }}>
      {role}
    </span>
  );
}

function GenBtn({ onClick, loading, label, loadingLabel }: {
  onClick: () => void; loading: boolean; label: string; loadingLabel: string;
}) {
  return (
    <button onClick={onClick} disabled={loading} className="btn-gold px-5 py-2 rounded-lg text-[11px]">
      {loading
        ? <span className="flex items-center gap-2">
            <span className="w-3 h-3 border border-[var(--gold)] border-t-transparent rounded-full animate-spin" />
            {loadingLabel}
          </span>
        : label}
    </button>
  );
}

/* ──────────────────────────────────────
   HELPER — Parse field DB ke section UI

   DB characters, 4 kolom konten:
     physical_traits → "deskripsi | Usia: x | Cara bicara: y"
     personality     → "Kepribadian: ... | Latar: ... | Motivasi: ... | Kelemahan: ... | Arc: ..."
     abilities       → teks langsung
     relationships   → teks langsung

   parseCharFields   → untuk display card & form edit
   mergeCharFields   → untuk simpan kembali ke DB
────────────────────────────────────── */
function splitSection(raw: string, label: string): string {
  const marker = `${label}: `;
  const start  = raw.indexOf(marker);
  if (start === -1) return "";
  const after  = raw.slice(start + marker.length);
  const next   = after.indexOf(" | ");
  return (next === -1 ? after : after.slice(0, next)).trim();
}

function parseCharFields(c: any) {
  const phys = c.physical_traits || "";
  const pers = c.personality     || "";

  const physParts   = phys.split(" | ");
  const physBase    = physParts
    .filter((p: string) => !p.startsWith("Usia:") && !p.startsWith("Cara bicara:"))
    .join(" | ");
  const age         = physParts.find((p: string) => p.startsWith("Usia:"))
    ?.replace("Usia:", "").trim() || "";
  const speechStyle = physParts.find((p: string) => p.startsWith("Cara bicara:"))
    ?.replace("Cara bicara:", "").trim() || "";

  return {
    name:            c.name          || "",
    role:            c.role          || "supporting",
    physical_traits: physBase,
    age,
    speech_style:    speechStyle,
    personality:     splitSection(pers, "Kepribadian") || pers.split(" | ")[0] || pers,
    backstory:       splitSection(pers, "Latar"),
    motivation:      splitSection(pers, "Motivasi"),
    weaknesses:      splitSection(pers, "Kelemahan"),
    arc:             splitSection(pers, "Arc"),
    abilities:       c.abilities     || "",
    relationships:   c.relationships || "",
  };
}

function mergeCharFields(form: any) {
  const physParts = [
    form.physical_traits?.trim(),
    form.age?.trim()          && `Usia: ${form.age.trim()}`,
    form.speech_style?.trim() && `Cara bicara: ${form.speech_style.trim()}`,
  ].filter(Boolean);

  const persParts = [
    form.personality?.trim()  && `Kepribadian: ${form.personality.trim()}`,
    form.backstory?.trim()    && `Latar: ${form.backstory.trim()}`,
    form.motivation?.trim()   && `Motivasi: ${form.motivation.trim()}`,
    form.weaknesses?.trim()   && `Kelemahan: ${form.weaknesses.trim()}`,
    form.arc?.trim()          && `Arc: ${form.arc.trim()}`,
  ].filter(Boolean);

  return {
    name:            (form.name  || "Tanpa Nama").trim(),
    role:             form.role  || "supporting",
    physical_traits: physParts.join(" | "),
    personality:     persParts.join(" | "),
    abilities:       (form.abilities     || "").trim(),
    relationships:   (form.relationships || "").trim(),
  };
}

/* ──────────────────────────────────────
   AI SETTINGS DIALOG
────────────────────────────────────── */
function AISettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { selectedModel, temperature, repeat_penalty, max_tokens, setModel, setTemperature, setRepeatPenalty, setMaxTokens } =
    useSettingsStore();

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-cinzel text-[var(--gold)] tracking-widest">⚙ Pengaturan AI</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 mt-2">

          {/* Model */}
          <div className="space-y-2">
            <Label>Model AI</Label>
            <Select value={selectedModel} onValueChange={setModel}>
              <SelectTrigger className="input-gold bg-white/[0.03] border-[var(--border-gold)] font-crimson">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[var(--bg-card)] border-[var(--border-gold)]">
                {AVAILABLE_MODELS.map((m) => (
                  <SelectItem key={m.value} value={m.value}
                    className="font-crimson text-[var(--text-main)] focus:bg-[rgba(201,168,76,0.1)] focus:text-[var(--gold)] cursor-pointer">
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-[var(--text-muted)] font-cinzel tracking-wider">
              Model yang lebih besar = kualitas lebih baik, tapi lebih lambat
            </p>
          </div>

          {/* Temperature */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label>Kreativitas (Temperature)</Label>
              <span className="font-cinzel text-[var(--gold)] text-sm">{temperature.toFixed(2)}</span>
            </div>
            <input
              type="range" min={0.1} max={1.5} step={0.01}
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full accent-[var(--gold)]"
            />
            <div className="flex justify-between font-cinzel text-[10px] text-[var(--text-muted)]">
              <span>Konservatif (0.1)</span>
              <span>Liar (1.5)</span>
            </div>
            <p className="text-[11px] text-[var(--text-muted)] font-cinzel tracking-wider">
              Rekomendasi: 0.85–1.0 untuk fiksi kreatif
            </p>
          </div>

          {/* Repeat Penalty */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label>Anti-Repetisi (Repeat Penalty)</Label>
              <span className="font-cinzel text-[var(--gold)] text-sm">{repeat_penalty.toFixed(2)}</span>
            </div>
            <input
              type="range" min={1.0} max={1.8} step={0.01}
              value={repeat_penalty}
              onChange={(e) => setRepeatPenalty(parseFloat(e.target.value))}
              className="w-full accent-[var(--gold)]"
            />
            <div className="flex justify-between font-cinzel text-[10px] text-[var(--text-muted)]">
              <span>Normal (1.0)</span>
              <span>Sangat Ketat (1.8)</span>
            </div>
            <p className="text-[11px] text-[var(--text-muted)] font-cinzel tracking-wider">
              Rekomendasi: 1.3–1.4 — hindari kata berulang tanpa merusak gaya
            </p>
          </div>

          {/* Max Tokens */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label>Panjang Output (Max Tokens)</Label>
              <span className="font-cinzel text-[var(--gold)] text-sm">{max_tokens.toLocaleString()}</span>
            </div>
            <input
              type="range" min={2000} max={8000} step={500}
              value={max_tokens}
              onChange={(e) => setMaxTokens(parseInt(e.target.value))}
              className="w-full accent-[var(--gold)]"
            />
            <div className="flex justify-between font-cinzel text-[10px] text-[var(--text-muted)]">
              <span>Pendek (2000)</span>
              <span>Sangat Panjang (8000)</span>
            </div>
            <p className="text-[11px] text-[var(--text-muted)] font-cinzel tracking-wider">
              Min 1500 kata = 3500+ token. Rekomendasi: 4000–6000
            </p>
          </div>

          <button onClick={onClose} className="btn-gold w-full py-2.5 rounded-lg text-[11px]">
            ✦ Simpan & Tutup
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ──────────────────────────────────────
   ADD CHARACTER DIALOG (MANUAL)
────────────────────────────────────── */
function AddCharacterDialog({ open, onClose, onAdded, novelId }: {
  open: boolean; onClose: () => void; onAdded: (c: any) => void; novelId: string;
}) {
  const empty = {
    name: "", role: "supporting", age: "",
    personality: "", backstory: "", motivation: "",
    abilities: "", weaknesses: "",
    physical_traits: "", speech_style: "",
    relationships: "", arc: "",
  };
  const [form,   setForm]   = useState<any>(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) setForm(empty); }, [open]);
  function set(key: string, val: string) { setForm((f: any) => ({ ...f, [key]: val })); }

  async function handleSave() {
    if (!form.name.trim()) return alert("Nama wajib diisi");
    setSaving(true);
    try {
      const merged = mergeCharFields(form);
      const newChar = await addCharacterManually(novelId, merged);
      onAdded(newChar);
      onClose();
    } catch (e: any) {
      alert("Gagal: " + e.message);
    } finally {
      setSaving(false);
    }
  }

  const fields: [string, string, string, number][] = [
    ["Kepribadian",    "personality",    "Sifat, cara berpikir, kelemahan dominan...",           2],
    ["Latar Belakang", "backstory",      "Asal usul, peristiwa pembentuk, masa lalu...",          3],
    ["Motivasi",       "motivation",     "Tujuan nyata vs kebutuhan tersembunyi...",              2],
    ["Kemampuan",      "abilities",      "Kekuatan, teknik, keahlian spesifik...",                2],
    ["Kelemahan",      "weaknesses",     "Kelemahan fisik, emosional, atau moral...",             2],
    ["Ciri Fisik",     "physical_traits","Penampilan, postur, ciri khas...",                      2],
    ["Gaya Bicara",    "speech_style",   "Formal/informal, singkat/panjang, ekspresi khas...",   2],
    ["Hubungan",       "relationships",  "Aliansi, rivalitas, rahasia dengan karakter lain...",  2],
    ["Arc Karakter",   "arc",            "Bagaimana karakter berubah sepanjang cerita...",        2],
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-cinzel text-[var(--gold)] tracking-widest">✦ Tambah Karakter</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nama *</Label>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} className="font-cinzel" placeholder="Nama karakter..." />
            </div>
            <div className="space-y-2">
              <Label>Peran</Label>
              <Select value={form.role} onValueChange={(v) => set("role", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="protagonist">Protagonis</SelectItem>
                  <SelectItem value="antagonist">Antagonis</SelectItem>
                  <SelectItem value="supporting">Pendukung</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Usia</Label>
            <Input value={form.age||""} onChange={(e) => set("age", e.target.value)}
              placeholder="e.g. 23 tahun / pertengahan 30-an" className="font-crimson" />
          </div>
          {fields.map(([label, key, ph, rows]) => (
            <div key={key} className="space-y-2">
              <Label>{label}</Label>
              <Textarea value={form[key]||""} onChange={(e) => set(key, e.target.value)}
                placeholder={ph} rows={rows} className="font-crimson resize-none" />
            </div>
          ))}
          <div className="flex gap-3 pt-1">
            <button onClick={handleSave} disabled={saving} className="btn-gold flex-1 py-2.5 rounded-lg text-[11px]">
              {saving ? "Menyimpan..." : "✦ Tambahkan"}
            </button>
            <button onClick={onClose} className="btn-danger flex-1 py-2.5 rounded-lg text-[11px]">Batal</button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ──────────────────────────────────────
   EDIT NOVEL DIALOG
────────────────────────────────────── */
function EditNovelDialog({ novel, open, onClose, onSaved }: {
  novel: any; open: boolean; onClose: () => void; onSaved: (updated: any) => void;
}) {
  const [title,    setTitle]    = useState(novel?.title    || "");
  const [synopsis, setSynopsis] = useState(novel?.synopsis || "");
  const [genre,    setGenre]    = useState(novel?.genre?.join(", ") || "");
  const [style,    setStyle]    = useState(novel?.style    || "Cultivation");
  const [saving,   setSaving]   = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(novel?.title || "");
      setSynopsis(novel?.synopsis || "");
      setGenre(novel?.genre?.join(", ") || "");
      setStyle(novel?.style || "Cultivation");
    }
  }, [open, novel]);

  async function handleSave() {
    if (!title.trim()) return alert("Judul wajib diisi");
    setSaving(true);
    const { data, error } = await supabase
      .from("novels")
      .update({ title, synopsis, genre: genre.split(",").map((g: string) => g.trim()).filter(Boolean), style })
      .eq("id", novel.id)
      .select().single();
    setSaving(false);
    if (error) return alert("Gagal menyimpan: " + error.message);
    onSaved(data);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-cinzel text-[var(--gold)] tracking-widest">Edit Novel</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 mt-2">
          <div className="space-y-2"><Label>Judul</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="font-crimson" /></div>
          <div className="space-y-2"><Label>Synopsis</Label>
            <Textarea value={synopsis} onChange={(e) => setSynopsis(e.target.value)} rows={4} className="font-crimson resize-none" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Genre</Label>
              <Input value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="Fantasy, RPG..." className="font-crimson" /></div>
            <div className="space-y-2"><Label>Gaya</Label>
              <Select value={style} onValueChange={setStyle}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Cultivation","Fantasy","RPG","Dark Fantasy","Isekai","Xianxia"].map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={handleSave} disabled={saving} className="btn-gold flex-1 py-2.5 rounded-lg text-[11px]">
              {saving ? "Menyimpan..." : "✦ Simpan"}
            </button>
            <button onClick={onClose} className="btn-danger flex-1 py-2.5 rounded-lg text-[11px]">Batal</button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ──────────────────────────────────────
   EDIT CHARACTER DIALOG
────────────────────────────────────── */
function EditCharacterDialog({ char, open, onClose, onSaved }: {
  char: any; open: boolean; onClose: () => void; onSaved: (updated: any) => void;
}) {
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && char) setForm(parseCharFields(char));
  }, [open, char]);

  function set(key: string, val: string) { setForm((f: any) => ({ ...f, [key]: val })); }

  async function handleSave() {
    if (!form.name?.trim()) return alert("Nama wajib diisi");
    setSaving(true);
    const merged = mergeCharFields(form);
    const { data, error } = await supabase
      .from("characters")
      .update(merged)
      .eq("id", char.id)
      .select().single();
    setSaving(false);
    if (error) return alert("Gagal: " + error.message);
    onSaved(data);
    onClose();
  }

  const fields: [string, string, string, number][] = [
    ["Kepribadian",    "personality",    "Sifat, cara berpikir...",                    2],
    ["Latar Belakang", "backstory",      "Asal usul, peristiwa pembentuk...",           3],
    ["Motivasi",       "motivation",     "Tujuan nyata vs kebutuhan tersembunyi...",   2],
    ["Kemampuan",      "abilities",      "Kekuatan, teknik, keahlian spesifik...",     2],
    ["Kelemahan",      "weaknesses",     "Kelemahan fisik, emosional, atau moral...",  2],
    ["Ciri Fisik",     "physical_traits","Penampilan, postur, ciri khas...",            2],
    ["Gaya Bicara",    "speech_style",   "Formal/informal, ekspresi khas...",           2],
    ["Hubungan",       "relationships",  "Aliansi, rivalitas, rahasia...",              2],
    ["Arc Karakter",   "arc",            "Bagaimana karakter berubah...",               2],
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-cinzel text-[var(--gold)] tracking-widest">Edit Karakter</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Nama</Label>
              <Input value={form.name||""} onChange={(e) => set("name", e.target.value)} className="font-cinzel" /></div>
            <div className="space-y-2"><Label>Peran</Label>
              <Select value={form.role||"supporting"} onValueChange={(v) => set("role", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="protagonist">Protagonis</SelectItem>
                  <SelectItem value="antagonist">Antagonis</SelectItem>
                  <SelectItem value="supporting">Pendukung</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Usia</Label>
            <Input value={form.age||""} onChange={(e) => set("age", e.target.value)}
              placeholder="e.g. 23 tahun" className="font-crimson" />
          </div>
          {fields.map(([label, key, ph, rows]) => (
            <div key={key} className="space-y-2"><Label>{label}</Label>
              <Textarea value={form[key]||""} onChange={(e) => set(key, e.target.value)}
                placeholder={ph} rows={rows} className="font-crimson resize-none" /></div>
          ))}
          <div className="flex gap-3 pt-1">
            <button onClick={handleSave} disabled={saving} className="btn-gold flex-1 py-2.5 rounded-lg text-[11px]">
              {saving ? "Menyimpan..." : "✦ Simpan"}
            </button>
            <button onClick={onClose} className="btn-danger flex-1 py-2.5 rounded-lg text-[11px]">Batal</button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ──────────────────────────────────────
   EDIT CHAPTER DIALOG
────────────────────────────────────── */
function EditChapterDialog({ chapter, open, onClose, onSaved }: {
  chapter: any; open: boolean; onClose: () => void; onSaved: (updated: any) => void;
}) {
  const [title,   setTitle]   = useState("");
  const [content, setContent] = useState("");
  const [saving,  setSaving]  = useState(false);

  useEffect(() => {
    if (open && chapter) { setTitle(chapter.title || ""); setContent(chapter.content_text || ""); }
  }, [open, chapter]);

  async function handleSave() {
    setSaving(true);
    const wordCount = content.split(/\s+/).filter(Boolean).length;
    const { data, error } = await supabase
      .from("chapters")
      .update({ title, content_text: content, word_count: wordCount })
      .eq("id", chapter.id)
      .select().single();
    setSaving(false);
    if (error) return alert("Gagal: " + error.message);
    onSaved(data);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-cinzel text-[var(--gold)] tracking-widest">
            Edit Bab {chapter?.chapter_number}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-2"><Label>Judul Bab</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="font-cinzel" /></div>
          <div className="space-y-2"><Label>Konten</Label>
            <Textarea value={content} onChange={(e) => setContent(e.target.value)}
              rows={14} className="font-crimson text-base leading-relaxed resize-none" /></div>
          <div className="flex gap-3">
            <button onClick={handleSave} disabled={saving} className="btn-gold flex-1 py-2.5 rounded-lg text-[11px]">
              {saving ? "Menyimpan..." : "✦ Simpan"}
            </button>
            <button onClick={onClose} className="btn-danger flex-1 py-2.5 rounded-lg text-[11px]">Batal</button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ──────────────────────────────────────
   CONFIRM DELETE DIALOG
────────────────────────────────────── */
function ConfirmDialog({ open, message, onConfirm, onClose }: {
  open: boolean; message: string; onConfirm: () => void; onClose: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-cinzel text-red-400 tracking-widest">Konfirmasi Hapus</DialogTitle>
        </DialogHeader>
        <p className="font-crimson text-[var(--text-dim)] text-base mt-2 italic">{message}</p>
        <div className="flex gap-3 mt-5">
          <button onClick={onConfirm} className="btn-danger flex-1 py-2.5 rounded-lg text-[11px]">Ya, Hapus</button>
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-lg text-[11px] border border-[var(--border-gold)]
              text-[var(--text-dim)] hover:text-white transition font-cinzel tracking-widest">
            Batal
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ══════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════ */
export default function NovelDetail() {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [activeTab, setActiveTab]     = useState<Tab>("bab");
  const [synopsisOpen, setSynopsisOpen] = useState(false);

  const [novel,         setNovel]         = useState<any>(null);
  const [characters,    setCharacters]    = useState<any[]>([]);
  const [chapters,      setChapters]      = useState<any[]>([]);
  const [masterConcept, setMasterConcept] = useState("");
  const [tracks,        setTracks]        = useState<any[]>([]);

  const [loadingNovel, setLoadingNovel] = useState(true);
  const [loadingStage, setLoadingStage] = useState<LoadingStage>("");

  const [selectedChapter, setSelectedChapter] = useState<any>(null);

  /* Dialog states */
  const [editNovelOpen,    setEditNovelOpen]    = useState(false);
  const [editCharOpen,     setEditCharOpen]     = useState(false);
  const [editChapterOpen,  setEditChapterOpen]  = useState(false);
  const [deleteNovelOpen,  setDeleteNovelOpen]  = useState(false);
  const [deleteCharTarget, setDeleteCharTarget] = useState<any>(null);
  const [deleteChapTarget, setDeleteChapTarget] = useState<any>(null);
  const [selectedChar,     setSelectedChar]     = useState<any>(null);
  const [selectedChapEdit, setSelectedChapEdit] = useState<any>(null);
  const [addCharOpen,      setAddCharOpen]      = useState(false);
  const [aiSettingsOpen,   setAISettingsOpen]   = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { setTracks: setMusicTracks, play } = useMusicStore();
  const { selectedModel } = useSettingsStore();

  useEffect(() => { if (id) fetchAll(); }, [id]);

  async function fetchAll() {
    const [novelRes, charRes, chapterRes, conceptRes, trackRes] = await Promise.all([
      supabase.from("novels").select("*").eq("id", id).single(),
      supabase.from("characters").select("*").eq("novel_id", id).order("created_at", { ascending: true }),
      supabase.from("chapters").select("*").eq("novel_id", id).order("chapter_number", { ascending: true }),
      supabase.from("master_concepts").select("content_text").eq("novel_id", id).single(),
      supabase.from("audio_tracks").select("*").eq("novel_id", id).order("created_at", { ascending: true }),
    ]);
    if (novelRes.data)   setNovel(novelRes.data);
    if (charRes.data)    setCharacters(charRes.data);
    if (chapterRes.data) setChapters(chapterRes.data);
    if (conceptRes.data) setMasterConcept(conceptRes.data.content_text || "");
    if (trackRes.data)   { setTracks(trackRes.data); setMusicTracks(trackRes.data, id!); }
    setLoadingNovel(false);
  }

  /* ── Generate handlers ── */
  async function handleGenChar() {
    if (!novel || loadingStage) return;
    setLoadingStage("character");
    try {
      await generateCharacters(novel.id, novel.synopsis);
      await fetchAll();
    } catch (e: any) {
      alert("❌ Generate karakter gagal: " + e.message);
    } finally {
      setLoadingStage("");
    }
  }

  async function handleGenConcept() {
    if (!novel || loadingStage) return;
    setLoadingStage("concept");
    try { const r = await generateMasterConcept(novel.id, novel.synopsis); setMasterConcept(r); }
    catch (e: any) { alert("❌ Generate konsep gagal: " + e.message); }
    finally { setLoadingStage(""); }
  }

  async function handleGenChapter() {
    if (!novel || loadingStage) return;
    setLoadingStage("chapter");
    try { const ch = await generateNextChapter(novel.id); setChapters((p) => [...p, ch]); }
    catch (e: any) { alert("❌ Generate bab gagal: " + e.message); }
    finally { setLoadingStage(""); }
  }

  /* ── Delete novel ── */
  async function handleDeleteNovel() {
    await supabase.from("novels").delete().eq("id", id);
    navigate("/");
  }

  /* ── Delete character ── */
  async function handleDeleteChar() {
    if (!deleteCharTarget) return;
    await supabase.from("characters").delete().eq("id", deleteCharTarget.id);
    setCharacters((p) => p.filter((c) => c.id !== deleteCharTarget.id));
    setDeleteCharTarget(null);
  }

  /* ── Delete chapter ── */
  async function handleDeleteChap() {
    if (!deleteChapTarget) return;
    await supabase.from("chapters").delete().eq("id", deleteChapTarget.id);
    setChapters((p) => p.filter((c) => c.id !== deleteChapTarget.id));
    setDeleteChapTarget(null);
    if (selectedChapter?.id === deleteChapTarget.id) setSelectedChapter(null);
  }

  /* ── Upload musik ── */
  async function handleUploadMusic(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    const fileName = `${id}/${Date.now()}_${file.name}`;
    await supabase.storage.from("audio").upload(fileName, file);
    const { data: urlData } = supabase.storage.from("audio").getPublicUrl(fileName);
    const { data: track } = await supabase
      .from("audio_tracks")
      .insert({ novel_id: id, title: file.name.replace(/\.[^.]+$/, ""), file_url: urlData.publicUrl })
      .select().single();
    const newTracks = [...tracks, track];
    setTracks(newTracks);
    setMusicTracks(newTracks, id!);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleDeleteTrack(trackId: string, fileUrl: string) {
    const path = fileUrl.split("/storage/v1/object/public/audio/")[1];
    await supabase.storage.from("audio").remove([path]);
    await supabase.from("audio_tracks").delete().eq("id", trackId);
    const newTracks = tracks.filter((t) => t.id !== trackId);
    setTracks(newTracks);
    setMusicTracks(newTracks, id!);
  }

  /* ── Loading text ── */
  const loadingText: Record<LoadingStage, string> = {
    character: "Membuat Karakter",
    concept:   "Membangun Master Concept",
    chapter:   "Menulis Bab Berikutnya",
    "": "",
  };

  const tabs = [
    { key: "bab",           label: "📖  Bab" },
    { key: "character",     label: "👤  Karakter" },
    { key: "masterConcept", label: "🗺  Konsep" },
    { key: "musik",         label: "🎵  Musik" },
  ];

  if (loadingNovel) return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="relative w-14 h-14 mx-auto">
          <div className="absolute inset-0 rounded-full border border-[var(--gold)] opacity-30" />
          <div className="absolute inset-0 rounded-full border-2 border-t-transparent border-[var(--gold)] animate-spin" />
        </div>
        <p className="font-cinzel text-[var(--gold-dim)] text-xs tracking-widest">MEMUAT...</p>
      </div>
    </div>
  );

  if (!novel) return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
      <p className="font-cinzel text-[var(--text-dim)] tracking-widest">NOVEL TIDAK DITEMUKAN</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text-main)] relative overflow-x-hidden">

      {/* Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-0 right-0 h-80"
          style={{ background: "radial-gradient(ellipse 100% 100% at 50% 0%, rgba(201,168,76,0.05) 0%, transparent 70%)" }} />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px]"
          style={{ background: "radial-gradient(ellipse, rgba(45,27,78,0.25) 0%, transparent 65%)" }} />
        {/* Spirit wisps */}
        <div className="spirit-wisp" style={{"--wx":"5%","--wy":"40%","--wsize":"200px","--wc":"rgba(138,43,226,0.08)","--wdur":"10s"} as any} />
        <div className="spirit-wisp" style={{"--wx":"85%","--wy":"55%","--wsize":"160px","--wc":"rgba(201,168,76,0.06)","--wdur":"14s","--wdelay":"4s"} as any} />
        <div className="spirit-wisp" style={{"--wx":"50%","--wy":"85%","--wsize":"130px","--wc":"rgba(80,120,220,0.05)","--wdur":"9s","--wdelay":"2s"} as any} />
        {/* Rune particles */}
        <span className="rune-particle" style={{"--rx":"3%","--ry":"60%","--rd":"6s","--rdelay":"0s","--rs":"0.8rem"} as any}>ᚠ</span>
        <span className="rune-particle" style={{"--rx":"92%","--ry":"35%","--rd":"5s","--rdelay":"2s","--rs":"0.7rem"} as any}>ᛟ</span>
        <span className="rune-particle" style={{"--rx":"20%","--ry":"80%","--rd":"7s","--rdelay":"1s","--rs":"0.65rem"} as any}>ᚦ</span>
        <span className="rune-particle" style={{"--rx":"70%","--ry":"75%","--rd":"4.5s","--rdelay":"3s","--rs":"0.75rem"} as any}>ᛞ</span>
      </div>

      {/* Sticky Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-8 h-16
        border-b border-[var(--border-gold)] backdrop-blur-2xl"
        style={{ background: "rgba(7,5,10,0.95)" }}
      >
        <Link to="/"><button className="font-cinzel text-[11px] tracking-[0.2em] text-[var(--text-dim)] hover:text-[var(--gold)] transition">← Beranda</button></Link>
        <h1 className="font-cinzel text-sm font-bold gold-text tracking-wider hidden md:block truncate max-w-xs">{novel.title}</h1>
        {/* AI Settings button */}
        <button
          onClick={() => setAISettingsOpen(true)}
          className="flex items-center gap-2 font-cinzel text-[10px] tracking-[0.2em] text-[var(--text-dim)]
            hover:text-[var(--gold)] transition border border-[rgba(201,168,76,0.2)] hover:border-[var(--gold)]
            px-3 py-1.5 rounded-lg"
        >
          ⚙ AI
        </button>
      </header>

      <div className="relative z-10 max-w-4xl mx-auto px-6 md:px-10 py-10">

        {/* Novel Hero Card */}
        <div className="rounded-2xl border border-[var(--border-gold)] mb-10 overflow-hidden animate-fadeUp"
          style={{ background: "linear-gradient(135deg, var(--bg-card) 0%, rgba(45,27,78,0.2) 100%)" }}
        >
          <div className="aether-line w-full" />
          <div className="p-7 flex gap-6 items-start">
            {/* Cover rune seal */}
            <div className="w-24 h-32 rounded-xl flex-shrink-0 flex items-center justify-center border border-[var(--border-gold)]"
              style={{ background: "linear-gradient(180deg, rgba(45,27,78,0.8), var(--bg))" }}>
              <div className="rune-seal rune-seal--sm">
                <span className="rune-seal__inner text-base">✦</span>
              </div>
            </div>

            <div className="flex-1 min-w-0">
              {novel.genre?.length > 0 && (
                <div className="flex gap-2 flex-wrap mb-3">
                  {novel.genre.map((g: string) => (
                    <span key={g} className="font-cinzel text-[9px] tracking-[0.2em] px-3 py-1 rounded-full border border-[var(--border-gold)] text-[var(--gold-dim)] uppercase">{g}</span>
                  ))}
                </div>
              )}

              <h2 className="font-cinzel text-xl md:text-2xl font-bold text-[var(--text-main)] mb-3">{novel.title}</h2>

              <div className="relative">
                <p className={`font-crimson text-[var(--text-dim)] italic leading-relaxed text-base ${synopsisOpen ? "" : "line-clamp-2"}`}>
                  {novel.synopsis || "Tiada synopsis."}
                </p>
                {!synopsisOpen && <div className="absolute bottom-0 left-0 right-0 h-7"
                  style={{ background: "linear-gradient(to top, var(--bg-card), transparent)" }} />}
              </div>
              <button onClick={() => setSynopsisOpen((v) => !v)}
                className="font-cinzel text-[10px] tracking-widest text-[var(--gold)] mt-2 hover:text-[var(--gold-bright)] transition">
                {synopsisOpen ? "TUTUP ▲" : "LIHAT LEBIH ▼"}
              </button>

              <div className="flex gap-6 mt-5 mb-5">
                {[[chapters.length,"Bab"],[characters.length,"Karakter"],[tracks.length,"Musik"]].map(([v,l]) => (
                  <div key={String(l)}>
                    <div className="font-cinzel text-xl text-[var(--gold)]">{v}</div>
                    <div className="font-cinzel text-[10px] tracking-widest text-[var(--text-dim)] uppercase">{l}</div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 flex-wrap">
                <button onClick={() => setEditNovelOpen(true)} className="btn-gold px-4 py-2 rounded-lg text-[10px]">✏ Edit Novel</button>
                <button onClick={() => setDeleteNovelOpen(true)} className="btn-danger px-4 py-2 rounded-lg text-[10px]">🗑 Hapus Novel</button>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-[var(--border-gold)] mb-8 relative">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => { setActiveTab(t.key as Tab); setSelectedChapter(null); }}
              className={`font-cinzel text-[11px] tracking-[0.2em] uppercase px-5 py-3 transition
                ${activeTab === t.key
                  ? "text-[var(--gold)] border-b-2 border-[var(--gold)] -mb-px"
                  : "text-[var(--text-dim)] hover:text-[var(--text-main)]"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ══════════ TAB: BAB ══════════ */}
        {activeTab === "bab" && (
          <div className="animate-fadeUp">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-cinzel text-sm tracking-widest">{chapters.length} BAB</h3>
              <GenBtn onClick={handleGenChapter} loading={loadingStage === "chapter"}
                label="✦ Generate Bab Baru" loadingLabel="Menulis..." />
            </div>

            {!masterConcept && (
              <div className="mb-5 px-4 py-3 rounded-xl border font-crimson italic text-sm"
                style={{ borderColor:"rgba(239,68,68,0.3)", background:"rgba(139,26,26,0.1)", color:"#F87171" }}>
                ⚠️ Buat Master Konsep dulu agar bab tidak kehilangan konteks cerita.
              </div>
            )}

            {selectedChapter ? (
              <div>
                <div className="flex gap-3 mb-6 flex-wrap">
                  <button onClick={() => setSelectedChapter(null)}
                    className="font-cinzel text-[11px] tracking-[0.2em] text-[var(--text-dim)] hover:text-[var(--gold)] transition
                      border border-[var(--border-gold)] px-4 py-2 rounded-lg">
                    ← Daftar Bab
                  </button>
                  {/* ✅ Tombol Reader */}
                  <button
                    onClick={() => navigate(`/novel/${id}/read/${selectedChapter.id}`)}
                    className="btn-gold px-4 py-2 rounded-lg text-[10px]">
                    📖 Baca Full
                  </button>
                  <button onClick={() => { setSelectedChapEdit(selectedChapter); setEditChapterOpen(true); }}
                    className="btn-gold px-4 py-2 rounded-lg text-[10px]">✏ Edit</button>
                  <button onClick={() => setDeleteChapTarget(selectedChapter)}
                    className="btn-danger px-4 py-2 rounded-lg text-[10px]">🗑 Hapus</button>
                </div>
                <h3 className="font-cinzel text-lg font-bold mb-1">Bab {selectedChapter.chapter_number} — {selectedChapter.title}</h3>
                <p className="font-cinzel text-[10px] tracking-widest text-[var(--text-muted)] mb-6">{selectedChapter.word_count} KATA</p>
                <div className="rounded-2xl border border-[var(--border-gold)] p-8"
                  style={{ background:"linear-gradient(180deg, var(--bg-card), var(--bg-panel))" }}>
                  <p className="font-crimson text-[var(--text-main)] leading-[2] text-lg whitespace-pre-wrap">{selectedChapter.content_text}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {chapters.length === 0 && (
                  <div className="text-center py-14 font-crimson italic text-[var(--text-dim)]">
                    Belum ada bab. Klik Generate untuk mulai menempa cerita.
                  </div>
                )}
                {chapters.map((ch) => (
                  <div key={ch.id} className="card-hover rounded-2xl border border-[var(--border-gold)] p-5
                    flex gap-5 items-center group"
                    style={{ background:"linear-gradient(135deg, var(--bg-card), var(--bg-panel))" }}>
                    <div className="w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center
                      border border-[var(--border-gold)] font-cinzel text-[var(--gold)] text-sm font-bold cursor-pointer"
                      style={{ background:"linear-gradient(135deg, rgba(45,27,78,0.8), var(--bg))" }}
                      onClick={() => setSelectedChapter(ch)}>
                      {ch.chapter_number}
                    </div>
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setSelectedChapter(ch)}>
                      <div className="font-cinzel text-sm text-[var(--text-main)] mb-1">{ch.title}</div>
                      <div className="font-crimson text-[var(--text-dim)] text-sm italic line-clamp-1">{ch.summary}</div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="font-cinzel text-[10px] text-[var(--text-muted)]">{ch.word_count} kata</span>
                      {/* ✅ Reader button in list */}
                      <button
                        onClick={() => navigate(`/novel/${id}/read/${ch.id}`)}
                        className="opacity-0 group-hover:opacity-100 transition text-[var(--gold-dim)] hover:text-[var(--gold)] text-sm px-2">
                        📖
                      </button>
                      <button onClick={() => { setSelectedChapEdit(ch); setEditChapterOpen(true); }}
                        className="opacity-0 group-hover:opacity-100 transition text-[var(--gold-dim)] hover:text-[var(--gold)] text-sm px-2">✏</button>
                      <button onClick={() => setDeleteChapTarget(ch)}
                        className="opacity-0 group-hover:opacity-100 transition text-[var(--text-muted)] hover:text-red-400 text-sm px-1">🗑</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════════ TAB: CHARACTER ══════════ */}
        {activeTab === "character" && (
          <div className="animate-fadeUp">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-cinzel text-sm tracking-widest">{characters.length} KARAKTER</h3>
              <div className="flex gap-2">
                {/* ✅ Add manual button */}
                <button
                  onClick={() => setAddCharOpen(true)}
                  className="border border-[var(--border-gold)] text-[var(--gold-dim)] hover:text-[var(--gold)]
                    hover:border-[var(--gold)] px-4 py-2 rounded-lg text-[11px] font-cinzel tracking-wider transition">
                  + Tambah Manual
                </button>
                <GenBtn onClick={handleGenChar} loading={loadingStage === "character"}
                  label="✦ Generate AI" loadingLabel="Membuat..." />
              </div>
            </div>

            {characters.length > 0 && (
              <div className="mb-4 px-4 py-3 rounded-xl border font-crimson italic text-sm"
                style={{ borderColor:"rgba(201,168,76,0.2)", background:"rgba(201,168,76,0.04)", color:"var(--text-muted)" }}>
                ⚠️ Generate AI akan menghapus karakter lama dan membuat yang baru. Backup dulu jika perlu.
              </div>
            )}

            {characters.length === 0 && (
              <div className="text-center py-14 font-crimson italic text-[var(--text-dim)]">
                Belum ada karakter. Generate AI atau tambahkan manual.
              </div>
            )}

            <div className="space-y-5">
              {characters.map((c) => {
                const cfg    = ROLE_CFG[c.role?.toLowerCase()] || ROLE_CFG.supporting;
                const parsed = parseCharFields(c);
                return (
                  <div key={c.id} className="card-hover rounded-2xl border border-[var(--border-gold)] overflow-hidden group"
                    style={{ background:"linear-gradient(145deg, var(--bg-card), var(--bg-panel))" }}>
                    <div className="h-[2px] w-full"
                      style={{ background:`linear-gradient(90deg, transparent, ${cfg.color}80, transparent)` }} />
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-5">
                        <div>
                          <h4 className="font-cinzel text-lg font-bold text-[var(--text-main)] mb-2">{c.name}</h4>
                          <RoleBadge role={c.role} />
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => { setSelectedChar(c); setEditCharOpen(true); }}
                            className="opacity-0 group-hover:opacity-100 transition btn-gold px-3 py-1.5 rounded-lg text-[10px]">
                            ✏ Edit
                          </button>
                          <button onClick={() => setDeleteCharTarget(c)}
                            className="opacity-0 group-hover:opacity-100 transition btn-danger px-3 py-1.5 rounded-lg text-[10px]">
                            🗑
                          </button>
                          <div className="w-11 h-11 rounded-full flex items-center justify-center text-xl border border-[var(--border-gold)]"
                            style={{ background:"linear-gradient(135deg, rgba(45,27,78,0.8), var(--bg))" }}>
                            {cfg.icon}
                          </div>
                        </div>
                      </div>

                      {parsed.age && (
                        <p className="font-cinzel text-[10px] text-[var(--text-muted)] tracking-wider mb-4">
                          Usia: {parsed.age}
                        </p>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {([
                          ["🧠 Kepribadian",    parsed.personality],
                          ["📖 Latar Belakang", parsed.backstory],
                          ["🎯 Motivasi",       parsed.motivation],
                          ["⚡ Kemampuan",      parsed.abilities],
                          ["💔 Kelemahan",      parsed.weaknesses],
                          ["👤 Ciri Fisik",     parsed.physical_traits],
                          ["💬 Gaya Bicara",    parsed.speech_style],
                          ["🔗 Hubungan",       parsed.relationships],
                          ["📈 Arc Karakter",   parsed.arc],
                        ] as [string, string][]).map(([label, val]) => val ? (
                          <div key={label} className="rounded-xl p-4 border"
                            style={{ background:"rgba(255,255,255,0.02)", borderColor:"rgba(201,168,76,0.12)" }}>
                            <div className="font-cinzel text-[9px] tracking-[0.2em] text-[var(--gold-dim)] mb-2 uppercase">{label}</div>
                            <p className="font-crimson text-[var(--text-dim)] text-sm leading-relaxed">{val}</p>
                          </div>
                        ) : null)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══════════ TAB: MASTER CONCEPT ══════════ */}
        {activeTab === "masterConcept" && (
          <div className="animate-fadeUp">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-cinzel text-sm tracking-widest">MASTER KONSEP</h3>
              <GenBtn onClick={handleGenConcept} loading={loadingStage === "concept"}
                label={masterConcept ? "🔄 Regenerate" : "✦ Generate Konsep"}
                loadingLabel="Membangun..." />
            </div>

            {masterConcept ? (
              <div className="rounded-2xl border border-[var(--border-gold)] overflow-hidden"
                style={{ background:"linear-gradient(180deg, var(--bg-card), var(--bg-panel))" }}>
                <div className="p-8 space-y-6">
                  {masterConcept.split("\n\n").map((block, i) => {
                    const lines   = block.split("\n");
                    const heading = lines[0];
                    const body    = lines.slice(1).join("\n");
                    if ((heading.endsWith(":") || heading === heading.toUpperCase()) && body) {
                      return (
                        <div key={i}>
                          <div className="font-cinzel text-[10px] tracking-[0.3em] text-[var(--gold)] mb-2 uppercase">
                            ✦ {heading.replace(":", "")}
                          </div>
                          <p className="font-crimson text-[var(--text-main)] leading-[1.9] text-base">{body}</p>
                        </div>
                      );
                    }
                    return <p key={i} className="font-crimson text-[var(--text-main)] leading-[1.9] text-base">{block}</p>;
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-14 rounded-2xl border border-[var(--border-gold)]"
                style={{ background:"linear-gradient(145deg, var(--bg-card), var(--bg-panel))" }}>
                <div className="text-4xl mb-4 animate-float">🗺</div>
                <p className="font-crimson italic text-[var(--text-dim)]">Belum ada master konsep. Generate untuk membuat peta dunia novelmu.</p>
              </div>
            )}
          </div>
        )}

        {/* ══════════ TAB: MUSIK ══════════ */}
        {activeTab === "musik" && (
          <div className="animate-fadeUp">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-cinzel text-sm tracking-widest">{tracks.length} LAGU</h3>
              <button onClick={() => fileInputRef.current?.click()} className="btn-gold px-5 py-2 rounded-lg text-[11px]">
                ⬆ Upload Musik
              </button>
              <input ref={fileInputRef} type="file" accept="audio/*" className="hidden" onChange={handleUploadMusic} />
            </div>

            {tracks.length === 0 && (
              <div className="text-center py-14 rounded-2xl border border-[var(--border-gold)]"
                style={{ background:"linear-gradient(145deg, var(--bg-card), var(--bg-panel))" }}>
                <div className="text-4xl mb-4 animate-float">🎵</div>
                <p className="font-crimson italic text-[var(--text-dim)]">Belum ada musik. Upload file audio untuk mengiringi novelmu.</p>
              </div>
            )}

            <div className="space-y-3">
              {tracks.map((t, i) => (
                <div key={t.id} className="card-hover rounded-xl border border-[var(--border-gold)] p-4
                  flex items-center gap-4 cursor-pointer group"
                  style={{ background:"linear-gradient(135deg, var(--bg-card), var(--bg-panel))" }}
                  onClick={() => play(i)}>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-base
                    border border-[var(--border-gold)] flex-shrink-0"
                    style={{ background:"linear-gradient(135deg, rgba(45,27,78,0.8), var(--bg))" }}>🎵</div>
                  <span className="font-cinzel text-sm text-[var(--text-main)] flex-1 truncate">{t.title}</span>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteTrack(t.id, t.file_url); }}
                    className="opacity-0 group-hover:opacity-100 transition text-[var(--text-muted)] hover:text-red-400 text-base flex-shrink-0 px-2">
                    🗑
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ══════════ DIALOGS ══════════ */}
      <AISettingsDialog open={aiSettingsOpen} onClose={() => setAISettingsOpen(false)} />

      <AddCharacterDialog
        open={addCharOpen}
        onClose={() => setAddCharOpen(false)}
        novelId={id!}
        onAdded={(newChar) => setCharacters((p) => [...p, newChar])}
      />

      <EditNovelDialog novel={novel} open={editNovelOpen} onClose={() => setEditNovelOpen(false)}
        onSaved={(updated) => setNovel(updated)} />

      <EditCharacterDialog char={selectedChar} open={editCharOpen} onClose={() => setEditCharOpen(false)}
        onSaved={(updated) => setCharacters((p) => p.map((c) => c.id === updated.id ? updated : c))} />

      <EditChapterDialog chapter={selectedChapEdit} open={editChapterOpen} onClose={() => setEditChapterOpen(false)}
        onSaved={(updated) => {
          setChapters((p) => p.map((c) => c.id === updated.id ? updated : c));
          if (selectedChapter?.id === updated.id) setSelectedChapter(updated);
        }} />

      <ConfirmDialog open={deleteNovelOpen} onClose={() => setDeleteNovelOpen(false)} onConfirm={handleDeleteNovel}
        message={`Novel "${novel.title}" dan semua kontennya akan dihapus permanen. Lanjutkan?`} />

      <ConfirmDialog open={!!deleteCharTarget} onClose={() => setDeleteCharTarget(null)} onConfirm={handleDeleteChar}
        message={`Karakter "${deleteCharTarget?.name}" akan dihapus permanen.`} />

      <ConfirmDialog open={!!deleteChapTarget} onClose={() => setDeleteChapTarget(null)} onConfirm={handleDeleteChap}
        message={`Bab ${deleteChapTarget?.chapter_number} — "${deleteChapTarget?.title}" akan dihapus permanen.`} />

      {/* ══════════ LOADING OVERLAY ══════════ */}
      {loadingStage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm animate-fadeIn"
          style={{ background:"rgba(7,5,10,0.88)" }}>
          {/* Rune particles in overlay */}
          <span className="rune-particle text-lg" style={{"--rx":"20%","--ry":"30%","--rd":"4s","--rdelay":"0s"} as any}>ᚠ</span>
          <span className="rune-particle text-base" style={{"--rx":"75%","--ry":"60%","--rd":"5s","--rdelay":"1s"} as any}>ᛟ</span>
          <span className="rune-particle text-sm" style={{"--rx":"40%","--ry":"70%","--rd":"6s","--rdelay":"0.5s"} as any}>ᚦ</span>
          <span className="rune-particle text-base" style={{"--rx":"60%","--ry":"25%","--rd":"4.5s","--rdelay":"2s"} as any}>ᛞ</span>
          <div className="text-center space-y-6 relative z-10">
            {/* Rune seal spinner */}
            <div className="rune-seal rune-seal--lg mx-auto">
              <span className="rune-seal__inner text-xl animate-rune-pulse">✦</span>
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--gold)] mx-auto animate-pulse-gold" />
            <div>
              <p className="font-cinzel text-[var(--gold)] text-sm tracking-[0.3em] uppercase text-rune-glow">{loadingText[loadingStage]}</p>
              <p className="font-crimson text-[var(--text-dim)] italic mt-1">
                Model: {selectedModel.split(":")[0]}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
