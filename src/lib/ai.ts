export interface AIOptions {
  model?: string;
  temperature?: number;
  repeat_penalty?: number;
  max_tokens?: number;
}

export async function generateAI(messages: any[], options?: AIOptions) {
  const model          = options?.model          ?? "mistral-large-3:675b-cloud";
  const temperature    = options?.temperature    ?? 0.92;
  const repeat_penalty = options?.repeat_penalty ?? 1.35;
  const max_tokens     = options?.max_tokens     ?? 3500;

  const res = await fetch("/ollama/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_OLLAMA_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
      options: { temperature, repeat_penalty, num_predict: max_tokens },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("❌ Ollama HTTP Error:", res.status, errText);
    throw new Error(`Ollama error ${res.status}: ${errText}`);
  }

  const json = await res.json();
  console.log("AI RAW:", json);

  return (
    json?.message?.content ||
    json?.choices?.[0]?.message?.content ||
    ""
  );
}
