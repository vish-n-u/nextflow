"use client";

import {
  Handle, Position, useReactFlow, useNodeConnections,
  type NodeProps, type Node,
} from "@xyflow/react";
import { Film, Loader2, AlertCircle } from "lucide-react";
import { RunStatus } from "./RunStatus";
import { NodeStatus, STATUS_BORDER, useStatusGlow } from "./nodeStatus";
import { trackSingleRun } from "./trackSingleRun";
import { useIsWorkflowRunning } from "./WorkflowRunContext";

type ExtractFrameNodeType = Node<{
  timestamp?:    string;
  output?:       unknown;
  status?:       string;
  errorMessage?: string | null;
  runId?:        string | null;
  publicToken?:  string | null;
  dbRunId?:      string | null;
}>;

const TGT = "!w-3 !h-3 !bg-orange-700 !border-2 !border-zinc-900 hover:!bg-orange-400 !rounded-full transition-colors";
const SRC = "!w-3 !h-3 !bg-orange-500 !border-2 !border-zinc-900 hover:!bg-orange-300 !rounded-full transition-colors";
const labelCls    = "text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1 block";
const connectedCls = "text-[10px] text-zinc-600 italic px-2 py-2 bg-zinc-800/40 border border-dashed border-zinc-700 rounded-lg";
const inputCls    = "w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-zinc-500 nodrag nopan disabled:opacity-40 disabled:cursor-not-allowed";

export function ExtractFrameNode({ id, data, selected }: NodeProps<ExtractFrameNodeType>) {
  const { updateNodeData } = useReactFlow();
  const isWorkflowRunning = useIsWorkflowRunning();
  const videoConns     = useNodeConnections({ handleType: "target", handleId: "video_url" });
  const timestampConns = useNodeConnections({ handleType: "target", handleId: "timestamp" });

  const status = data.status ?? NodeStatus.Idle;
  useStatusGlow(id, status);
  const locked = isWorkflowRunning || status === NodeStatus.Running;

  const border = status !== NodeStatus.Idle
    ? (STATUS_BORDER[status] ?? "border-zinc-800")
    : selected ? "border-zinc-500" : "border-zinc-800";

  const handleRun = async () => {
    if (!String(data.timestamp ?? "").trim() && timestampConns.length === 0) {
      updateNodeData(id, { status: NodeStatus.Error, errorMessage: "Timestamp is required." });
      return;
    }
    updateNodeData(id, { status: NodeStatus.Running, output: null, errorMessage: null });
    try {
      const res = await fetch("/api/nodes/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodeType: "extractFrameNode",
          data: { video_url: "", timestamp: data.timestamp },
        }),
      });
      if (!res.ok) {
        let msg = "Frame extraction failed. Please try again.";
        try { const body = await res.json() as { error?: string }; if (body.error) msg = body.error; } catch {}
        throw new Error(msg);
      }
      const { runId, publicToken } = await res.json() as { runId: string; publicToken: string };
      updateNodeData(id, { runId, publicToken });
      trackSingleRun({
        triggerRunId: runId,
        nodeId:       id,
        nodeType:     "extractFrameNode",
        displayName:  "Extract Frame",
        data:         { timestamp: data.timestamp },
        onDbRunId:    (dbRunId) => updateNodeData(id, { dbRunId }),
      });
    } catch (err) {
      updateNodeData(id, {
        status: NodeStatus.Error,
        errorMessage: err instanceof Error ? err.message : "Something went wrong.",
      });
    }
  };

  // Single-node run: output = { image_url: "..." }
  // Workflow run: output = "https://..." (primary value from orchestrator)
  const outputUrl = data.output != null
    ? typeof data.output === "string"
      ? data.output
      : (data.output as Record<string, unknown>).image_url as string | undefined
    : undefined;

  return (
    <div className={`bg-zinc-900 rounded-xl shadow-xl min-w-[260px] border transition-all ${border}`}>
      {data.runId && data.publicToken && (
        <RunStatus nodeId={id} runId={data.runId} publicToken={data.publicToken} dbRunId={data.dbRunId} />
      )}

      <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-800 bg-zinc-950/80 rounded-t-xl">
        <Film className="w-3.5 h-3.5 text-orange-400" />
        <span className="text-xs font-semibold text-zinc-200">Extract Frame</span>
        {status === NodeStatus.Running && <span className="ml-auto text-[10px] text-yellow-400 animate-pulse">Running…</span>}
        {status === NodeStatus.Success && <span className="ml-auto text-[10px] text-green-400">Done</span>}
        {status === NodeStatus.Error   && <span className="ml-auto text-[10px] text-red-400">Error</span>}
      </div>

      <div className="p-3 flex flex-col gap-3">
        <div className="relative">
          <Handle type="target" position={Position.Left} id="video_url" className={TGT} />
          <label className={labelCls}>Video <span className="text-red-500 normal-case">*</span></label>
          <p className={connectedCls}>
            {videoConns.length > 0 ? "Video connected" : "Connect a video node"}
          </p>
        </div>

        <div className="relative">
          <Handle type="target" position={Position.Left} id="timestamp" className={TGT} />
          <label className={labelCls}>Timestamp <span className="text-zinc-600 normal-case">(%)</span></label>
          {timestampConns.length > 0
            ? <p className={connectedCls}>Receiving from connection…</p>
            : <input type="number" min={0} max={100} placeholder="e.g. 50"
                value={data.timestamp ?? ""}
                onChange={(e) => updateNodeData(id, { timestamp: e.target.value })}
                disabled={locked}
                className={inputCls} />}
        </div>

        {data.errorMessage && status === NodeStatus.Error && (
          <div className="flex items-start gap-1.5 bg-red-950/40 border border-red-500/30 rounded-lg px-2.5 py-2">
            <AlertCircle className="w-3 h-3 text-red-400 mt-0.5 shrink-0" />
            <p className="text-[10px] text-red-300 leading-relaxed">{data.errorMessage}</p>
          </div>
        )}

        <button
          onClick={handleRun}
          disabled={locked || videoConns.length === 0}
          className="nodrag w-full flex items-center justify-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed border border-zinc-700 rounded-lg py-2 text-xs font-semibold text-zinc-200 transition-colors"
        >
          {status === NodeStatus.Running
            ? <><Loader2 className="w-3 h-3 animate-spin" />Running…</>
            : "Run"}
        </button>

        {outputUrl && (
          <div className="rounded-lg overflow-hidden border border-zinc-700 nodrag nopan">
            <img src={outputUrl} alt="Extracted frame" className="w-full object-cover max-h-48" />
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Right} id="output" className={SRC} />
    </div>
  );
}
