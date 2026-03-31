import { supabase } from "../../lib/supabase";
import { generateAI } from "../../lib/ai";
import { masterConceptPrompt } from "./prompt";

export async function generateMasterConcept(novelId: string, synopsis: string) {
  console.log("=== START GENERATE MASTER CONCEPT ===");

  const res = await generateAI(masterConceptPrompt(synopsis));

  if (!res || res.trim() === "") {
    throw new Error("AI mengembalikan response kosong");
  }

  console.log("MASTER CONCEPT RAW:", res);

  // Cek apakah sudah ada master concept untuk novel ini
  const { data: existing } = await supabase
    .from("master_concepts")
    .select("id")
    .eq("novel_id", novelId)
    .single();

  if (existing) {
    // Update yang sudah ada
    const { error } = await supabase
      .from("master_concepts")
      .update({ content_text: res })
      .eq("novel_id", novelId);

    if (error) throw error;
  } else {
    // Insert baru
    const { error } = await supabase
      .from("master_concepts")
      .insert({ novel_id: novelId, content_text: res });

    if (error) throw error;
  }

  return res;
}
