import { z } from "zod";
import { LLM_MODEL_NAMES, DEFAULT_LLM_MODEL } from "../lib/models";

import { textTask }         from "./text";
import { uploadImageTask }  from "./uploadImage";
import { uploadVideoTask }  from "./uploadVideo";
import { runLLMTask }       from "./runLLM";
import { cropImageTask }    from "./cropImage";
import { extractFrameTask } from "./extractFrame";

// ── Task entry interface ───────────────────────────────────────────────────────

export interface TaskEntry {
  type:      string;
  schema:    z.ZodObject<z.ZodRawShape>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  task:      any;
  /** Key in the task's return object that carries the primary output value */
  outputKey: string;
}

// ── Schemas ───────────────────────────────────────────────────────────────────

const textSchema = z.object({
  text: z.string().default(""),
});

const uploadImageSchema = z.object({
  tempUrl:    z.string().optional(),
  fileBase64: z.string().optional(),
  fileName:   z.string().optional(),
});

const uploadVideoSchema = z.object({
  tempUrl:    z.string().optional(),
  fileBase64: z.string().optional(),
  fileName:   z.string().optional(),
});

const runLLMSchema = z.object({
  model:         z.enum(LLM_MODEL_NAMES).catch(DEFAULT_LLM_MODEL),
  user_message:  z.string().default(""),
  system_prompt: z.string().optional(),
  images:        z.array(z.string()).default([]),
});

const cropImageSchema = z.object({
  image_url:      z.string().default(""),
  x_percent:      z.coerce.number().default(0),
  y_percent:      z.coerce.number().default(0),
  width_percent:  z.coerce.number().default(100),
  height_percent: z.coerce.number().default(100),
});

const extractFrameSchema = z.object({
  video_url: z.string().default(""),
  timestamp: z.string().optional(),
});

// ── Registry ──────────────────────────────────────────────────────────────────

export const TASK_REGISTRY: TaskEntry[] = [
  { type: "textNode",         schema: textSchema,         task: textTask,         outputKey: "output"    },
  { type: "uploadImageNode",  schema: uploadImageSchema,  task: uploadImageTask,  outputKey: "image_url" },
  { type: "uploadVideoNode",  schema: uploadVideoSchema,  task: uploadVideoTask,  outputKey: "video_url" },
  { type: "runLLMNode",       schema: runLLMSchema,       task: runLLMTask,       outputKey: "output"    },
  { type: "cropImageNode",    schema: cropImageSchema,    task: cropImageTask,    outputKey: "image_url" },
  { type: "extractFrameNode", schema: extractFrameSchema, task: extractFrameTask, outputKey: "image_url" },
];
