import { create } from "zustand";
import { persist } from "zustand/middleware";

export const AVAILABLE_MODELS = [
  { value: "mistral-large-3:675b-cloud", label: "Mistral Large 3 (675B)" },
  { value: "gemini-3-flash-preview:cloud",     label: "Gemini 3 Flash" },
  { value: "deepseek-v3.2:cloud",         label: "Deepseek v3.2" },
  { value: "glm-5:cloud",          label: "GLM 5" },
  { value: "gemma3:27b-cloud",           label: "Gemma 3 (27B)" },
  { value: "qwen3.5:397b-cloud",          label: "Qwen 3.5 (397B)" },
];

interface SettingsState {
  selectedModel: string;
  temperature: number;
  repeat_penalty: number;
  max_tokens: number;
  setModel: (model: string) => void;
  setTemperature: (v: number) => void;
  setRepeatPenalty: (v: number) => void;
  setMaxTokens: (v: number) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      selectedModel:  "mistral-large-3:675b-cloud",
      temperature:    0.92,
      repeat_penalty: 1.35,
      max_tokens:     4000,
      setModel:         (model) => set({ selectedModel: model }),
      setTemperature:   (v)     => set({ temperature: v }),
      setRepeatPenalty: (v)     => set({ repeat_penalty: v }),
      setMaxTokens:     (v)     => set({ max_tokens: v }),
    }),
    { name: "novel-weaver-settings" }
  )
);
