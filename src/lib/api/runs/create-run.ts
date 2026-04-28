import { prisma, type Prisma } from "@/lib/prisma";
import type { CreateRunInput } from "@/lib/zod/schemas/runs";

/**
 * Creates a Run and its associated NodeRun rows at the moment execution begins.
 *
 * Flow:
 * 1. Upserts the user row (Clerk userId may not exist in DB yet on first run).
 * 2. For full/partial workflow runs: creates a Workflow snapshot (nodes + edges JSON)
 *    so history always reflects what the canvas looked like at run time.
 *    For single-node runs: skips workflow creation — workflowId stays null.
 * 3. Creates the Run row (status: "running") with one NodeRun per node (status: "pending").
 *    NodeRun.input stores the node's data snapshot for inspection in the history sidebar.
 *
 * Returns the new Run id so the caller can PATCH it on completion.
 */
export async function createRun(input: CreateRunInput, userId: string): Promise<{ id: string }> {
  // Ensure the user exists in our DB (Clerk syncs lazily)
  await prisma.user.upsert({
    where:  { id: userId },
    update: {},
    create: { id: userId },
  });

  // Link this run to the existing saved workflow if provided.
  // Single-node runs have no workflow context, so workflowId stays undefined.
  const workflowId = input.scope !== "single" ? (input.workflowId ?? undefined) : undefined;

  const run = await prisma.run.create({
    data: {
      workflowId,
      userId,
      status:       "running",
      scope:        input.scope,
      triggerRunId: input.triggerRunId,
      nodeRuns: {
        create: input.nodes.map((n) => ({
          nodeId:   n.id,
          nodeType: n.type,
          status:   "pending" as const,
          input:    n.data as Prisma.InputJsonValue,
        })),
      },
    },
    select: { id: true },
  });

  return { id: run.id };
}
