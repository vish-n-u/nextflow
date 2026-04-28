import { NextResponse } from "next/server";
import { auth } from "@trigger.dev/sdk/v3";

import { withAuth } from "@/lib/with-auth";
import { AppApiError } from "@/lib/errors";
import { triggerNodeSchema } from "@/lib/zod/schemas/nodes";
import { TASK_REGISTRY } from "@/trigger/taskRegistry";
import { orchestratorTask } from "@/trigger/orchestrator";

type NodeData = Record<string, unknown>;

async function triggerForNodeType(nodeType: string, data: NodeData) {
  // Orchestrator has a distinct call shape (nodes + edges) — keep it separate
  if (nodeType === "orchestrator") {
    return orchestratorTask.trigger({
      nodes: data.nodes as Array<{ id: string; type: string; data: NodeData }>,
      edges: data.edges as Array<{ source: string; target: string; targetHandle: string }>,
    });
  }

  const entry = TASK_REGISTRY.find((e) => e.type === nodeType);
  if (!entry) return null;
  return entry.task.trigger(data);
}

export const POST = withAuth(async ({ req, headers }) => {
  const { nodeType, data } = triggerNodeSchema.parse(await req.json());

  const handle = await triggerForNodeType(nodeType, data);
  if (!handle) {
    throw new AppApiError({ code: "bad_request", message: `Unknown node type: ${nodeType}` });
  }

  const publicToken = await auth.createPublicToken({
    scopes: { read: { runs: [handle.id] } },
    expirationTime: "2h",
  });

  return NextResponse.json({ runId: handle.id, publicToken }, { headers });
});
