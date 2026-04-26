export const LLM_MODELS = {
  "Gemini 2.5 Flash":      "gemini-2.5-flash",
  "Gemini 2.5 Flash-Lite": "gemini-2.5-flash-lite",
} as const;

export type LLMModelName = keyof typeof LLM_MODELS;
export type LLMModelId   = (typeof LLM_MODELS)[LLMModelName];

export const LLM_MODEL_NAMES   = Object.keys(LLM_MODELS) as LLMModelName[];
export const DEFAULT_LLM_MODEL = "Gemini 2.5 Flash" satisfies LLMModelName;
