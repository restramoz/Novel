import { supabase } from "../../lib/supabase";
import { generateAI } from "../../lib/ai";
import { characterPrompt } from "./prompt";

/* ──────────────────────────────────────
   KOLOM DB characters:
     name, role, physical_traits,
     personality, abilities, relationships
   → prompt sudah output persis 6 field ini,
     tidak perlu transformasi apapun.
────────────────────────────────────── */

/* ── Multi-strategy JSON parser ── */
function parseCharacterJSON(raw: string): any[] {
  let s = raw.trim();

  // Hapus markdown fence jika ada
  s = s.replace(/^```(?:json)?\s*/im, "").replace(/\s*```\s*$/im, "").trim();

  // 1. Direct parse
  try {
    const p = JSON.parse(s);
    if (Array.isArray(p) && p.length > 0) return p;
  } catch (_) {}

  // 2. Ekstrak blok [...]
  const arrMatch = s.match(/\[[\s\S]*\]/);
  if (arrMatch) {
    try {
      const p = JSON.parse(arrMatch[0]);
      if (Array.isArray(p) && p.length > 0) return p;
    } catch (_) {}
  }

  // 3. Perbaiki JSON terpotong — cari } terakhir, tutup array
  const lastBrace = s.lastIndexOf("}");
  if (lastBrace !== -1) {
    const fixed = s.slice(0, lastBrace + 1) + "]";
    const start = fixed.indexOf("[");
    if (start !== -1) {
      try {
        const p = JSON.parse(fixed.slice(start));
        if (Array.isArray(p) && p.length > 0) return p;
      } catch (_) {}
    }
  }

  // 4. Ekstrak objek individual sebagai fallback terakhir
  const objMatches = s.match(/\{[\s\S]*?"name"[\s\S]*?\}/g);
  if (objMatches?.length) {
    const chars: any[] = [];
    for (const m of objMatches) {
      try { chars.push(JSON.parse(m)); } catch (_) {}
    }
    if (chars.length > 0) return chars;
  }

  console.error("❌ RAW AI (500 char):", raw.slice(0, 500));
  throw new Error("Gagal parse JSON karakter. Coba generate ulang.");
}

/* ── Normalize role ── */
function normalizeRole(role: string): string {
  const r = (role || "").toLowerCase();
  if (r.includes("protagonist")) return "protagonist";
  if (r.includes("antagonist"))  return "antagonist";
  return "supporting";
}

/* ── Normalize ke kolom DB yang ada ─────────────────
   DB characters hanya punya:
   name | role | physical_traits | personality |
   abilities | relationships
──────────────────────────────────────────────────── */
function normalizeCharacter(c: any, novelId: string) {
  return {
    novel_id:        novelId,
    name:            (c.name            || "Tanpa Nama").trim(),
    role:            normalizeRole(c.role),
    physical_traits: (c.physical_traits || "").trim(),
    personality:     (c.personality     || "").trim(),
    abilities:       (c.abilities       || "").trim(),
    relationships:   (c.relationships   || "").trim(),
  };
}

/* ──────────────────────────────────────
   GENERATE CHARACTERS
────────────────────────────────────── */
export async function generateCharacters(novelId: string, synopsis: string) {
  console.log("=== GENERATE CHARACTERS START ===");

  // 1. Ambil master concept jika ada
  let masterConcept: string | undefined;
  try {
    const { data } = await supabase
      .from("master_concepts")
      .select("content_text")
      .eq("novel_id", novelId)
      .single();
    if (data?.content_text?.trim()) {
      masterConcept = data.content_text;
      console.log("✅ Pakai synopsis + master concept");
    } else {
      console.log("ℹ️  Pakai synopsis saja");
    }
  } catch (_) {}

  // 2. Generate
  const raw = await generateAI(characterPrompt(synopsis, masterConcept));
  if (!raw?.trim()) throw new Error("AI mengembalikan response kosong");
  console.log("RAW (300 char):", raw.slice(0, 300));

  // 3. Parse
  const list = parseCharacterJSON(raw);
  if (!list.length) throw new Error("Tidak ada karakter berhasil di-parse");
  console.log(`Parse berhasil: ${list.length} karakter`);

  // 4. Hapus karakter lama
  const { error: delErr } = await supabase
    .from("characters").delete().eq("novel_id", novelId);
  if (delErr) throw delErr;

  // 5. Insert
  const rows = list.map((c) => normalizeCharacter(c, novelId));
  const { error: insErr } = await supabase.from("characters").insert(rows);
  if (insErr) throw insErr;

  console.log(`✅ ${rows.length} karakter disimpan`);
  return rows;
}

/* ──────────────────────────────────────
   ADD CHARACTER MANUALLY
────────────────────────────────────── */
export async function addCharacterManually(
  novelId: string,
  data: {
    name: string; role: string;
    physical_traits?: string; personality?: string;
    abilities?: string; relationships?: string;
  }
) {
  const { data: inserted, error } = await supabase
    .from("characters")
    .insert({
      novel_id:        novelId,
      name:            (data.name || "Tanpa Nama").trim(),
      role:            normalizeRole(data.role),
      physical_traits: (data.physical_traits || "").trim(),
      personality:     (data.personality     || "").trim(),
      abilities:       (data.abilities       || "").trim(),
      relationships:   (data.relationships   || "").trim(),
    })
    .select().single();

  if (error) throw error;
  return inserted;
}
