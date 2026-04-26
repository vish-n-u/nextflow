"use client";

import { useRef } from "react";
import { Handle, Position, useReactFlow, type NodeProps, type Node } from "@xyflow/react";
import { Image, Upload, X } from "lucide-react";

type UploadImageNodeType = Node<{
  previewUrl?: string;
  fileBase64?: string;
  fileName?: string;
}>;

const SRC = "!w-3 !h-3 !bg-zinc-600 !border-2 !border-zinc-900 hover:!bg-white !rounded-full transition-colors";

export function UploadImageNode({ id, data, selected }: NodeProps<UploadImageNodeType>) {
  const { updateNodeData } = useReactFlow();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    const previewUrl = URL.createObjectURL(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      const fileBase64 = result.split(",")[1];
      updateNodeData(id, { previewUrl, fileBase64, fileName: file.name });
    };
    reader.readAsDataURL(file);
  };

  const handleClear = () => {
    if (data.previewUrl) URL.revokeObjectURL(data.previewUrl);
    updateNodeData(id, { previewUrl: undefined, fileBase64: undefined, fileName: undefined });
  };

  return (
    <div
      className={`bg-zinc-900 rounded-xl shadow-xl min-w-[240px] border transition-colors ${
        selected ? "border-zinc-500" : "border-zinc-800"
      }`}
    >
      <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-800 bg-zinc-950/80 rounded-t-xl">
        <Image className="w-3.5 h-3.5 text-zinc-400" />
        <span className="text-xs font-semibold text-zinc-200">Upload Image</span>
      </div>

      <div className="p-3">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />

        {data.previewUrl ? (
          <div className="relative">
            <img
              src={data.previewUrl}
              alt="preview"
              className="w-full rounded-lg object-cover max-h-40"
            />
            <button
              onClick={handleClear}
              className="nodrag absolute top-1.5 right-1.5 w-6 h-6 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700 rounded-full flex items-center justify-center transition-colors"
            >
              <X className="w-3 h-3 text-zinc-300" />
            </button>
            <p className="mt-1.5 text-[10px] text-zinc-600 truncate">{data.fileName}</p>
          </div>
        ) : (
          <button
            onClick={() => inputRef.current?.click()}
            className="nodrag w-full flex flex-col items-center gap-2 py-6 border border-dashed border-zinc-700 hover:border-zinc-500 rounded-lg text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            <Upload className="w-5 h-5" />
            <span className="text-xs">Click to upload image</span>
            <span className="text-[10px] text-zinc-700">PNG, JPG, WEBP</span>
          </button>
        )}
      </div>

      <Handle type="source" position={Position.Right} id="output" className={SRC} />
    </div>
  );
}
