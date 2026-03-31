import { supabase } from "../../lib/supabase";
import { generateAI } from "../../lib/ai";
import { chapterPrompt } from "./prompt";
import { useSettingsStore } from "../../store/settingsStore";

const MIN_WORDS = 1500;
const MAX_RETRY  = 2;

export async function generateNextChapter(novelId: string) {
  console.log("=== START GENERATE CHAPTER ===");

  const { selectedModel, temperature, repeat_penalty, max_tokens } = useSettingsStore.getState();

  // Ambil semua data yang dibutuhkan secara paralel
  const [novelRes, charRes, chapterRes, conceptRes] = await Promise.all([
    supabase.from("novels").select("*").eq("id", novelId).single(),
    supabase.from("characters").select("*").eq("novel_id", novelId),
    supabase.from("chapters").select("*").eq("novel_id", novelId).order("chapter_number", { ascending: true }),
    supabase.from("master_concepts").select("content_text").eq("novel_id", novelId).single(),
  ]);

  const novel         = novelRes.data;
  const characters    = charRes.data   || [];
  const prevChapters  = chapterRes.data || [];
  const masterConcept = conceptRes.data?.content_text || "";

  if (!novel) throw new Error("Novel tidak ditemukan");

  const nextNum = prevChapters.length + 1;

  const messages = chapterPrompt(
    novel.synopsis || "",
    masterConcept,
    characters,
    prevChapters,
    nextNum
  );

  // Pastikan num_predict cukup besar untuk 1500+ kata
  // ~1 kata ≈ 1.5 token (Bahasa Indonesia), jadi 1500 kata ≈ 2250 token minimum
  const safeMaxTokens = Math.max(max_tokens, 3500);

  let raw       = "";
  let wordCount = 0;
  let attempt   = 0;

  while (attempt < MAX_RETRY) {
    attempt++;
    console.log(`🔄 Generate attempt ${attempt}/${MAX_RETRY}...`);

    raw = await generateAI(messages, {
      model:          selectedModel,
      temperature,
      repeat_penalty,
      max_tokens:     safeMaxTokens,
    });

    if (!raw || raw.trim() === "") {
      throw new Error("AI mengembalikan response kosong");
    }

    wordCount = raw.trim().split(/\s+/).filter(Boolean).length;
    console.log(`📊 Attempt ${attempt}: ${wordCount} kata`);

    if (wordCount >= MIN_WORDS) break;

    if (attempt < MAX_RETRY) {
      console.warn(`⚠️ Hanya ${wordCount} kata (min ${MIN_WORDS}). Mencoba lagi...`);
    }
  }

  if (wordCount < MIN_WORDS) {
    console.warn(`⚠️ Setelah ${MAX_RETRY} percobaan, hasil terbaik: ${wordCount} kata. Tetap disimpan.`);
  }

  console.log("CHAPTER RAW:", raw.slice(0, 300));

  // Extract judul dari baris terakhir "JUDUL: ..."
  const lines    = raw.trim().split("\n");
  const lastLine = lines[lines.length - 1] || "";
  let chapterTitle = `Bab ${nextNum}`;
  let content      = raw.trim();

  if (lastLine.startsWith("JUDUL:")) {
    chapterTitle = lastLine.replace("JUDUL:", "").trim();
    content      = lines.slice(0, -1).join("\n").trim();
  }

  const finalWordCount = content.split(/\s+/).filter(Boolean).length;

  // Buat summary singkat dari 3 kalimat pertama
  const summary = content.split(/[.!?]/g).filter(Boolean).slice(0, 3).join(". ") + ".";

  const { data, error } = await supabase
    .from("chapters")
    .insert({
      novel_id:       novelId,
      chapter_number: nextNum,
      title:          chapterTitle,
      content_text:   content,
      word_count:     finalWordCount,
      summary:        summary,
    })
    .select()
    .single();

  if (error) {
    console.error("❌ Gagal simpan chapter:", error);
    throw error;
  }

  // Update chapter count di tabel novels
  await supabase
    .from("novels")
    .update({ chapter_count: nextNum })
    .eq("id", novelId);

  console.log(`✅ Bab ${nextNum} "${chapterTitle}" berhasil disimpan (${finalWordCount} kata)`);
  return data;
}
