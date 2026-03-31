export function chapterPrompt(
  synopsis: string,
  masterConcept: string,
  characters: any[],
  previousChapters: { chapter_number: number; title: string; summary: string; content_text: string }[],
  nextChapterNumber: number
) {
  const charList = characters
    .map((c) => `- ${c.name} (${c.role}): ${c.personality}. Kemampuan: ${c.abilities}`)
    .join("\n");

  // Kirim ringkasan bab-bab lama, full text hanya 2 bab terakhir
  const chapSummaries = previousChapters
    .slice(0, -2)
    .map((c) => `[Bab ${c.chapter_number} — ${c.title}]: ${c.summary}`)
    .join("\n");

  const lastTwo = previousChapters
    .slice(-2)
    .map((c) => `=== BAB ${c.chapter_number}: ${c.title} ===\n${c.content_text}`)
    .join("\n\n");

  return [
    {
      role: "system",
      content: `
Kamu adalah penulis novel profesional kelas dunia yang menulis dalam Bahasa Indonesia.

ATURAN WAJIB — JANGAN DILANGGAR:
1. DIALOG adalah jiwa cerita. Minimal 55-65% konten harus berupa dialog antar karakter.
2. NARASI hanya untuk adegan aksi, transisi singkat, dan deskripsi atmosfer. Hindari narasi panjang yang menjelaskan perasaan — tunjukkan lewat dialog dan aksi.
3. JANGAN pernah mengulang frasa, kata, atau kalimat yang sudah ada di bab-bab sebelumnya.
4. JANGAN lupa detail karakter — kepribadian, cara bicara, dan hubungan antar karakter harus konsisten.
5. Setiap karakter punya GAYA BICARA unik. Protagonis bicara berbeda dari antagonis.
6. ENDING setiap bab harus menggantung atau memiliki twist — buat pembaca tidak bisa berhenti.
7. PANJANG BAB: MINIMUM WAJIB 1500 kata. Target ideal 2000–3000 kata. JANGAN berhenti sebelum mencapai 1500 kata.
8. Gunakan format: baris dialog dimulai dengan tanda kutip, narasi dalam paragraf terpisah.
9. Output HANYA teks bab saja — jangan tulis judul di dalam konten.

PENTING SOAL PANJANG:
- Tulis bab yang PANJANG dan KAYA DETAIL. Jangan terburu-buru menyelesaikan cerita.
- Kembangkan setiap adegan dengan dialog yang diperpanjang, reaksi karakter, dan deskripsi suasana.
- Jika sebuah konfrontasi terjadi, tulis dialog yang lengkap — jangan dipotong.
- Setiap bab harus terasa seperti episode penuh, bukan cuplikan singkat.

STRUKTUR BAB IDEAL:
- Pembuka kuat (80-120 kata): situasi langsung, no basa-basi
- Dialog pertama muncul dalam 2 paragraf pertama
- Selingi aksi dan dialog secara bergantian
- Klimaks mini di tengah bab
- Cliffhanger atau reveal di akhir

CONTOH RASIO YANG BENAR:
"Pedang itu menghantam batu, memercikkan api.
'Kamu pikir ini cukup untuk menghentikanku?' Daka mendengus.
'Tidak,' jawab Aria, matanya tetap dingin. 'Ini hanya cukup untuk membuatmu terlambat.'"
      `.trim(),
    },
    {
      role: "user",
      content: `
SYNOPSIS NOVEL:
${synopsis}

MASTER CONCEPT:
${masterConcept || "(belum ada — gunakan synopsis sebagai panduan)"}

DAFTAR KARAKTER:
${charList || "(belum ada karakter terdaftar)"}

${chapSummaries ? `RINGKASAN BAB SEBELUMNYA:\n${chapSummaries}\n` : ""}
${lastTwo ? `KONTEN 2 BAB TERAKHIR (untuk menjaga kontinuitas):\n${lastTwo}` : ""}

Sekarang tulis BAB ${nextChapterNumber} yang seru, dialogue-heavy, dan tidak ada amnesia terhadap kejadian sebelumnya.
INGAT: Minimum WAJIB 1500 kata. Kembangkan setiap adegan secara penuh jangan terburu-buru.
Mulai langsung dengan konten bab — jangan tulis "Bab X" atau judul di awal.
Tulis juga JUDUL BAB di baris terakhir dengan format: JUDUL: [judul bab mu]
      `.trim(),
    },
  ];
}
