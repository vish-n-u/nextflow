import { task } from "@trigger.dev/sdk";
import { textTask } from "./text";
import { uploadImageTask } from "./uploadImage";
import { uploadVideoTask } from "./uploadVideo";
import { runLLMTask } from "./runLLM";
import { cropImageTask } from "./cropImage";
import { extractFrameTask } from "./extractFrame";

type NodeStatus = "running" | "success" | "error";

async function emitStatus(serverUrl: string, nodeId: string, status: NodeStatus) {
  try {
    await fetch(`${serverUrl}/emit-status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nodeId, status }),
    });
  } catch {
    // Non-fatal — socket emit failure shouldn't stop the workflow
  }
}

/** Kahn's algorithm — returns nodes in execution order */
function topoSort(nodes: any[], edges: any[]): any[] {
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();
  console.log("Topological sort input nodes:", nodes);
  console.log("Topological sort input edges:", edges);

  for (const node of nodes) {
    inDegree.set(node.id, 0);
    adj.set(node.id, []);
  }
  console.log("Initial inDegree map:", inDegree);
  console.log("Initial adjacency list:", adj);
  for (const edge of edges) {
    adj.get(edge.source)?.push(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
  }
  console.log("Final inDegree map after processing edges:", inDegree);
  console.log("Final adjacency list after processing edges:", adj);

  const queue = nodes.filter((n) => inDegree.get(n.id) === 0);
  const sorted: any[] = [];

  console.log("Initial queue (nodes with in-degree 0):", queue);
  console.log("Starting topological sort...",sorted);

  while (queue.length > 0) {
    const node = queue.shift()!;
    sorted.push(node);
    for (const neighborId of adj.get(node.id) ?? []) {
      const deg = (inDegree.get(neighborId) ?? 0) - 1;
      inDegree.set(neighborId, deg);
      if (deg === 0) queue.push(nodes.find((n) => n.id === neighborId)!);
    }
  }

  console.log("Topological sort result:", sorted);

  return sorted;
}

export const orchestratorTask = task({
  id: "orchestrator",
  maxDuration: 600,
  run: async (payload: { nodes: any[]; edges: any[]; serverUrl: string }) => {
    const { nodes, edges, serverUrl } = payload;

    const sorted = topoSort(nodes, edges);

    // Stores each node's primary output value after it runs
    const nodeOutputs: Record<string, any> = {};

    for (const node of sorted) {
      await emitStatus(serverUrl, node.id, "running");

      try {
        // Collect values passed in from upstream connected nodes
        const incomingEdges = edges.filter((e) => e.target === node.id);
        const inputs: Record<string, any> = {};

        for (const edge of incomingEdges) {
          const upstream = nodeOutputs[edge.source];
          if (upstream === undefined) continue;

          if (edge.targetHandle === "images") {
            // images handle accepts multiple connections → build array
            inputs.images = [...(inputs.images ?? []), upstream];
          } else {
            inputs[edge.targetHandle] = upstream;
          }
        }

        // Merge: node's own form data first, upstream connections override
        const d = { ...node.data, ...inputs };

        let output: any;

        switch (node.type) {
          case "textNode": {
            const r = await textTask.triggerAndWait({ text: d.text ?? "" });
            if (!r.ok) throw new Error(String(r.error));
            output = r.output.output;
            break;
          }

          case "uploadImageNode": {
            const r = await uploadImageTask.triggerAndWait({
              fileBase64: d.fileBase64,
              fileName: d.fileName,
            });
            if (!r.ok) throw new Error(String(r.error));
            output = r.output.image_url;
            break;
          }

          case "uploadVideoNode": {
            const r = await uploadVideoTask.triggerAndWait({
              fileBase64: d.fileBase64,
              fileName: d.fileName,
            });
            if (!r.ok) throw new Error(String(r.error));
            output = r.output.video_url;
            break;
          }

          case "runLLMNode": {
            const r = await runLLMTask.triggerAndWait({
              model: d.model ?? "Gemini 1.5 Flash",
              user_message: d.user_message ?? "",
              system_prompt: d.system_prompt,
              images: d.images ?? [],
            });
            if (!r.ok) throw new Error(String(r.error));
            output = r.output.output;
            break;
          }

          case "cropImageNode": {
            const r = await cropImageTask.triggerAndWait({
              image_url: d.image_url ?? "",
              x_percent: Number(d.x_percent ?? 0),
              y_percent: Number(d.y_percent ?? 0),
              width_percent: Number(d.width_percent ?? 100),
              height_percent: Number(d.height_percent ?? 100),
            });
            if (!r.ok) throw new Error(String(r.error));
            output = r.output.image_url;
            break;
          }

          case "extractFrameNode": {
            const r = await extractFrameTask.triggerAndWait({
              video_url: d.video_url ?? "",
              timestamp: d.timestamp,
            });
            if (!r.ok) throw new Error(String(r.error));
            output = r.output.image_url;
            break;
          }

          default:
            output = null;
        }

        nodeOutputs[node.id] = output;
        await emitStatus(serverUrl, node.id, "success");
      } catch (err) {
        await emitStatus(serverUrl, node.id, "error");
        throw err; // stops the workflow on first failure
      }
    }

    return { outputs: nodeOutputs };
  },
});
