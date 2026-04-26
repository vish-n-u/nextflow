"use client";

import {
  Handle,
  Position,
  useReactFlow,
  useHandleConnections,
  type NodeProps,
  type Node,
} from "@xyflow/react";
import { Film } from "lucide-react";

type ExtractFrameNodeType = Node<{ timestamp?: string }>;

const TGT = "!w-3 !h-3 !bg-zinc-700 !border-2 !border-zinc-900 hover:!bg-zinc-400 !rounded-full transition-colors";
const SRC = "!w-3 !h-3 !bg-zinc-600 !border-2 !border-zinc-900 hover:!bg-white !rounded-full transition-colors";
const labelCls = "text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1 block";
const connectedCls = "text-[10px] text-zinc-600 italic px-2 py-2 bg-zinc-800/40 border border-dashed border-zinc-700 rounded-lg";
const inputCls = "w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-zinc-500 nodrag nopan disabled:opacity-40 disabled:cursor-not-allowed";

export function ExtractFrameNode({ id, data, selected }: NodeProps<ExtractFrameNodeType>) {
  const { updateNodeData } = useReactFlow();
  const videoConns     = useHandleConnections({ type: "target", id: "video_url" });
  const timestampConns = useHandleConnections({ type: "target", id: "timestamp" });

  return (
    <div
      className={`bg-zinc-900 rounded-xl shadow-xl min-w-[260px] border transition-colors ${
        selected ? "border-zinc-500" : "border-zinc-800"
      }`}
    >
      <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-800 bg-zinc-950/80 rounded-t-xl">
        <Film className="w-3.5 h-3.5 text-zinc-400" />
        <span className="text-xs font-semibold text-zinc-200">Extract Frame</span>
      </div>

      <div className="p-3 flex flex-col gap-3">
        {/* Video URL (connection only) */}
        <div className="relative">
          <Handle type="target" position={Position.Left} id="video_url" className={TGT} />
          <label className={labelCls}>
            Video <span className="text-red-500 normal-case">*</span>
          </label>
          <p className={connectedCls}>
            {videoConns.length > 0 ? "Video connected" : "Connect a video node"}
          </p>
        </div>

        {/* Timestamp */}
        <div className="relative">
          <Handle type="target" position={Position.Left} id="timestamp" className={TGT} />
          <label className={labelCls}>Timestamp</label>
          {timestampConns.length > 0 ? (
            <p className={connectedCls}>Receiving from connection…</p>
          ) : (
            <input
              type="text"
              placeholder="e.g. 5 or 50%"
              value={data.timestamp ?? ""}
              onChange={(e) => updateNodeData(id, { timestamp: e.target.value })}
              className={inputCls}
            />
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Right} id="output" className={SRC} />
    </div>
  );
}
