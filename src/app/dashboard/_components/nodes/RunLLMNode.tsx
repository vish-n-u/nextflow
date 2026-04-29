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

const TGT = "!w-3 !h-3 !bg-emerald-600 !border-0 hover:!scale-125 !rounded-full transition-transform";
const SRC = "!w-3 !h-3 !bg-emerald-400 !border-0 hover:!scale-125 !rounded-full transition-transform";
const labelCls    = "text-[10px] text-[#666] font-book uppercase tracking-wider mb-1 block";
const textareaCls = "w-full bg-[#141414] border border-white/[0.08] rounded-xl px-3 py-2.5 text-[12px] text-white font-book placeholder:text-[#444] outline-none focus:border-white/20 resize-none nodrag nopan disabled:opacity-40 disabled:cursor-not-allowed leading-relaxed";
const connectedCls = "text-[11px] text-[#555] font-book italic px-2.5 py-2 bg-[#141414]/60 border border-dashed border-white/[0.08] rounded-xl";

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
    ? (STATUS_BORDER[status] ?? "border-white/[0.07]")
    : selected
      ? "border-emerald-400/70 shadow-[0_0_0_1px_rgba(52,211,153,0.15)]"
      : "border-white/[0.07]";

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

  const outputText = data.output != null
    ? typeof data.output === "string"
      ? data.output
      : (data.output as Record<string, unknown>).output as string | undefined
        ?? String(data.output)
    : null;

  return (
    <div className="relative">
      {data.runId && data.publicToken && (
        <RunStatus nodeId={id} runId={data.runId} publicToken={data.publicToken} dbRunId={data.dbRunId} />
      )}

      {/* Label above card */}
      <div className="absolute -top-6 left-0 flex items-center gap-1.5 pointer-events-none select-none">
        <Sparkles className="w-3 h-3 text-emerald-400" />
        <span className="text-[11px] text-[#888] font-book">Run LLM</span>
        {status === NodeStatus.Running && <span className="text-[10px] text-amber-400 font-book animate-pulse">Running…</span>}
        {status === NodeStatus.Success && <span className="text-[10px] text-emerald-400 font-book">Done</span>}
        {status === NodeStatus.Error   && <span className="text-[10px] text-red-400 font-book">Error</span>}
      </div>

      {/* Card */}
      <div className={`bg-[#1c1c1c] rounded-2xl border transition-all w-[290px] ${border}`}>
        {/* Handle header row */}
        <div className="flex items-center justify-end px-3 py-2 border-b border-white/[0.05]">
          <span className="text-[11px] text-[#666] font-book">Output</span>
          <Handle type="source" position={Position.Right} id="output" className={SRC} />
        </div>

        {/* Content */}
        <div className="p-3 flex flex-col gap-3">
          {/* Model */}
          <div>
            <label className={labelCls}>Model</label>
            <select
              value={data.model ?? DEFAULT_LLM_MODEL}
              onChange={(e) => updateNodeData(id, { model: e.target.value })}
              disabled={locked}
              className="w-full bg-[#141414] border border-white/[0.08] rounded-xl px-3 py-2 text-[12px] text-white font-book outline-none focus:border-white/20 nodrag nopan disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {LLM_MODEL_NAMES.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          {/* System Prompt */}
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

          {/* User Message */}
          <div className="relative">
            <Handle type="target" position={Position.Left} id="user_message" className={TGT} />
            <label className={labelCls}>Prompt <span className="text-red-400 normal-case">*</span></label>
            {usermsgConns.length > 0
              ? <p className={connectedCls}>Receiving from connection…</p>
              : <textarea rows={3} placeholder="Enter user message…"
                  value={data.user_message ?? ""}
                  onChange={(e) => updateNodeData(id, { user_message: e.target.value })}
                  disabled={locked}
                  className={textareaCls} />}
          </div>

          {/* Images */}
          <div className="relative">
            <Handle type="target" position={Position.Left} id="images" className={TGT} />
            <label className={labelCls}>Images</label>
            <p className={connectedCls}>
              {imagesConns.length > 0 ? `${imagesConns.length} image(s) connected` : "No images connected"}
            </p>
          </div>

          {data.errorMessage && status === NodeStatus.Error && (
            <div className="flex items-start gap-1.5 bg-red-950/30 border border-red-500/20 rounded-xl px-2.5 py-2">
              <AlertCircle className="w-3 h-3 text-red-400 mt-0.5 shrink-0" />
              <p className="text-[11px] text-red-300 font-book leading-relaxed">{data.errorMessage}</p>
            </div>
          )}

          <button
            onClick={handleRun}
            disabled={locked}
            className="nodrag w-full flex items-center justify-center gap-1.5 bg-white/[0.06] hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed border border-white/[0.08] rounded-xl py-2 text-[12px] font-book text-white transition-colors"
          >
            {status === NodeStatus.Running
              ? <><Loader2 className="w-3 h-3 animate-spin" />Running…</>
              : "Run"}
          </button>

          {/* Settings row */}
          <div className="flex items-center gap-2 pt-0.5">
            <span className="text-[11px] text-[#555] font-book">&rsaquo; Settings</span>
          </div>

          {outputText && (
            <div className="bg-[#141414] border border-white/[0.08] rounded-xl p-3 max-h-32 overflow-y-auto nodrag nopan">
              <p className="text-[12px] text-[#ccc] font-book whitespace-pre-wrap leading-relaxed">{outputText}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
