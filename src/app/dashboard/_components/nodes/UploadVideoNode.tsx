"use client";

import { useRef } from "react";
import { Handle, Position, useReactFlow, type NodeProps, type Node } from "@xyflow/react";
import { VideoIcon, Upload, X, Loader2, AlertCircle } from "lucide-react";
import { RunStatus } from "./RunStatus";
import { NodeStatus, STATUS_BORDER, useStatusGlow } from "./nodeStatus";
import { trackSingleRun } from "./trackSingleRun";
import { useIsWorkflowRunning } from "./WorkflowRunContext";

type UploadVideoNodeType = Node<{
  previewUrl?:    string;
  fileBase64?:    string;
  fileName?:      string;
  output?:        unknown;
  status?:        string;
  errorMessage?:  string | null;
  runId?:         string | null;
  publicToken?:   string | null;
  dbRunId?:       string | null;
}>;

const SRC = "!w-3 !h-3 !bg-violet-400 !border-0 hover:!scale-125 !rounded-full transition-transform";

export function UploadVideoNode({ id, data, selected }: NodeProps<UploadVideoNodeType>) {
  const { updateNodeData } = useReactFlow();
  const isWorkflowRunning = useIsWorkflowRunning();
  const inputRef = useRef<HTMLInputElement>(null);

  const status = data.status ?? NodeStatus.Idle;
  useStatusGlow(id, status);
  const locked = isWorkflowRunning || status === NodeStatus.Running;

  const border = status !== NodeStatus.Idle
    ? (STATUS_BORDER[status] ?? "border-white/[0.07]")
    : selected
      ? "border-violet-400/70 shadow-[0_0_0_1px_rgba(167,139,250,0.15)]"
      : "border-white/[0.07]";

  const MAX_FILE_SIZE = 3 * 1024 * 1024;

  const handleFile = (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      updateNodeData(id, {
        status: NodeStatus.Error,
        errorMessage: "File exceeds the 3 MB limit. Please choose a smaller video.",
      });
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const fileBase64 = (e.target?.result as string).split(",")[1];
      updateNodeData(id, { previewUrl, fileBase64, fileName: file.name, status: "idle", output: null, errorMessage: null });
    };
    reader.readAsDataURL(file);
  };

  const handleClear = () => {
    if (data.previewUrl) URL.revokeObjectURL(data.previewUrl);
    updateNodeData(id, { previewUrl: undefined, fileBase64: undefined, fileName: undefined, status: "idle", output: null });
  };

  const handleUpload = async () => {
    if (!data.fileBase64) return;
    updateNodeData(id, { status: NodeStatus.Running, errorMessage: null });
    try {
      const res = await fetch("/api/nodes/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodeType: "uploadVideoNode",
          data: { fileBase64: data.fileBase64, fileName: data.fileName },
        }),
      });
      if (!res.ok) {
        let msg = "Upload failed. Please try again.";
        try { const body = await res.json() as { error?: string }; if (body.error) msg = body.error; } catch {}
        throw new Error(msg);
      }
      const { runId, publicToken } = await res.json() as { runId: string; publicToken: string };
      updateNodeData(id, { runId, publicToken });
      trackSingleRun({
        triggerRunId: runId,
        nodeId:       id,
        nodeType:     "uploadVideoNode",
        displayName:  "Upload Video",
        data:         { fileName: data.fileName },
        onDbRunId:    (dbRunId) => updateNodeData(id, { dbRunId }),
      });
    } catch (err) {
      updateNodeData(id, {
        status: NodeStatus.Error,
        errorMessage: err instanceof Error ? err.message : "Something went wrong.",
      });
    }
  };

  const uploadedUrl = data.output != null
    ? typeof data.output === "string"
      ? data.output
      : (data.output as Record<string, unknown>).video_url as string | undefined
    : undefined;

  return (
    <div className="relative">
      {data.runId && data.publicToken && (
        <RunStatus nodeId={id} runId={data.runId} publicToken={data.publicToken} dbRunId={data.dbRunId} />
      )}

      {/* Label above card */}
      <div className="absolute -top-6 left-0 flex items-center gap-1.5 pointer-events-none select-none">
        <VideoIcon className="w-3 h-3 text-violet-400" />
        <span className="text-[11px] text-[#888] font-book">Video</span>
        {status === NodeStatus.Running && <span className="text-[10px] text-amber-400 font-book animate-pulse">Uploading…</span>}
        {status === NodeStatus.Success && <span className="text-[10px] text-emerald-400 font-book">Uploaded</span>}
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
        <div className="p-3 flex flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="video/mp4,video/quicktime,video/webm,video/x-m4v"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />

          {data.previewUrl ? (
            <div className="relative">
              <video src={data.previewUrl} controls className="w-full rounded-xl max-h-40 nodrag nopan" />
              <button onClick={handleClear} disabled={locked}
                className="nodrag absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                <X className="w-3 h-3 text-white" />
              </button>
              <p className="mt-1 text-[10px] text-[#555] font-book truncate">{data.fileName}</p>
            </div>
          ) : (
            <button onClick={() => { if (!locked) inputRef.current?.click(); }} disabled={locked}
              className="nodrag w-full flex flex-col items-center gap-2.5 py-7 border border-dashed border-white/[0.1] hover:border-white/20 rounded-xl text-[#555] hover:text-[#888] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              <Upload className="w-4 h-4" />
              <span className="text-[12px] font-book">Upload</span>
              <span className="text-[11px] text-[#444] font-book">MP4, MOV, WebM · max 3 MB</span>
            </button>
          )}

          {data.errorMessage && status === NodeStatus.Error && (
            <div className="flex items-start gap-1.5 bg-red-950/30 border border-red-500/20 rounded-xl px-2.5 py-2">
              <AlertCircle className="w-3 h-3 text-red-400 mt-0.5 shrink-0" />
              <p className="text-[11px] text-red-300 font-book leading-relaxed">{data.errorMessage}</p>
            </div>
          )}

          {data.fileBase64 && (
            <button
              onClick={handleUpload}
              disabled={locked}
              className="nodrag w-full flex items-center justify-center gap-1.5 bg-white/[0.06] hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed border border-white/[0.08] rounded-xl py-2 text-[12px] font-book text-white transition-colors"
            >
              {status === NodeStatus.Running
                ? <><Loader2 className="w-3 h-3 animate-spin" />Uploading…</>
                : "Upload to Cloud"}
            </button>
          )}

          {uploadedUrl && (
            <div className="rounded-xl overflow-hidden border border-white/[0.08] nodrag nopan">
              <video src={uploadedUrl} controls className="w-full max-h-48" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
