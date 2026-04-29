import { prisma } from "@/lib/prisma";

export interface NodePreview {
  id:       string;
  type:     string;
  position: { x: number; y: number };
}

export interface EdgePreview {
  source: string;
  target: string;
}

export interface WorkflowSummary {
  id:           string;
  name:         string;
  nodeCount:    number;
  updatedAt:    string; // ISO string
  previewNodes: NodePreview[];
  previewEdges: EdgePreview[];
}

/**
 * Returns all workflows owned by the user, newest first.
 * Includes lightweight node/edge preview data for thumbnail rendering.
 * Full data (node configs, etc.) is excluded — use getWorkflow() for that.
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
      edges:     true,
      updatedAt: true,
    },
  });

  return workflows.map((w) => {
    const rawNodes = Array.isArray(w.nodes) ? w.nodes : [];
    const rawEdges = Array.isArray(w.edges) ? w.edges : [];

    const previewNodes: NodePreview[] = rawNodes.flatMap((n) => {
      if (typeof n !== "object" || n === null) return [];
      const node = n as Record<string, unknown>;
      const pos  = node.position as { x?: number; y?: number } | undefined;
      if (typeof node.id !== "string" || typeof node.type !== "string" || !pos) return [];
      return [{ id: node.id, type: node.type, position: { x: pos.x ?? 0, y: pos.y ?? 0 } }];
    });

    const previewEdges: EdgePreview[] = rawEdges.flatMap((e) => {
      if (typeof e !== "object" || e === null) return [];
      const edge = e as Record<string, unknown>;
      if (typeof edge.source !== "string" || typeof edge.target !== "string") return [];
      return [{ source: edge.source, target: edge.target }];
    });

    return {
      id:        w.id,
      name:      w.name,
      nodeCount: previewNodes.length,
      updatedAt: w.updatedAt.toISOString(),
      previewNodes,
      previewEdges,
    };
  });
}
