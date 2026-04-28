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
  /**
   * Returns an error string if the node's data is incomplete, or null if valid.
   * `connectedHandles` is the set of target handle IDs that have incoming edges —
   * fields supplied by upstream nodes don't need to be filled in manually.
   */
  validate: (data: Record<string, unknown>, connectedHandles?: Set<string>) => string | null;
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
    validate:    (data) => String(data.text ?? "").trim() ? null : "Text cannot be empty",
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
    validate:    (data) => data.fileBase64 ? null : "No image selected",
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
    validate:    (data) => data.fileBase64 ? null : "No video selected",
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
    validate: (data, connectedHandles) =>
      connectedHandles?.has("user_message") || String(data.user_message ?? "").trim()
        ? null
        : "User message is required",
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
    validate:    () => null,
  },
  {
    type:        "extractFrameNode",
    label:       "Extract Frame",
    category:    "Transform",
    description: "Pull frame from video",
    icon:        Film,
    defaultData: { timestamp: "" },
    outputs:     { output: "image" },
    inputs:      { video_url: "video", timestamp: "text" },
    validate: (data, connectedHandles) =>
      connectedHandles?.has("timestamp") || String(data.timestamp ?? "").trim()
        ? null
        : "Timestamp is required",
  },
];

/** Lookup helper */
export function getNodeMeta(type: string): NodeMeta | undefined {
  return NODE_REGISTRY.find((n) => n.type === type);
}
