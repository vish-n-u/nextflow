import type { LucideIcon } from "lucide-react";
import { Type, Image, Video, Sparkles, Scissors, Film } from "lucide-react";
import { DEFAULT_LLM_MODEL } from "./models";

// ── Handle data types ─────────────────────────────────────────────────────────
// Defined here (single source of truth) and re-exported by nodeContracts.ts

export type HandleDataType = "text" | "image" | "video";

// ── Node metadata ─────────────────────────────────────────────────────────────

export type NodeCategory = "Input" | "AI" | "Transform";

export interface NodeMeta {
  type:        string;
  label:       string;
  category:    NodeCategory;
  description: string;
  icon:        LucideIcon;
  defaultData: Record<string, unknown>;
  /** Output handle id → data type emitted */
  outputs: Record<string, HandleDataType>;
  /** Target handle id → data type expected */
  inputs:  Record<string, HandleDataType>;
}

// ── Registry ──────────────────────────────────────────────────────────────────

export const NODE_REGISTRY: NodeMeta[] = [
  {
    type:        "textNode",
    label:       "Text",
    category:    "Input",
    description: "Static text value",
    icon:        Type,
    defaultData: { text: "" },
    outputs:     { output: "text" },
    inputs:      {},
  },
  {
    type:        "uploadImageNode",
    label:       "Upload Image",
    category:    "Input",
    description: "Upload an image file",
    icon:        Image,
    defaultData: {},
    outputs:     { output: "image" },
    inputs:      {},
  },
  {
    type:        "uploadVideoNode",
    label:       "Upload Video",
    category:    "Input",
    description: "Upload a video file",
    icon:        Video,
    defaultData: {},
    outputs:     { output: "video" },
    inputs:      {},
  },
  {
    type:        "runLLMNode",
    label:       "Run LLM",
    category:    "AI",
    description: "Gemini language model",
    icon:        Sparkles,
    defaultData: { model: DEFAULT_LLM_MODEL, system_prompt: "", user_message: "" },
    outputs:     { output: "text" },
    inputs:      {
      system_prompt: "text",
      user_message:  "text",
      images:        "image",
    },
  },
  {
    type:        "cropImageNode",
    label:       "Crop Image",
    category:    "Transform",
    description: "Crop an image region",
    icon:        Scissors,
    defaultData: { x_percent: 0, y_percent: 0, width_percent: 100, height_percent: 100 },
    outputs:     { output: "image" },
    inputs:      { image_url: "image" },
  },
  {
    type:        "extractFrameNode",
    label:       "Extract Frame",
    category:    "Transform",
    description: "Pull frame from video",
    icon:        Film,
    defaultData: { timestamp: "" },
    outputs:     { output: "image" },
    inputs:      { video_url: "video" },
  },
];

/** Lookup helper */
export function getNodeMeta(type: string): NodeMeta | undefined {
  return NODE_REGISTRY.find((n) => n.type === type);
}
