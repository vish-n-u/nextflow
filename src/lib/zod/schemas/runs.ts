import * as z from "zod/v4";

export const nodeSchema = z.object({
  id:       z.string().describe("React Flow node ID"),
  type:     z.string().describe("Node type key"),
  data:     z.record(z.string(), z.unknown()).describe("Node data snapshot at run time"),
  position: z.object({ x: z.number(), y: z.number() }).optional().describe("Canvas position"),
});

export const edgeSchema = z.object({
  id:           z.string().optional().describe("React Flow edge ID"),
  source:       z.string().describe("Source node ID"),
  target:       z.string().describe("Target node ID"),
  sourceHandle: z.string().nullable().optional().describe("Source handle ID"),
  targetHandle: z.string().describe("Target handle ID"),
});

export const createRunSchema = z.object({
  triggerRunId: z.string().describe("Trigger.dev run ID"),
  workflowName: z.string().default("Untitled").describe("Workflow display name"),
  scope:        z.enum(["full", "partial", "single"]).describe("Execution scope"),
  workflowId:   z.string().optional().describe("Existing saved workflow ID to link this run to"),
  nodes:        z.array(nodeSchema).describe("Canvas nodes at run time"),
  edges:        z.array(edgeSchema).describe("Canvas edges at run time"),
});

export type CreateRunInput = z.infer<typeof createRunSchema>;

const nodeResultSchema = z.object({
  status:     z.enum(["pending", "running", "success", "failed"])
                .describe("Final node status"),
  output:     z.unknown().optional().describe("Node output value"),
  error:      z.string().optional().describe("Error message if failed"),
  durationMs: z.number().int().nonnegative().optional().describe("Execution time in ms"),
});

export const completeRunSchema = z.object({
  status:      z.enum(["success", "failed", "partial"]).describe("Overall run status"),
  completedAt: z.string().datetime().describe("ISO datetime string of completion"),
  nodeResults: z
    .record(z.string(), nodeResultSchema)
    .describe("Per-node results keyed by React Flow node ID"),
});

export type CompleteRunInput = z.infer<typeof completeRunSchema>;
