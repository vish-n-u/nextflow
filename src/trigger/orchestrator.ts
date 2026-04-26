import { task } from "@trigger.dev/sdk";
import { TASK_REGISTRY } from "./taskRegistry";

interface FlowNode {
  id:   string;
  type: string;
  data: Record<string, unknown>;
}

interface FlowEdge {
  source:       string;
  target:       string;
  targetHandle: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

type WorkflowStatus = "running" | "success" | "error";

async function emitStatus(serverUrl: string, nodeId: string, status: WorkflowStatus): Promise<void> {
  try {
    await fetch(`${serverUrl}/emit-status`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ nodeId, status }),
    });
  } catch {
    // Non-fatal — socket emit failure shouldn't stop the workflow
  }
}

/** Kahn's algorithm — returns nodes in execution order */
function topoSort(nodes: FlowNode[], edges: FlowEdge[]): FlowNode[] {
  const inDegree = new Map<string, number>();
  const adj      = new Map<string, string[]>();

  for (const node of nodes) {
    inDegree.set(node.id, 0);
    adj.set(node.id, []);
  }

  for (const edge of edges) {
    adj.get(edge.source)?.push(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
  }

  const queue  = nodes.filter((n) => inDegree.get(n.id) === 0);
  const sorted: FlowNode[] = [];

  while (queue.length > 0) {
    const node = queue.shift()!;
    sorted.push(node);
    for (const neighborId of adj.get(node.id) ?? []) {
      const deg = (inDegree.get(neighborId) ?? 0) - 1;
      inDegree.set(neighborId, deg);
      if (deg === 0) queue.push(nodes.find((n) => n.id === neighborId)!);
    }
  }

  return sorted;
}

// ── Orchestrator task ────────────────────────────────────────────────────────

export const orchestratorTask = task({
  id: "orchestrator",
  maxDuration: 600,
  run: async (payload: { nodes: FlowNode[]; edges: FlowEdge[]; serverUrl: string }) => {
    const { nodes, edges, serverUrl } = payload;
    const sorted = topoSort(nodes, edges);
    const nodeOutputs: Record<string, unknown> = {};

    for (const node of sorted) {
      await emitStatus(serverUrl, node.id, "running");

      try {
        // Collect upstream outputs into inputs map
        const inputs: Record<string, unknown> = {};
        for (const edge of edges.filter((e) => e.target === node.id)) {
          const upstream = nodeOutputs[edge.source];
          if (upstream === undefined) continue;

          if (edge.targetHandle === "images") {
            const existing = inputs.images;
            inputs.images = [...(Array.isArray(existing) ? existing : []), upstream];
          } else {
            inputs[edge.targetHandle] = upstream;
          }
        }

        // Merge node's own form data with upstream values (upstream wins)
        const d = { ...node.data, ...inputs };

        const entry = TASK_REGISTRY.find((e) => e.type === node.type);
        if (!entry) {
          // Unknown node type — skip gracefully without failing the workflow
          nodeOutputs[node.id] = null;
          await emitStatus(serverUrl, node.id, "success");
          continue;
        }

        const p = entry.schema.parse(d);
        const r = await entry.task.triggerAndWait(p);
        if (!r.ok) throw new Error(String(r.error));

        nodeOutputs[node.id] = r.output[entry.outputKey];
        await emitStatus(serverUrl, node.id, "success");
      } catch (err) {
        await emitStatus(serverUrl, node.id, "error");
        throw err;
      }
    }

    return { outputs: nodeOutputs };
  },
});
