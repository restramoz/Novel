/**
 * Character prompt — dirancang khusus agar output AI
 * langsung 1:1 dengan kolom DB characters:
 *   name, role, physical_traits, personality,
 *   abilities, relationships
 *
 * Setiap field berisi teks kaya dalam SATU BARIS
 * menggunakan separator " | " — ini mencegah
 * JSON parse gagal akibat newline di dalam string.
 */
export function characterPrompt(synopsis: string, masterConcept?: string) {
  const context = masterConcept
    ? `SYNOPSIS:\n${synopsis}\n\nMASTER CONCEPT (panduan utama):\n${masterConcept}`
    : `SYNOPSIS:\n${synopsis}`;

  return [
    {
      role: "system",
      content: `
Kamu adalah arsitek karakter novel profesional.

════════════════════════════════════════
ATURAN OUTPUT — WAJIB DIPATUHI
════════════════════════════════════════

1. Kembalikan HANYA array JSON mentah. Mulai dengan [ dan akhiri dengan ]
2. TIDAK ADA teks di luar JSON. Tidak ada penjelasan. Tidak ada markdown.
3. Setiap nilai string HARUS dalam SATU BARIS — gunakan " | " sebagai pemisah antar bagian, JANGAN gunakan \\n di dalam nilai JSON
4. Semua teks dalam Bahasa Indonesia

════════════════════════════════════════
JUMLAH KARAKTER
════════════════════════════════════════

- Tepat 1 protagonis
- 1–2 antagonis
- 3–5 karakter pendukung
- Total 5–8 karakter

════════════════════════════════════════
FORMAT SETIAP OBJEK — TEPAT 6 FIELD INI
════════════════════════════════════════

{
  "name": "Nama lengkap karakter",

  "role": "protagonist ATAU antagonist ATAU supporting",

  "physical_traits": "Deskripsi fisik lengkap (tinggi, rambut, mata, ciri khas, cara berjalan) | Usia: [usia] | Cara bicara: [gaya bicara, formal/informal, ekspresi khas]",

  "personality": "Kepribadian: [4-5 sifat dominan, cara berpikir, cacat utama] | Latar: [asal-usul, trauma, peristiwa pembentuk minimal 2 kalimat] | Motivasi: [tujuan permukaan vs kebenaran tersembunyi yang bertentangan] | Kelemahan: [fisik, emosional, dan moral] | Arc: [titik awal, perubahan, kondisi akhir karakter]",

  "abilities": "Kekuatan dan teknik utama dengan nama spesifik | Level atau tingkatan jika relevan | Kemampuan tersembunyi yang belum diketahui orang lain",

  "relationships": "Hubungan spesifik dengan karakter lain — sebutkan nama, jenis hubungan, rahasia atau konflik tersembunyi di antara mereka"
}

CONTOH physical_traits yang benar (SATU BARIS):
"Tinggi 178cm, rambut hitam pekat acak-acakan, mata cokelat seperti bara api yang belum padam, rahang tegas | Usia: 23 tahun | Cara bicara: Singkat dan tegas, bicara hanya saat perlu, suara rendah saat marah"

CONTOH personality yang benar (SATU BARIS):
"Kepribadian: Tekad baja, hati hangat tersembunyi, tidak pernah menyerah, keras kepala hingga membahayakan diri sendiri | Latar: Lahir dari keluarga pandai besi miskin, ayahnya dibunuh kultivator jahat saat ia berusia 8 tahun, tumbuh dengan dendam yang mengakar | Motivasi: Ingin membalas dendam ayah vs kebenaran bahwa ia takut menjadi seperti mereka yang ia benci | Kelemahan: Mudah diprovokasi ancaman terhadap orang tersayang, buta terhadap tipu daya halus | Arc: Dari pemuda impulsif yang dikuasai dendam menjadi pelindung yang belajar memaafkan"
      `.trim(),
    },
    {
      role: "user",
      content: `Buat roster karakter untuk novel ini. Kembalikan HANYA array JSON, tidak ada teks lain.\n\n${context}`,
    },
  ];
}
