"use client";

import { useRef } from "react";
import { Handle, Position, useReactFlow, type NodeProps, type Node } from "@xyflow/react";
import { Video, Upload, X, Loader2, AlertCircle } from "lucide-react";
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

const SRC = "!w-3 !h-3 !bg-zinc-600 !border-2 !border-zinc-900 hover:!bg-white !rounded-full transition-colors";

export function UploadVideoNode({ id, data, selected }: NodeProps<UploadVideoNodeType>) {
  const { updateNodeData } = useReactFlow();
  const isWorkflowRunning = useIsWorkflowRunning();
  const inputRef = useRef<HTMLInputElement>(null);

  const status = data.status ?? NodeStatus.Idle;
  useStatusGlow(id, status);
  const locked = isWorkflowRunning || status === NodeStatus.Running;

  const border = status !== NodeStatus.Idle
    ? (STATUS_BORDER[status] ?? "border-zinc-800")
    : selected ? "border-zinc-500" : "border-zinc-800";

  const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3 MB

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

  // Single-node run: output = { video_url: "..." }
  // Workflow run: output = "https://..." (primary value from orchestrator)
  const uploadedUrl = data.output != null
    ? typeof data.output === "string"
      ? data.output
      : (data.output as Record<string, unknown>).video_url as string | undefined
    : undefined;

  return (
    <div className={`bg-zinc-900 rounded-xl shadow-xl min-w-[240px] border transition-all ${border}`}>
      {data.runId && data.publicToken && (
        <RunStatus nodeId={id} runId={data.runId} publicToken={data.publicToken} dbRunId={data.dbRunId} />
      )}

      <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-800 bg-zinc-950/80 rounded-t-xl">
        <Video className="w-3.5 h-3.5 text-zinc-400" />
        <span className="text-xs font-semibold text-zinc-200">Upload Video</span>
        {status === NodeStatus.Running && <span className="ml-auto text-[10px] text-yellow-400 animate-pulse">Uploading…</span>}
        {status === NodeStatus.Success && <span className="ml-auto text-[10px] text-green-400">Uploaded</span>}
        {status === NodeStatus.Error   && <span className="ml-auto text-[10px] text-red-400">Error</span>}
      </div>

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
            <video src={data.previewUrl} controls className="w-full rounded-lg max-h-40 nodrag nopan" />
            <button onClick={handleClear} disabled={locked}
              className="nodrag absolute top-1.5 right-1.5 w-6 h-6 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700 rounded-full flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              <X className="w-3 h-3 text-zinc-300" />
            </button>
            <p className="mt-1 text-[10px] text-zinc-600 truncate">{data.fileName}</p>
          </div>
        ) : (
          <button onClick={() => { if (!locked) inputRef.current?.click(); }} disabled={locked}
            className="nodrag w-full flex flex-col items-center gap-2 py-6 border border-dashed border-zinc-700 hover:border-zinc-500 rounded-lg text-zinc-600 hover:text-zinc-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-zinc-700 disabled:hover:text-zinc-600">
            <Upload className="w-5 h-5" />
            <span className="text-xs">Click to upload video</span>
            <span className="text-[10px] text-zinc-700">MP4, MOV, WebM, M4V · max 3 MB</span>
          </button>
        )}

        {data.errorMessage && status === NodeStatus.Error && (
          <div className="flex items-start gap-1.5 bg-red-950/40 border border-red-500/30 rounded-lg px-2.5 py-2">
            <AlertCircle className="w-3 h-3 text-red-400 mt-0.5 shrink-0" />
            <p className="text-[10px] text-red-300 leading-relaxed">{data.errorMessage}</p>
          </div>
        )}

        {data.fileBase64 && (
          <button
            onClick={handleUpload}
            disabled={locked}
            className="nodrag w-full flex items-center justify-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed border border-zinc-700 rounded-lg py-1.5 text-xs font-semibold text-zinc-200 transition-colors"
          >
            {status === NodeStatus.Running
              ? <><Loader2 className="w-3 h-3 animate-spin" />Uploading…</>
              : "Upload to Cloud"}
          </button>
        )}

        {uploadedUrl && (
          <div className="rounded-lg overflow-hidden border border-zinc-700 nodrag nopan">
            <video src={uploadedUrl} controls className="w-full max-h-48" />
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Right} id="output" className={SRC} />
    </div>
  );
}
