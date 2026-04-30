import { prisma } from "@/lib/prisma";
import { AppApiError } from "@/lib/errors";

export interface WorkflowDetail {
  id:       string;
  name:     string;
  nodes:    unknown; // React Flow node array (JSON stored as-is)
  edges:    unknown; // React Flow edge array (JSON stored as-is)
  isPublic: boolean;
}

/**
 * Fetches a single workflow by ID and verifies ownership.
 * Returns the full nodes + edges JSON so the canvas can restore them.
 * Throws AppApiError (not_found / forbidden) on failure.
 */
export async function getWorkflow(workflowId: string, userId: string): Promise<WorkflowDetail> {
  const workflow = await prisma.workflow.findUnique({
    where:  { id: workflowId },
    select: { id: true, name: true, nodes: true, edges: true, userId: true, isPublic: true },
  });

  if (!workflow) {
    throw new AppApiError({ code: "not_found", message: "Workflow not found." });
  }

  if (workflow.userId !== userId) {
    throw new AppApiError({ code: "forbidden", message: "Access denied." });
  }

  return {
    id:       workflow.id,
    name:     workflow.name,
    nodes:    workflow.nodes,
    edges:    workflow.edges,
    isPublic: workflow.isPublic,
  };
}
