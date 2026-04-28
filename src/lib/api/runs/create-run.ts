import { prisma } from "@/lib/prisma";
import type { CreateRunInput } from "@/lib/zod/schemas/runs";

export async function createRun(input: CreateRunInput, userId: string): Promise<{ id: string }> {
  await prisma.user.upsert({
    where:  { id: userId },
    update: {},
    create: { id: userId },
  });

  // Single-node runs have no workflow context — skip workflow creation
  let workflowId: string | undefined;
  if (input.scope !== "single") {
    const workflow = await prisma.workflow.create({
      data:   { name: input.workflowName, userId, nodes: input.nodes, edges: input.edges },
      select: { id: true },
    });
    workflowId = workflow.id;
  }

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
          input:    n.data,
        })),
      },
    },
    select: { id: true },
  });

  return { id: run.id };
}
