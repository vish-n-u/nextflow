import { prisma } from "@/lib/prisma";
import { AppApiError } from "@/lib/errors";
import type { SaveWorkflowInput } from "@/lib/zod/schemas/workflows";

export async function saveWorkflow(
  input: SaveWorkflowInput,
  userId: string,
): Promise<{ id: string }> {
  await prisma.user.upsert({
    where:  { id: userId },
    update: {},
    create: { id: userId },
  });

  if (input.workflowId) {
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
      data:  { name: input.name, nodes: input.nodes, edges: input.edges },
    });

    return { id: input.workflowId };
  }

  const workflow = await prisma.workflow.create({
    data:   { name: input.name, userId, nodes: input.nodes, edges: input.edges },
    select: { id: true },
  });

  return { id: workflow.id };
}
