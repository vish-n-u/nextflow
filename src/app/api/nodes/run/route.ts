import { NextResponse } from "next/server";
import { auth as clerkAuth } from "@clerk/nextjs/server";
import { auth } from "@trigger.dev/sdk/v3";

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

export async function POST(req: Request) {
  const { userId } = await clerkAuth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { nodeType, data } = await req.json() as { nodeType: string; data: NodeData };

  const handle = await triggerForNodeType(nodeType, data);
  if (!handle) {
    return NextResponse.json({ error: `Unknown node type: ${nodeType}` }, { status: 400 });
  }

  const publicToken = await auth.createPublicToken({
    scopes: { read: { runs: [handle.id] } },
    expirationTime: "2h",
  });

  return NextResponse.json({ runId: handle.id, publicToken });
}
