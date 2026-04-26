"use client";

import {
  Handle,
  Position,
  useReactFlow,
  useHandleConnections,
  type NodeProps,
  type Node,
} from "@xyflow/react";
import { Sparkles } from "lucide-react";

type RunLLMNodeType = Node<{
  model?: string;
  system_prompt?: string;
  user_message?: string;
  output?: string;
}>;

const MODELS = ["Gemini 1.5 Flash", "Gemini 1.5 Pro"] as const;

const TGT = "!w-3 !h-3 !bg-zinc-700 !border-2 !border-zinc-900 hover:!bg-zinc-400 !rounded-full transition-colors";
const SRC = "!w-3 !h-3 !bg-zinc-600 !border-2 !border-zinc-900 hover:!bg-white !rounded-full transition-colors";
const labelCls = "text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1 block";
const textareaCls = "w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-zinc-500 resize-none nodrag nopan disabled:opacity-40 disabled:cursor-not-allowed";
const connectedCls = "text-[10px] text-zinc-600 italic px-2 py-2 bg-zinc-800/40 border border-dashed border-zinc-700 rounded-lg";

export function RunLLMNode({ id, data, selected }: NodeProps<RunLLMNodeType>) {
  const { updateNodeData } = useReactFlow();
  const syspromptConns = useHandleConnections({ type: "target", id: "system_prompt" });
  const usermsgConns   = useHandleConnections({ type: "target", id: "user_message" });
  const imagesConns    = useHandleConnections({ type: "target", id: "images" });

  const syspromptConnected = syspromptConns.length > 0;
  const usermsgConnected   = usermsgConns.length > 0;

  return (
    <div
      className={`bg-zinc-900 rounded-xl shadow-xl min-w-[280px] border transition-colors ${
        selected ? "border-zinc-500" : "border-zinc-800"
      }`}
    >
      <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-800 bg-zinc-950/80 rounded-t-xl">
        <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
        <span className="text-xs font-semibold text-zinc-200">Run LLM</span>
      </div>

      <div className="p-3 flex flex-col gap-3">
        {/* Model */}
        <div>
          <label className={labelCls}>Model</label>
          <select
            value={data.model ?? "Gemini 1.5 Flash"}
            onChange={(e) => updateNodeData(id, { model: e.target.value })}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-zinc-200 outline-none focus:border-zinc-500 nodrag nopan"
          >
            {MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        {/* System prompt */}
        <div className="relative">
          <Handle type="target" position={Position.Left} id="system_prompt" className={TGT} />
          <label className={labelCls}>System Prompt</label>
          {syspromptConnected ? (
            <p className={connectedCls}>Receiving from connection…</p>
          ) : (
            <textarea
              rows={2}
              placeholder="Optional system instructions…"
              value={data.system_prompt ?? ""}
              onChange={(e) => updateNodeData(id, { system_prompt: e.target.value })}
              className={textareaCls}
            />
          )}
        </div>

        {/* User message */}
        <div className="relative">
          <Handle type="target" position={Position.Left} id="user_message" className={TGT} />
          <label className={labelCls}>
            User Message <span className="text-red-500 normal-case">*</span>
          </label>
          {usermsgConnected ? (
            <p className={connectedCls}>Receiving from connection…</p>
          ) : (
            <textarea
              rows={3}
              placeholder="Enter user message…"
              value={data.user_message ?? ""}
              onChange={(e) => updateNodeData(id, { user_message: e.target.value })}
              className={textareaCls}
            />
          )}
        </div>

        {/* Images */}
        <div className="relative">
          <Handle type="target" position={Position.Left} id="images" className={TGT} />
          <label className={labelCls}>Images</label>
          <p className={connectedCls}>
            {imagesConns.length > 0 ? `${imagesConns.length} image(s) connected` : "No images connected"}
          </p>
        </div>

        {/* Run button */}
        <button className="nodrag w-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg py-2 text-xs font-semibold text-zinc-200 transition-colors">
          Run
        </button>

        {/* Output */}
        {data.output && (
          <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 max-h-28 overflow-y-auto nodrag nopan">
            <p className="text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed">{data.output}</p>
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Right} id="output" className={SRC} />
    </div>
  );
}
