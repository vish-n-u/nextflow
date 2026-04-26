"use client";

import { UserButton } from "@clerk/nextjs";
import { Layers, Play } from "lucide-react";

interface TopBarProps {
  workflowName: string;
  onWorkflowNameChange: (name: string) => void;
  workflowStatus: "idle" | "running" | "success" | "error";
  onRunWorkflow: () => void;
}

export function TopBar({ workflowName, onWorkflowNameChange, workflowStatus, onRunWorkflow }: TopBarProps) {
  const btnLabel =
    workflowStatus === "running" ? "Running…" :
    workflowStatus === "success" ? "Done"      :
    workflowStatus === "error"   ? "Error"     : "Run";

  const btnCls =
    workflowStatus === "success" ? "bg-green-500 text-white hover:bg-green-400" :
    workflowStatus === "error"   ? "bg-red-500 text-white hover:bg-red-400"     :
    workflowStatus === "running" ? "bg-zinc-300 text-black"                     :
    "bg-white text-black hover:bg-zinc-200";

  return (
    <header className="h-12 shrink-0 flex items-center justify-between px-4 bg-zinc-950 border-b border-zinc-800 z-10">
      <div className="flex items-center gap-2 w-40">
        <Layers className="w-4 h-4 text-white" />
        <span className="text-sm font-semibold text-white tracking-tight">NextFlow</span>
      </div>

      <input
        value={workflowName}
        onChange={(e) => onWorkflowNameChange(e.target.value)}
        className="bg-transparent text-sm text-zinc-300 text-center outline-none border border-transparent hover:border-zinc-700 focus:border-zinc-600 rounded-md px-2 py-0.5 w-52 transition-colors placeholder:text-zinc-600"
        placeholder="Untitled workflow"
      />

      <div className="flex items-center gap-3 w-40 justify-end">
        <button
          onClick={onRunWorkflow}
          disabled={workflowStatus === "running"}
          className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${btnCls}`}
        >
          <Play className="w-3 h-3 fill-current" />
          {btnLabel}
        </button>
        <UserButton />
      </div>
    </header>
  );
}
