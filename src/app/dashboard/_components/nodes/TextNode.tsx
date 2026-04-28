"use client";

import { Handle, Position, useReactFlow, type NodeProps, type Node } from "@xyflow/react";
import { Type } from "lucide-react";
import { NodeStatus, STATUS_BORDER, useStatusGlow } from "./nodeStatus";
import { useIsWorkflowRunning } from "./WorkflowRunContext";

type TextNodeType = Node<{ text?: string; status?: string }>;

const SRC = "!w-3 !h-3 !bg-zinc-600 !border-2 !border-zinc-900 hover:!bg-white !rounded-full transition-colors";

export function TextNode({ id, data, selected }: NodeProps<TextNodeType>) {
  const { updateNodeData } = useReactFlow();
  const isWorkflowRunning = useIsWorkflowRunning();

  const status = data.status ?? NodeStatus.Idle;
  useStatusGlow(id, status);
  const locked = isWorkflowRunning || status === NodeStatus.Running;

  const border = status !== NodeStatus.Idle
    ? (STATUS_BORDER[status] ?? "border-zinc-800")
    : selected ? "border-zinc-500" : "border-zinc-800";

  return (
    <div className={`bg-zinc-900 rounded-xl shadow-xl min-w-[240px] border transition-all ${border}`}>
      <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-800 bg-zinc-950/80 rounded-t-xl">
        <Type className="w-3.5 h-3.5 text-zinc-400" />
        <span className="text-xs font-semibold text-zinc-200">Text</span>
        {status === NodeStatus.Running && <span className="ml-auto text-[10px] text-yellow-400 animate-pulse">Running…</span>}
        {status === NodeStatus.Success && <span className="ml-auto text-[10px] text-green-400">Done</span>}
        {status === NodeStatus.Error   && <span className="ml-auto text-[10px] text-red-400">Error</span>}
      </div>

      <div className="p-3">
        <textarea
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-zinc-500 resize-none nodrag nopan disabled:opacity-40 disabled:cursor-not-allowed"
          rows={4}
          placeholder="Enter text…"
          value={data.text ?? ""}
          disabled={locked}
          onChange={(e) => updateNodeData(id, { text: e.target.value })}
        />
      </div>

      <Handle type="source" position={Position.Right} id="output" className={SRC} />
    </div>
  );
}
