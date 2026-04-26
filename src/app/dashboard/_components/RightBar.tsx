"use client";

import { MousePointerClick } from "lucide-react";
import type { Node } from "@xyflow/react";

interface RightBarProps {
  selectedNode: Node | null;
}

export function RightBar({ selectedNode }: RightBarProps) {
  return (
    <aside className="w-64 shrink-0 flex flex-col bg-zinc-950 border-l border-zinc-800 overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800 shrink-0">
        <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">Properties</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {selectedNode == null ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center pt-8">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
              <MousePointerClick className="w-4 h-4 text-zinc-600" />
            </div>
            <p className="text-xs text-zinc-600 leading-relaxed max-w-[160px]">
              Select a node to edit its properties
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <div>
              <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1.5">Type</p>
              <p className="text-sm text-zinc-200 font-medium capitalize">
                {selectedNode.type ?? "default"}
              </p>
            </div>

            <div>
              <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1.5">Node ID</p>
              <p className="text-xs text-zinc-500 font-mono bg-zinc-900 rounded-md px-2 py-1.5 border border-zinc-800">
                {selectedNode.id}
              </p>
            </div>

            <div className="h-px bg-zinc-800" />

            <div>
              <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-2">Data</p>
              <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-3">
                <pre className="text-xs text-zinc-400 whitespace-pre-wrap break-all font-mono leading-relaxed">
                  {JSON.stringify(selectedNode.data, null, 2)}
                </pre>
              </div>
            </div>

            <div>
              <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1.5">Position</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2">
                  <p className="text-[10px] text-zinc-600 mb-0.5">X</p>
                  <p className="text-xs text-zinc-300 font-mono">
                    {Math.round(selectedNode.position.x)}
                  </p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2">
                  <p className="text-[10px] text-zinc-600 mb-0.5">Y</p>
                  <p className="text-xs text-zinc-300 font-mono">
                    {Math.round(selectedNode.position.y)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
