"use client";

import {
  Handle, Position, useReactFlow, useHandleConnections,
  type NodeProps, type Node,
} from "@xyflow/react";
import { Scissors } from "lucide-react";
import { RunStatus } from "./RunStatus";
import { NodeStatus, STATUS_BORDER, useStatusGlow } from "./nodeStatus";

type CropImageNodeType = Node<{
  x_percent?:     number;
  y_percent?:     number;
  width_percent?: number;
  height_percent?: number;
  output?:        unknown;
  status?:        string;
  runId?:         string | null;
  publicToken?:   string | null;
}>;

const TGT = "!w-3 !h-3 !bg-zinc-700 !border-2 !border-zinc-900 hover:!bg-zinc-400 !rounded-full transition-colors";
const SRC = "!w-3 !h-3 !bg-zinc-600 !border-2 !border-zinc-900 hover:!bg-white !rounded-full transition-colors";
const labelCls    = "text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1 block";
const connectedCls = "text-[10px] text-zinc-600 italic px-2 py-2 bg-zinc-800/40 border border-dashed border-zinc-700 rounded-lg";
const inputCls    = "w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-zinc-200 outline-none focus:border-zinc-500 nodrag nopan disabled:opacity-40 disabled:cursor-not-allowed";

interface CropFieldProps {
  handleId: string;
  label:    string;
  value:    number | undefined;
  onChange: (v: number) => void;
}

function CropField({ handleId, label, value, onChange }: CropFieldProps) {
  const conns = useHandleConnections({ type: "target", id: handleId });
  return (
    <div className="relative">
      <Handle type="target" position={Position.Left} id={handleId} className={TGT} />
      <label className={labelCls}>{label}</label>
      {conns.length > 0
        ? <p className={connectedCls}>From connection</p>
        : <input type="number" min={0} max={100}
            value={value ?? 0}
            onChange={(e) => onChange(Number(e.target.value))}
            className={inputCls} />}
    </div>
  );
}

export function CropImageNode({ id, data, selected }: NodeProps<CropImageNodeType>) {
  const { updateNodeData } = useReactFlow();
  const imageConns = useHandleConnections({ type: "target", id: "image_url" });

  const status = data.status ?? NodeStatus.Idle;
  useStatusGlow(id, status);

  const border = status !== NodeStatus.Idle
    ? (STATUS_BORDER[status] ?? "border-zinc-800")
    : selected ? "border-zinc-500" : "border-zinc-800";

  const handleRun = async () => {
    updateNodeData(id, { status: NodeStatus.Running, output: null });
    try {
      const res = await fetch("/api/nodes/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodeType: "cropImageNode",
          data: {
            image_url:     "",
            x_percent:     data.x_percent     ?? 0,
            y_percent:     data.y_percent     ?? 0,
            width_percent:  data.width_percent  ?? 100,
            height_percent: data.height_percent ?? 100,
          },
        }),
      });
      if (!res.ok) throw new Error("Run failed");
      const { runId, publicToken } = await res.json() as { runId: string; publicToken: string };
      updateNodeData(id, { runId, publicToken });
    } catch {
      updateNodeData(id, { status: NodeStatus.Error });
    }
  };

  const outputUrl = data.output != null
    ? (data.output as Record<string, unknown>).image_url as string | undefined
    : undefined;

  return (
    <div className={`bg-zinc-900 rounded-xl shadow-xl min-w-[260px] border transition-all ${border}`}>
      {data.runId && data.publicToken && (
        <RunStatus nodeId={id} runId={data.runId} publicToken={data.publicToken} />
      )}

      <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-800 bg-zinc-950/80 rounded-t-xl">
        <Scissors className="w-3.5 h-3.5 text-zinc-400" />
        <span className="text-xs font-semibold text-zinc-200">Crop Image</span>
        {status === NodeStatus.Running && <span className="ml-auto text-[10px] text-yellow-400 animate-pulse">Running…</span>}
        {status === NodeStatus.Success && <span className="ml-auto text-[10px] text-green-400">Done</span>}
        {status === NodeStatus.Error   && <span className="ml-auto text-[10px] text-red-400">Error</span>}
      </div>

      <div className="p-3 flex flex-col gap-3">
        <div className="relative">
          <Handle type="target" position={Position.Left} id="image_url" className={TGT} />
          <label className={labelCls}>Image <span className="text-red-500 normal-case">*</span></label>
          <p className={connectedCls}>
            {imageConns.length > 0 ? "Image connected" : "Connect an image node"}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <CropField handleId="x_percent"      label="X %"      value={data.x_percent}      onChange={(v) => updateNodeData(id, { x_percent: v })} />
          <CropField handleId="y_percent"      label="Y %"      value={data.y_percent}      onChange={(v) => updateNodeData(id, { y_percent: v })} />
          <CropField handleId="width_percent"  label="Width %"  value={data.width_percent}  onChange={(v) => updateNodeData(id, { width_percent: v })} />
          <CropField handleId="height_percent" label="Height %" value={data.height_percent} onChange={(v) => updateNodeData(id, { height_percent: v })} />
        </div>

        <button
          onClick={handleRun}
          disabled={status === NodeStatus.Running || imageConns.length === 0}
          className="nodrag w-full bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed border border-zinc-700 rounded-lg py-2 text-xs font-semibold text-zinc-200 transition-colors"
        >
          {status === NodeStatus.Running ? "Running…" : "Run"}
        </button>

        {outputUrl && (
          <p className="text-[10px] text-zinc-500 break-all bg-zinc-800 rounded px-2 py-1 nodrag nopan">
            {outputUrl}
          </p>
        )}
      </div>

      <Handle type="source" position={Position.Right} id="output" className={SRC} />
    </div>
  );
}
