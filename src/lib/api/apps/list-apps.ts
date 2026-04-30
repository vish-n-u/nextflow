import { prisma } from "@/lib/prisma";
import type { NodePreview, EdgePreview } from "@/lib/api/workflows/list-workflows";

export interface AppSummary {
  id:           string;
  name:         string;
  creatorId:    string;
  nodeCount:    number;
  updatedAt:    string; // ISO string
  previewNodes: NodePreview[];
  previewEdges: EdgePreview[];
}

/**
 * Returns all apps across all users, newest first.
 * Apps are public — no userId filter applied.
 */
export async function listApps(limit = 5, offset = 0): Promise<AppSummary[]> {
  const apps = await prisma.app.findMany({
    orderBy: { updatedAt: "desc" },
    take:    limit,
    skip:    offset,
    select: {
      id:        true,
      name:      true,
      creatorId: true,
      nodes:     true,
      edges:     true,
      updatedAt: true,
    },
  });

  return apps.map((a) => {
    const rawNodes = Array.isArray(a.nodes) ? a.nodes : [];
    const rawEdges = Array.isArray(a.edges) ? a.edges : [];

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
      id:        a.id,
      name:      a.name,
      creatorId: a.creatorId,
      nodeCount: previewNodes.length,
      updatedAt: a.updatedAt.toISOString(),
      previewNodes,
      previewEdges,
    };
  });
}
