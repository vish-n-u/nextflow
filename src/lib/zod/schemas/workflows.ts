import * as z from "zod/v4";
import { nodeSchema, edgeSchema } from "./runs";

export const saveWorkflowSchema = z.object({
  workflowId: z.string().optional().describe("Existing workflow ID — omit to create a new one"),
  name:       z.string().min(1).default("Untitled").describe("Workflow display name"),
  nodes:      z.array(nodeSchema).describe("Current canvas nodes"),
  edges:      z.array(edgeSchema).describe("Current canvas edges"),
});

export type SaveWorkflowInput = z.infer<typeof saveWorkflowSchema>;
