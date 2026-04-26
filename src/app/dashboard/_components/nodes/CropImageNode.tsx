"use client";

import {
  Handle,
  Position,
  useReactFlow,
  useHandleConnections,
  type NodeProps,
  type Node,
} from "@xyflow/react";
import { Scissors } from "lucide-react";

type CropImageNodeType = Node<{
  x_percent?: number;
  y_percent?: number;
  width_percent?: number;
  height_percent?: number;
}>;

const TGT = "!w-3 !h-3 !bg-zinc-700 !border-2 !border-zinc-900 hover:!bg-zinc-400 !rounded-full transition-colors";
const SRC = "!w-3 !h-3 !bg-zinc-600 !border-2 !border-zinc-900 hover:!bg-white !rounded-full transition-colors";
const labelCls = "text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1 block";
const connectedCls = "text-[10px] text-zinc-600 italic px-2 py-2 bg-zinc-800/40 border border-dashed border-zinc-700 rounded-lg";
const inputCls = "w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-zinc-200 outline-none focus:border-zinc-500 nodrag nopan disabled:opacity-40 disabled:cursor-not-allowed";

interface CropFieldProps {
  handleId: string;
  label: string;
  value: number | undefined;
  onChange: (v: number) => void;
}

function CropField({ handleId, label, value, onChange }: CropFieldProps) {
  const conns = useHandleConnections({ type: "target", id: handleId });
  const connected = conns.length > 0;

  return (
    <div className="relative">
      <Handle type="target" position={Position.Left} id={handleId} className={TGT} />
      <label className={labelCls}>{label}</label>
      {connected ? (
        <p className={connectedCls}>Receiving from connection…</p>
      ) : (
        <input
          type="number"
          min={0}
          max={100}
          value={value ?? 0}
          onChange={(e) => onChange(Number(e.target.value))}
          className={inputCls}
        />
      )}
    </div>
  );
}

export function CropImageNode({ id, data, selected }: NodeProps<CropImageNodeType>) {
  const { updateNodeData } = useReactFlow();
  const imageConns = useHandleConnections({ type: "target", id: "image_url" });

  return (
    <div
      className={`bg-zinc-900 rounded-xl shadow-xl min-w-[260px] border transition-colors ${
        selected ? "border-zinc-500" : "border-zinc-800"
      }`}
    >
      <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-800 bg-zinc-950/80 rounded-t-xl">
        <Scissors className="w-3.5 h-3.5 text-zinc-400" />
        <span className="text-xs font-semibold text-zinc-200">Crop Image</span>
      </div>

      <div className="p-3 flex flex-col gap-3">
        {/* Image URL (connection only) */}
        <div className="relative">
          <Handle type="target" position={Position.Left} id="image_url" className={TGT} />
          <label className={labelCls}>
            Image <span className="text-red-500 normal-case">*</span>
          </label>
          <p className={connectedCls}>
            {imageConns.length > 0 ? "Image connected" : "Connect an image node"}
          </p>
        </div>

        {/* Crop params in 2-column grid */}
        <div className="grid grid-cols-2 gap-2">
          <CropField
            handleId="x_percent"
            label="X %"
            value={data.x_percent}
            onChange={(v) => updateNodeData(id, { x_percent: v })}
          />
          <CropField
            handleId="y_percent"
            label="Y %"
            value={data.y_percent}
            onChange={(v) => updateNodeData(id, { y_percent: v })}
          />
          <CropField
            handleId="width_percent"
            label="Width %"
            value={data.width_percent}
            onChange={(v) => updateNodeData(id, { width_percent: v })}
          />
          <CropField
            handleId="height_percent"
            label="Height %"
            value={data.height_percent}
            onChange={(v) => updateNodeData(id, { height_percent: v })}
          />
        </div>
      </div>

      <Handle type="source" position={Position.Right} id="output" className={SRC} />
    </div>
  );
}
