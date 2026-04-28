import { prisma } from "@/lib/prisma";

export interface WorkflowSummary {
  id:        string;
  name:      string;
  nodeCount: number;
  updatedAt: string; // ISO string
}

/**
 * Returns all workflows owned by the user, newest first.
 * Only fetches summary fields — full nodes/edges JSON is excluded to keep
 * the list response small. Use getWorkflow() to load a specific workflow.
 */
export async function listWorkflows(
  userId: string,
  limit  = 5,
  offset = 0,
): Promise<WorkflowSummary[]> {
  const workflows = await prisma.workflow.findMany({
    where:   { userId },
    orderBy: { updatedAt: "desc" },
    take:    limit,
    skip:    offset,
    select: {
      id:        true,
      name:      true,
      nodes:     true,
      updatedAt: true,
    },
  });

  return workflows.map((w) => ({
    id:        w.id,
    name:      w.name,
    // nodes is stored as a JSON array — derive count without sending the full payload
    nodeCount: Array.isArray(w.nodes) ? w.nodes.length : 0,
    updatedAt: w.updatedAt.toISOString(),
  }));
}
