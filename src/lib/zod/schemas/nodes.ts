import * as z from "zod/v4";

export const triggerNodeSchema = z.object({
  nodeType: z.string().describe("Node type key — must match a TASK_REGISTRY entry or 'orchestrator'"),
  data:     z.record(z.string(), z.unknown()).describe("Node input data"),
});

export type TriggerNodeInput = z.infer<typeof triggerNodeSchema>;
