"use client";

import { UserButton } from "@clerk/nextjs";
import { Layers, Play, PanelLeft, PanelRight, Save, Check, Loader2 } from "lucide-react";

interface TopBarProps {
  workflowName: string;
  onWorkflowNameChange: (name: string) => void;
  workflowStatus: "idle" | "running" | "success" | "error";
  onRunWorkflow: () => void;
  saveStatus: "idle" | "saving" | "saved" | "error";
  onSave: () => void;
  onToggleLeftBar: () => void;
  onToggleRightBar: () => void;
}

export function TopBar({ workflowName, onWorkflowNameChange, workflowStatus, onRunWorkflow, saveStatus, onSave, onToggleLeftBar, onToggleRightBar }: TopBarProps) {
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
    <header className="h-12 shrink-0 flex items-center justify-between px-3 bg-zinc-950 border-b border-zinc-800 z-10 gap-2">
      <div className="flex items-center gap-2 shrink-0">
        {/* Mobile: left bar toggle */}
        <button
          onClick={onToggleLeftBar}
          className="md:hidden p-1.5 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          aria-label="Toggle node panel"
        >
          <PanelLeft className="w-4 h-4" />
        </button>
        <Layers className="w-4 h-4 text-white hidden md:block" />
        <span className="text-sm font-semibold text-white tracking-tight hidden sm:block">NextFlow</span>
      </div>

      <input
        value={workflowName}
        onChange={(e) => onWorkflowNameChange(e.target.value)}
        className="bg-transparent text-sm text-zinc-300 text-center outline-none border border-transparent hover:border-zinc-700 focus:border-zinc-600 rounded-md px-2 py-0.5 w-32 sm:w-52 transition-colors placeholder:text-zinc-600 min-w-0"
        placeholder="Untitled workflow"
      />

      <div className="flex items-center gap-2 shrink-0">
        {/* Save button */}
        <button
          onClick={onSave}
          disabled={saveStatus === "saving"}
          className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
            saveStatus === "saved"
              ? "bg-green-500/15 text-green-400 border-green-500/30"
              : saveStatus === "error"
              ? "bg-red-500/15 text-red-400 border-red-500/30"
              : "bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700 hover:text-zinc-100"
          }`}
        >
          {saveStatus === "saving" && <Loader2 className="w-3 h-3 animate-spin" />}
          {saveStatus === "saved"  && <Check   className="w-3 h-3" />}
          {saveStatus === "idle" || saveStatus === "error"
            ? <Save className="w-3 h-3" />
            : null}
          <span className="hidden sm:inline">
            {saveStatus === "saving" ? "Saving…"
              : saveStatus === "saved" ? "Saved"
              : saveStatus === "error" ? "Failed"
              : "Save"}
          </span>
        </button>

        {/* Run button */}
        <button
          onClick={onRunWorkflow}
          disabled={workflowStatus === "running"}
          className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${btnCls}`}
        >
          <Play className="w-3 h-3 fill-current" />
          <span className="hidden sm:inline">{btnLabel}</span>
        </button>
        <UserButton />
        {/* Mobile: right bar toggle */}
        <button
          onClick={onToggleRightBar}
          className="md:hidden p-1.5 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          aria-label="Toggle properties panel"
        >
          <PanelRight className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
