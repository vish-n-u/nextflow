import * as z from "zod/v4";
import { nodeSchema, edgeSchema } from "./runs";

export const saveAppSchema = z.object({
  name:  z.string().min(1).default("Untitled").describe("App display name"),
  nodes: z.array(nodeSchema).describe("Canvas nodes"),
  edges: z.array(edgeSchema).describe("Canvas edges"),
});

export type SaveAppInput = z.infer<typeof saveAppSchema>;
