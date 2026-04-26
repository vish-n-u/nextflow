import { task } from "@trigger.dev/sdk";
import { z } from "zod";
import { LLM_MODEL_NAMES, DEFAULT_LLM_MODEL } from "../lib/models";
import { textTask } from "./text";
import { uploadImageTask } from "./uploadImage";
import { uploadVideoTask } from "./uploadVideo";
import { runLLMTask } from "./runLLM";
import { cropImageTask } from "./cropImage";
import { extractFrameTask } from "./extractFrame";

interface FlowNode {
  id: string;
  type: string;
  data: Record<string, unknown>;
}

interface FlowEdge {
  source: string;
  target: string;
  targetHandle: string;
}

// ── Per-node data schemas ────────────────────────────────────────────────────

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

// ── Helpers ──────────────────────────────────────────────────────────────────

type WorkflowStatus = "running" | "success" | "error";

async function emitStatus(serverUrl: string, nodeId: string, status: WorkflowStatus): Promise<void> {
  try {
    await fetch(`${serverUrl}/emit-status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nodeId, status }),
    });
  } catch {
    // Non-fatal — socket emit failure shouldn't stop the workflow
  }
}

/** Kahn's algorithm — returns nodes in execution order */
function topoSort(nodes: FlowNode[], edges: FlowEdge[]): FlowNode[] {
  const inDegree = new Map<string, number>();
  const adj      = new Map<string, string[]>();

  for (const node of nodes) {
    inDegree.set(node.id, 0);
    adj.set(node.id, []);
  }

  for (const edge of edges) {
    adj.get(edge.source)?.push(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
  }

  const queue  = nodes.filter((n) => inDegree.get(n.id) === 0);
  const sorted: FlowNode[] = [];

  while (queue.length > 0) {
    const node = queue.shift()!;
    sorted.push(node);
    for (const neighborId of adj.get(node.id) ?? []) {
      const deg = (inDegree.get(neighborId) ?? 0) - 1;
      inDegree.set(neighborId, deg);
      if (deg === 0) queue.push(nodes.find((n) => n.id === neighborId)!);
    }
  }

  return sorted;
}

// ── Orchestrator task ────────────────────────────────────────────────────────

export const orchestratorTask = task({
  id: "orchestrator",
  maxDuration: 600,
  run: async (payload: { nodes: FlowNode[]; edges: FlowEdge[]; serverUrl: string }) => {
    const { nodes, edges, serverUrl } = payload;

    const sorted = topoSort(nodes, edges);

    // Stores each node's primary output value after it runs
    const nodeOutputs: Record<string, unknown> = {};

    for (const node of sorted) {
      await emitStatus(serverUrl, node.id, "running");

      try {
        // Collect values passed in from upstream connected nodes
        const incomingEdges = edges.filter((e) => e.target === node.id);
        const inputs: Record<string, unknown> = {};

        for (const edge of incomingEdges) {
          const upstream = nodeOutputs[edge.source];
          if (upstream === undefined) continue;

          if (edge.targetHandle === "images") {
            // images handle accepts multiple connections → build array
            const existing = inputs.images;
            inputs.images = [...(Array.isArray(existing) ? existing : []), upstream];
          } else {
            inputs[edge.targetHandle] = upstream;
          }
        }

        // Merge: node's own form data first, upstream connections override
        const d = { ...node.data, ...inputs };

        let output: unknown;

        switch (node.type) {
          case "textNode": {
            const p = textSchema.parse(d);
            const r = await textTask.triggerAndWait({ text: p.text });
            if (!r.ok) throw new Error(String(r.error));
            output = r.output.output;
            break;
          }

          case "uploadImageNode": {
            const p = uploadImageSchema.parse(d);
            const r = await uploadImageTask.triggerAndWait(p);
            if (!r.ok) throw new Error(String(r.error));
            output = r.output.image_url;
            break;
          }

          case "uploadVideoNode": {
            const p = uploadVideoSchema.parse(d);
            const r = await uploadVideoTask.triggerAndWait(p);
            if (!r.ok) throw new Error(String(r.error));
            output = r.output.video_url;
            break;
          }

          case "runLLMNode": {
            const p = runLLMSchema.parse(d);
            const r = await runLLMTask.triggerAndWait(p);
            if (!r.ok) throw new Error(String(r.error));
            output = r.output.output;
            break;
          }

          case "cropImageNode": {
            const p = cropImageSchema.parse(d);
            const r = await cropImageTask.triggerAndWait(p);
            if (!r.ok) throw new Error(String(r.error));
            output = r.output.image_url;
            break;
          }

          case "extractFrameNode": {
            const p = extractFrameSchema.parse(d);
            const r = await extractFrameTask.triggerAndWait(p);
            if (!r.ok) throw new Error(String(r.error));
            output = r.output.image_url;
            break;
          }

          default:
            output = null;
        }

        nodeOutputs[node.id] = output;
        await emitStatus(serverUrl, node.id, "success");
      } catch (err) {
        await emitStatus(serverUrl, node.id, "error");
        throw err; // stops the workflow on first failure
      }
    }

    return { outputs: nodeOutputs };
  },
});
