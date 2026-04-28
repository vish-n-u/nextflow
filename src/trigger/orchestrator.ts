import { task, metadata } from "@trigger.dev/sdk";
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

type NodeStatus = "running" | "success" | "error";

/**
 * Kahn's algorithm — returns execution levels instead of a flat list.
 * All nodes within a level have no dependencies on each other and can run in parallel.
 */
function buildLevels(nodes: FlowNode[], edges: FlowEdge[]): FlowNode[][] {
  const inDegree = new Map<string, number>();
  const adj      = new Map<string, string[]>();
  console.log("Building levels for nodes", nodes, "and edges", edges);

  for (const node of nodes) {
    inDegree.set(node.id, 0);
    adj.set(node.id, []);
  }
  console.log("Initialized inDegree and adjacency list", { inDegree, adj });

  for (const edge of edges) {
    adj.get(edge.source)?.push(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
  }
  console.log("Populated inDegree and adjacency list", { inDegree, adj });

  const levels: FlowNode[][] = [];
  let current = nodes.filter((n) => inDegree.get(n.id) === 0);

  while (current.length > 0) {
    levels.push(current);
    const next: FlowNode[] = [];
    for (const node of current) {
      for (const neighborId of adj.get(node.id) ?? []) {
        const deg = (inDegree.get(neighborId) ?? 0) - 1;
        inDegree.set(neighborId, deg);
        if (deg === 0) next.push(nodes.find((n) => n.id === neighborId)!);
      }
    }
    current = next;
  }
  console.log("Built execution levels", levels,current);

  return levels;
}

// ── Node runner (one node per invocation — used for parallel batch execution) ─

export const nodeRunnerTask = task({
  id: "node-runner",
  maxDuration: 300,
  run: async (payload: {
    nodeId:   string;
    nodeType: string;
    data:     Record<string, unknown>;
  }): Promise<{ nodeId: string; output: unknown }> => {
    const { nodeId, nodeType, data } = payload;

    const entry = TASK_REGISTRY.find((e) => e.type === nodeType);
    if (!entry) return { nodeId, output: null };

    const p = entry.schema.parse(data);
    const r = await entry.task.triggerAndWait(p);
    if (!r.ok) throw new Error(String(r.error));

    return { nodeId, output: r.output[entry.outputKey] };
  },
});

// ── Orchestrator task ────────────────────────────────────────────────────────

export const orchestratorTask = task({
  id: "orchestrator",
  maxDuration: 600,
  run: async (payload: { nodes: FlowNode[]; edges: FlowEdge[] }) => {
    const { nodes, edges } = payload;
    const levels       = buildLevels(nodes, edges);
    const nodeOutputs:   Record<string, unknown>    = {};
    const nodeStatuses:  Record<string, NodeStatus> = {};
    const nodeErrors:    Record<string, string>     = {};
    const nodeDurations: Record<string, number>     = {};

    for (const level of levels) {
      for (const node of level) nodeStatuses[node.id] = "running";
      metadata.set("nodeStatuses", { ...nodeStatuses });
      await metadata.flush();

      const levelPayloads = level.map((node) => {
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
        return {
          payload: {
            nodeId:   node.id,
            nodeType: node.type,
            data:     { ...node.data, ...inputs },
          },
        };
      });

      const levelStart = Date.now();
      const results    = await nodeRunnerTask.batchTriggerAndWait(levelPayloads);
      const levelMs    = Date.now() - levelStart;

      let levelFailed = false;
      for (let i = 0; i < results.runs.length; i++) {
        const run  = results.runs[i];
        const node = level[i];
        nodeDurations[node.id] = levelMs;
        if (run.ok) {
          nodeOutputs[node.id]  = run.output.output;
          nodeStatuses[node.id] = "success";
        } else {
          nodeStatuses[node.id] = "error";
          nodeErrors[node.id]   = run.error ? String(run.error) : "Node failed";
          levelFailed           = true;
        }
      }

      metadata.set("nodeStatuses",  { ...nodeStatuses });
      metadata.set("nodeOutputs",   { ...nodeOutputs });
      metadata.set("nodeErrors",    { ...nodeErrors });
      metadata.set("nodeDurations", { ...nodeDurations });
      await metadata.flush();

      if (levelFailed) throw new Error("One or more nodes in this level failed");
    }

    return { outputs: nodeOutputs };
  },
});
