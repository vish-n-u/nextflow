"use client";

import { Handle, Position, useReactFlow, type NodeProps, type Node } from "@xyflow/react";
import { Type } from "lucide-react";
import { NodeStatus, STATUS_BORDER, useStatusGlow } from "./nodeStatus";
import { useIsWorkflowRunning } from "./WorkflowRunContext";

type TextNodeType = Node<{ text?: string; status?: string }>;

const SRC = "!w-3 !h-3 !bg-amber-400 !border-0 hover:!scale-125 !rounded-full transition-transform";

export function TextNode({ id, data, selected }: NodeProps<TextNodeType>) {
  const { updateNodeData } = useReactFlow();
  const isWorkflowRunning = useIsWorkflowRunning();

  const status = data.status ?? NodeStatus.Idle;
  useStatusGlow(id, status);
  const locked = isWorkflowRunning || status === NodeStatus.Running;

  const border = status !== NodeStatus.Idle
    ? (STATUS_BORDER[status] ?? "border-white/[0.07]")
    : selected
      ? "border-amber-400/70 shadow-[0_0_0_1px_rgba(251,191,36,0.15)]"
      : "border-white/[0.07]";

  return (
    <div className="relative">
      {/* Label above card */}
      <div className="absolute -top-6 left-0 flex items-center gap-1.5 pointer-events-none select-none">
        <Type className="w-3 h-3 text-amber-400" />
        <span className="text-[11px] text-[#888] font-book">Text</span>
        {status === NodeStatus.Running && <span className="text-[10px] text-amber-400 font-book animate-pulse">Running…</span>}
        {status === NodeStatus.Success && <span className="text-[10px] text-emerald-400 font-book">Done</span>}
        {status === NodeStatus.Error   && <span className="text-[10px] text-red-400 font-book">Error</span>}
      </div>

      {/* Card */}
      <div className={`bg-[#1c1c1c] rounded-2xl border transition-all min-w-[240px] ${border}`}>
        {/* Handle header row */}
        <div className="flex items-center justify-end px-3 py-2 border-b border-white/[0.05]">
          <span className="text-[11px] text-[#666] font-book">Output</span>
          <Handle type="source" position={Position.Right} id="output" className={SRC} />
        </div>

        {/* Content */}
        <div className="p-3">
          <textarea
            className="w-full bg-[#141414] border border-white/[0.08] rounded-xl px-3 py-2.5 text-[12px] text-white font-book placeholder:text-[#444] outline-none focus:border-white/20 resize-none nodrag nopan disabled:opacity-40 disabled:cursor-not-allowed leading-relaxed"
            rows={4}
            placeholder="Write something…"
            value={data.text ?? ""}
            disabled={locked}
            onChange={(e) => updateNodeData(id, { text: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}
