"use client";

import {
  Handle, Position, useReactFlow, useNodeConnections,
  type NodeProps, type Node,
} from "@xyflow/react";
import { Sparkles, Loader2, AlertCircle } from "lucide-react";
import { RunStatus } from "./RunStatus";
import { NodeStatus, STATUS_BORDER, useStatusGlow } from "./nodeStatus";
import { LLM_MODEL_NAMES, DEFAULT_LLM_MODEL, type LLMModelName } from "@/lib/models";
import { trackSingleRun } from "./trackSingleRun";
import { useIsWorkflowRunning } from "./WorkflowRunContext";

type RunLLMNodeType = Node<{
  model?:         LLMModelName;
  system_prompt?: string;
  user_message?:  string;
  output?:        unknown;
  status?:        string;
  errorMessage?:  string | null;
  runId?:         string | null;
  publicToken?:   string | null;
  dbRunId?:       string | null;
}>;


const TGT = "!w-3 !h-3 !bg-emerald-700 !border-2 !border-zinc-900 hover:!bg-emerald-400 !rounded-full transition-colors";
const SRC = "!w-3 !h-3 !bg-emerald-500 !border-2 !border-zinc-900 hover:!bg-emerald-300 !rounded-full transition-colors";
const labelCls    = "text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1 block";
const textareaCls = "w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-zinc-500 resize-none nodrag nopan disabled:opacity-40 disabled:cursor-not-allowed";
const connectedCls = "text-[10px] text-zinc-600 italic px-2 py-2 bg-zinc-800/40 border border-dashed border-zinc-700 rounded-lg";

export function RunLLMNode({ id, data, selected }: NodeProps<RunLLMNodeType>) {
  const { updateNodeData } = useReactFlow();
  const isWorkflowRunning = useIsWorkflowRunning();
  const syspromptConns = useNodeConnections({ handleType: "target", handleId: "system_prompt" });
  const usermsgConns   = useNodeConnections({ handleType: "target", handleId: "user_message" });
  const imagesConns    = useNodeConnections({ handleType: "target", handleId: "images" });

  const status = data.status ?? NodeStatus.Idle;
  useStatusGlow(id, status);
  const locked = isWorkflowRunning || status === NodeStatus.Running;

  const border = status !== NodeStatus.Idle
    ? (STATUS_BORDER[status] ?? "border-zinc-800")
    : selected ? "border-zinc-500" : "border-zinc-800";

  const handleRun = async () => {
    if (!String(data.user_message ?? "").trim() && usermsgConns.length === 0) {
      updateNodeData(id, { status: NodeStatus.Error, errorMessage: "User message is required." });
      return;
    }
    updateNodeData(id, { status: NodeStatus.Running, output: null, errorMessage: null });
    try {
      const res = await fetch("/api/nodes/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodeType: "runLLMNode",
          data: {
            model:         data.model ?? DEFAULT_LLM_MODEL,
            user_message:  data.user_message ?? "",
            system_prompt: data.system_prompt,
            images:        [],
          },
        }),
      });
      if (!res.ok) {
        let msg = "LLM run failed. Please try again.";
        try { const body = await res.json() as { error?: string }; if (body.error) msg = body.error; } catch {}
        throw new Error(msg);
      }
      const { runId, publicToken } = await res.json() as { runId: string; publicToken: string };
      updateNodeData(id, { runId, publicToken });
      trackSingleRun({
        triggerRunId: runId,
        nodeId:       id,
        nodeType:     "runLLMNode",
        displayName:  "Run LLM",
        data: {
          model:         data.model ?? DEFAULT_LLM_MODEL,
          system_prompt: data.system_prompt,
          user_message:  data.user_message,
        },
        onDbRunId: (dbRunId) => updateNodeData(id, { dbRunId }),
      });
    } catch (err) {
      updateNodeData(id, {
        status: NodeStatus.Error,
        errorMessage: err instanceof Error ? err.message : "Something went wrong.",
      });
    }
  };

  // Single-node run: output = { output: "text response" }
  // Workflow run: output = "text response" (primary value from orchestrator)
  const outputText = data.output != null
    ? typeof data.output === "string"
      ? data.output
      : (data.output as Record<string, unknown>).output as string | undefined
        ?? String(data.output)
    : null;

  return (
    <div className={`bg-zinc-900 rounded-xl shadow-xl w-[280px] border transition-all ${border}`}>
      {data.runId && data.publicToken && (
        <RunStatus nodeId={id} runId={data.runId} publicToken={data.publicToken} dbRunId={data.dbRunId} />
      )}

      <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-800 bg-zinc-950/80 rounded-t-xl">
        <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
        <span className="text-xs font-semibold text-zinc-200">Run LLM</span>
        {status === NodeStatus.Running && <span className="ml-auto text-[10px] text-yellow-400 animate-pulse">Running…</span>}
        {status === NodeStatus.Success && <span className="ml-auto text-[10px] text-green-400">Done</span>}
        {status === NodeStatus.Error   && <span className="ml-auto text-[10px] text-red-400">Error</span>}
      </div>

      <div className="p-3 flex flex-col gap-3">
        <div>
          <label className={labelCls}>Model</label>
          <select
            value={data.model ?? DEFAULT_LLM_MODEL}
            onChange={(e) => updateNodeData(id, { model: e.target.value })}
            disabled={locked}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-zinc-200 outline-none focus:border-zinc-500 nodrag nopan disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {LLM_MODEL_NAMES.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        <div className="relative">
          <Handle type="target" position={Position.Left} id="system_prompt" className={TGT} />
          <label className={labelCls}>System Prompt</label>
          {syspromptConns.length > 0
            ? <p className={connectedCls}>Receiving from connection…</p>
            : <textarea rows={2} placeholder="Optional system instructions…"
                value={data.system_prompt ?? ""}
                onChange={(e) => updateNodeData(id, { system_prompt: e.target.value })}
                disabled={locked}
                className={textareaCls} />}
        </div>

        <div className="relative">
          <Handle type="target" position={Position.Left} id="user_message" className={TGT} />
          <label className={labelCls}>User Message <span className="text-red-500 normal-case">*</span></label>
          {usermsgConns.length > 0
            ? <p className={connectedCls}>Receiving from connection…</p>
            : <textarea rows={3} placeholder="Enter user message…"
                value={data.user_message ?? ""}
                onChange={(e) => updateNodeData(id, { user_message: e.target.value })}
                disabled={locked}
                className={textareaCls} />}
        </div>

        <div className="relative">
          <Handle type="target" position={Position.Left} id="images" className={TGT} />
          <label className={labelCls}>Images</label>
          <p className={connectedCls}>
            {imagesConns.length > 0 ? `${imagesConns.length} image(s) connected` : "No images connected"}
          </p>
        </div>

        {data.errorMessage && status === NodeStatus.Error && (
          <div className="flex items-start gap-1.5 bg-red-950/40 border border-red-500/30 rounded-lg px-2.5 py-2">
            <AlertCircle className="w-3 h-3 text-red-400 mt-0.5 shrink-0" />
            <p className="text-[10px] text-red-300 leading-relaxed">{data.errorMessage}</p>
          </div>
        )}

        <button
          onClick={handleRun}
          disabled={locked}
          className="nodrag w-full flex items-center justify-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed border border-zinc-700 rounded-lg py-2 text-xs font-semibold text-zinc-200 transition-colors"
        >
          {status === NodeStatus.Running
            ? <><Loader2 className="w-3 h-3 animate-spin" />Running…</>
            : "Run"}
        </button>

        {outputText && (
          <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 max-h-32 overflow-y-auto nodrag nopan">
            <p className="text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed">{outputText}</p>
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Right} id="output" className={SRC} />
    </div>
  );
}
