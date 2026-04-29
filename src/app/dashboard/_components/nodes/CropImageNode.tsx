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

const TGT = "!w-3 !h-3 !bg-cyan-600 !border-0 hover:!scale-125 !rounded-full transition-transform";
const SRC = "!w-3 !h-3 !bg-cyan-400 !border-0 hover:!scale-125 !rounded-full transition-transform";
const labelCls    = "text-[10px] text-[#666] font-book uppercase tracking-wider mb-1 block";
const connectedCls = "text-[11px] text-[#555] font-book italic px-2.5 py-2 bg-[#141414]/60 border border-dashed border-white/[0.08] rounded-xl";
const inputCls    = "w-full bg-[#141414] border border-white/[0.08] rounded-xl px-3 py-2 text-[12px] text-white font-book outline-none focus:border-white/20 nodrag nopan disabled:opacity-40 disabled:cursor-not-allowed";

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
    ? (STATUS_BORDER[status] ?? "border-white/[0.07]")
    : selected
      ? "border-cyan-400/70 shadow-[0_0_0_1px_rgba(34,211,238,0.15)]"
      : "border-white/[0.07]";

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
    ? typeof data.output === "string"
      ? data.output
      : (data.output as Record<string, unknown>).image_url as string | undefined
    : undefined;

  return (
    <div className="relative">
      {data.runId && data.publicToken && (
        <RunStatus nodeId={id} runId={data.runId} publicToken={data.publicToken} dbRunId={data.dbRunId} />
      )}

      {/* Label above card */}
      <div className="absolute -top-6 left-0 flex items-center gap-1.5 pointer-events-none select-none">
        <Scissors className="w-3 h-3 text-cyan-400" />
        <span className="text-[11px] text-[#888] font-book">Crop Image</span>
        {status === NodeStatus.Running && <span className="text-[10px] text-amber-400 font-book animate-pulse">Running…</span>}
        {status === NodeStatus.Success && <span className="text-[10px] text-emerald-400 font-book">Done</span>}
        {status === NodeStatus.Error   && <span className="text-[10px] text-red-400 font-book">Error</span>}
      </div>

      {/* Card */}
      <div className={`bg-[#1c1c1c] rounded-2xl border transition-all min-w-[260px] ${border}`}>
        {/* Handle header row */}
        <div className="flex items-center justify-end px-3 py-2 border-b border-white/[0.05]">
          <span className="text-[11px] text-[#666] font-book">Output</span>
          <Handle type="source" position={Position.Right} id="output" className={SRC} />
        </div>

        {/* Content */}
        <div className="p-3 flex flex-col gap-3">
          {/* Image input */}
          <div className="relative">
            <Handle type="target" position={Position.Left} id="image_url" className={TGT} />
            <label className={labelCls}>Image <span className="text-red-400 normal-case">*</span></label>
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
            <div className="flex items-start gap-1.5 bg-red-950/30 border border-red-500/20 rounded-xl px-2.5 py-2">
              <AlertCircle className="w-3 h-3 text-red-400 mt-0.5 shrink-0" />
              <p className="text-[11px] text-red-300 font-book leading-relaxed">{data.errorMessage}</p>
            </div>
          )}

          <button
            onClick={handleRun}
            disabled={locked || imageConns.length === 0}
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

          {outputUrl && (
            <div className="rounded-xl overflow-hidden border border-white/[0.08] nodrag nopan">
              <img src={outputUrl} alt="Cropped output" className="w-full object-cover max-h-48" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
