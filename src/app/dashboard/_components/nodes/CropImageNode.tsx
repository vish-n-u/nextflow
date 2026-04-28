"use client";

import {
  Handle, Position, useReactFlow, useNodeConnections,
  type NodeProps, type Node,
} from "@xyflow/react";
import { Scissors, Loader2, AlertCircle } from "lucide-react";
import { RunStatus } from "./RunStatus";
import { NodeStatus, STATUS_BORDER, useStatusGlow } from "./nodeStatus";
import { trackSingleRun } from "./trackSingleRun";
import { useIsWorkflowRunning } from "./WorkflowRunContext";

type CropImageNodeType = Node<{
  x_percent?:      number;
  y_percent?:      number;
  width_percent?:  number;
  height_percent?: number;
  output?:         unknown;
  status?:         string;
  errorMessage?:   string | null;
  runId?:          string | null;
  publicToken?:    string | null;
  dbRunId?:        string | null;
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
  disabled?: boolean;
}

function CropField({ handleId, label, value, onChange, disabled }: CropFieldProps) {
  const conns = useNodeConnections({ handleType: "target", handleId });
  return (
    <div className="relative">
      <Handle type="target" position={Position.Left} id={handleId} className={TGT} />
      <label className={labelCls}>{label}</label>
      {conns.length > 0
        ? <p className={connectedCls}>From connection</p>
        : <input type="number" min={0} max={100}
            value={value ?? 0}
            onChange={(e) => onChange(Number(e.target.value))}
            disabled={disabled}
            className={inputCls} />}
    </div>
  );
}

export function CropImageNode({ id, data, selected }: NodeProps<CropImageNodeType>) {
  const { updateNodeData } = useReactFlow();
  const isWorkflowRunning = useIsWorkflowRunning();
  const imageConns = useNodeConnections({ handleType: "target", handleId: "image_url" });

  const status = data.status ?? NodeStatus.Idle;
  useStatusGlow(id, status);
  const locked = isWorkflowRunning || status === NodeStatus.Running;

  const border = status !== NodeStatus.Idle
    ? (STATUS_BORDER[status] ?? "border-zinc-800")
    : selected ? "border-zinc-500" : "border-zinc-800";

  const handleRun = async () => {
    updateNodeData(id, { status: NodeStatus.Running, output: null, errorMessage: null });
    try {
      const res = await fetch("/api/nodes/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodeType: "cropImageNode",
          data: {
            image_url:      "",
            x_percent:      data.x_percent     ?? 0,
            y_percent:      data.y_percent     ?? 0,
            width_percent:  data.width_percent  ?? 100,
            height_percent: data.height_percent ?? 100,
          },
        }),
      });
      if (!res.ok) {
        let msg = "Crop failed. Please try again.";
        try { const body = await res.json() as { error?: string }; if (body.error) msg = body.error; } catch {}
        throw new Error(msg);
      }
      const { runId, publicToken } = await res.json() as { runId: string; publicToken: string };
      updateNodeData(id, { runId, publicToken });
      trackSingleRun({
        triggerRunId: runId,
        nodeId:       id,
        nodeType:     "cropImageNode",
        displayName:  "Crop Image",
        data: {
          x_percent:      data.x_percent      ?? 0,
          y_percent:      data.y_percent      ?? 0,
          width_percent:  data.width_percent  ?? 100,
          height_percent: data.height_percent ?? 100,
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

  const outputUrl = data.output != null
    ? (data.output as Record<string, unknown>).image_url as string | undefined
    : undefined;

  return (
    <div className={`bg-zinc-900 rounded-xl shadow-xl min-w-[260px] border transition-all ${border}`}>
      {data.runId && data.publicToken && (
        <RunStatus nodeId={id} runId={data.runId} publicToken={data.publicToken} dbRunId={data.dbRunId} />
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
          <CropField handleId="x_percent"      label="X %"      value={data.x_percent}      onChange={(v) => updateNodeData(id, { x_percent: v })}      disabled={locked} />
          <CropField handleId="y_percent"      label="Y %"      value={data.y_percent}      onChange={(v) => updateNodeData(id, { y_percent: v })}      disabled={locked} />
          <CropField handleId="width_percent"  label="Width %"  value={data.width_percent}  onChange={(v) => updateNodeData(id, { width_percent: v })}  disabled={locked} />
          <CropField handleId="height_percent" label="Height %" value={data.height_percent} onChange={(v) => updateNodeData(id, { height_percent: v })} disabled={locked} />
        </div>

        {data.errorMessage && status === NodeStatus.Error && (
          <div className="flex items-start gap-1.5 bg-red-950/40 border border-red-500/30 rounded-lg px-2.5 py-2">
            <AlertCircle className="w-3 h-3 text-red-400 mt-0.5 shrink-0" />
            <p className="text-[10px] text-red-300 leading-relaxed">{data.errorMessage}</p>
          </div>
        )}

        <button
          onClick={handleRun}
          disabled={locked || imageConns.length === 0}
          className="nodrag w-full flex items-center justify-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed border border-zinc-700 rounded-lg py-2 text-xs font-semibold text-zinc-200 transition-colors"
        >
          {status === NodeStatus.Running
            ? <><Loader2 className="w-3 h-3 animate-spin" />Running…</>
            : "Run"}
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
