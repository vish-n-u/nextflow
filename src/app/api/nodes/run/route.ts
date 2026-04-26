import { NextResponse } from "next/server";
import { auth as clerkAuth } from "@clerk/nextjs/server";
import { auth } from "@trigger.dev/sdk/v3";

import { textTask }         from "@/trigger/text";
import { uploadImageTask }  from "@/trigger/uploadImage";
import { uploadVideoTask }  from "@/trigger/uploadVideo";
import { runLLMTask }       from "@/trigger/runLLM";
import { cropImageTask }    from "@/trigger/cropImage";
import { extractFrameTask } from "@/trigger/extractFrame";
import { orchestratorTask } from "@/trigger/orchestrator";

type NodeData = Record<string, unknown>;

async function triggerForNodeType(nodeType: string, data: NodeData) {
  switch (nodeType) {
    case "textNode":
      return textTask.trigger({ text: String(data.text ?? "") });

    case "uploadImageNode":
      return uploadImageTask.trigger({
        fileBase64: data.fileBase64 as string,
        fileName:   data.fileName  as string,
      });

    case "uploadVideoNode":
      return uploadVideoTask.trigger({
        fileBase64: data.fileBase64 as string,
        fileName:   data.fileName  as string,
      });

    case "runLLMNode":
      return runLLMTask.trigger({
        model:         (data.model as "Gemini 2.5 Flash" | "Gemini 2.5 Flash-Lite") ?? "Gemini 2.5 Flash",
        user_message:  String(data.user_message ?? ""),
        system_prompt: data.system_prompt as string | undefined,
        images:        (data.images as string[]) ?? [],
      });

    case "cropImageNode":
      return cropImageTask.trigger({
        image_url:    String(data.image_url    ?? ""),
        x_percent:    Number(data.x_percent    ?? 0),
        y_percent:    Number(data.y_percent    ?? 0),
        width_percent:  Number(data.width_percent  ?? 100),
        height_percent: Number(data.height_percent ?? 100),
      });

    case "extractFrameNode":
      return extractFrameTask.trigger({
        video_url: String(data.video_url ?? ""),
        timestamp: data.timestamp as string | undefined,
      });

    case "orchestrator":
      return orchestratorTask.trigger({
        nodes: data.nodes as Array<{ id: string; type: string; data: Record<string, unknown> }>,
        edges: data.edges as Array<{ source: string; target: string; targetHandle: string }>,
        serverUrl: "",
      });

    default:
      return null;
  }
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
