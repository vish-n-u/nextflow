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
 * Backward-leveling — assigns each node a "depth from end":
 *   terminal nodes (no outgoing edges) = depth 0
 *   all others = max(successor depths) + 1
 *
 * Nodes are then grouped by depth and executed highest-depth-first,
 * so every node runs as late as possible ("just in time" before its
 * first successor needs it).  All nodes within a level are independent
 * and run in parallel.
 */
function buildLevels(nodes: FlowNode[], edges: FlowEdge[]): FlowNode[][] {
  const nodeIds = new Set(nodes.map((n) => n.id));

  // successors[id] = list of node IDs that this node feeds into
  const successors = new Map<string, string[]>();
  for (const node of nodes) successors.set(node.id, []);
  for (const edge of edges) {
    if (nodeIds.has(edge.source) && nodeIds.has(edge.target)) {
      successors.get(edge.source)!.push(edge.target);
    }
  }

  // Memoised depth-from-end (safe because the canvas enforces a DAG)
  const cache = new Map<string, number>();
  function depthOf(id: string): number {
    if (cache.has(id)) return cache.get(id)!;
    const succs = successors.get(id) ?? [];
    const depth = succs.length === 0
      ? 0
      : Math.max(...succs.map(depthOf)) + 1;
    cache.set(id, depth);
    return depth;
  }
  for (const node of nodes) depthOf(node.id);

  // Group by depth, sort descending so the deepest nodes execute first
  const byDepth = new Map<number, FlowNode[]>();
  for (const node of nodes) {
    const d = cache.get(node.id)!;
    if (!byDepth.has(d)) byDepth.set(d, []);
    byDepth.get(d)!.push(node);
  }

  return Array.from(byDepth.entries())
    .sort(([a], [b]) => b - a)   // highest depth → first level to run
    .map(([, group]) => group);
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
  // Never retry the orchestrator automatically — a retry would rerun every node
  // from scratch. Node-level retries are configured on individual tasks instead.
  retry: { maxAttempts: 1 },
  run: async (payload: { nodes: FlowNode[]; edges: FlowEdge[] }) => {
    const { nodes, edges } = payload;
    const levels       = buildLevels(nodes, edges);
    const nodeOutputs:   Record<string, string>     = {};
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
          nodeOutputs[node.id]  = run.output.output as string;
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
