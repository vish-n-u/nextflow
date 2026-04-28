import { prisma, type Prisma } from "@/lib/prisma";
import { AppApiError } from "@/lib/errors";
import type { SaveWorkflowInput } from "@/lib/zod/schemas/workflows";

/**
 * Creates or updates a workflow canvas.
 *
 * Flow:
 * 1. Upserts the user (Clerk userId may not exist in DB yet on first save).
 * 2. If workflowId is provided:
 *    - Verifies the workflow exists and belongs to this user (throws otherwise).
 *    - Updates name, nodes, and edges in place.
 *    - Returns the same id so the caller's savedWorkflowIdRef stays stable.
 * 3. If no workflowId: creates a fresh Workflow row and returns its new id.
 *    The caller stores this id and passes it on subsequent saves to hit the
 *    update branch above (upsert-by-client-id pattern).
 */
export async function saveWorkflow(
  input: SaveWorkflowInput,
  userId: string,
): Promise<{ id: string }> {
  // Ensure the user exists in our DB (Clerk syncs lazily)
  await prisma.user.upsert({
    where:  { id: userId },
    update: {},
    create: { id: userId },
  });

  if (input.workflowId) {
    // Update path — verify ownership before writing
    const existing = await prisma.workflow.findUnique({
      where:  { id: input.workflowId },
      select: { userId: true },
    });

    if (!existing) {
      throw new AppApiError({ code: "not_found", message: "Workflow not found." });
    }
    if (existing.userId !== userId) {
      throw new AppApiError({ code: "forbidden", message: "Access denied." });
    }

    await prisma.workflow.update({
      where: { id: input.workflowId },
      data:  {
        name:  input.name,
        nodes: input.nodes as Prisma.InputJsonValue,
        edges: input.edges as Prisma.InputJsonValue,
      },
    });

    return { id: input.workflowId };
  }

  // Create path — first save for this canvas session
  const workflow = await prisma.workflow.create({
    data:   {
      name:  input.name,
      userId,
      nodes: input.nodes as Prisma.InputJsonValue,
      edges: input.edges as Prisma.InputJsonValue,
    },
    select: { id: true },
  });

  return { id: workflow.id };
}
