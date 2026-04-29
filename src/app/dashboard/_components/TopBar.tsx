"use client";

import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { Layers, Play, PanelLeft, PanelRight, Save, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface TopBarProps {
  workflowName: string;
  onWorkflowNameChange: (name: string) => void;
  workflowStatus: "idle" | "running" | "success" | "error";
  onRunWorkflow: () => void;
  saveStatus: "idle" | "saving" | "saved" | "error";
  onSave: () => void;
  onToggleLeftBar: () => void;
  onToggleRightBar: () => void;
  runError?: string | null;
  selectedCount?: number;
}

export function TopBar({ workflowName, onWorkflowNameChange, workflowStatus, onRunWorkflow, saveStatus, onSave, onToggleLeftBar, onToggleRightBar, runError, selectedCount = 0 }: TopBarProps) {
  const idleLabel =
    selectedCount > 0 ? `Run (${selectedCount})` : "Run";

  const btnLabel =
    workflowStatus === "running" ? "Running…" :
    workflowStatus === "success" ? "Done"      :
    workflowStatus === "error"   ? "Error"     : idleLabel;

  const btnCls =
    workflowStatus === "success" ? "bg-green-500 text-white hover:bg-green-400" :
    workflowStatus === "error"   ? "bg-red-500 text-white hover:bg-red-400"     :
    workflowStatus === "running" ? "bg-zinc-300 text-black"                     :
    "bg-white text-black hover:bg-zinc-200";

  return (
    <header className="shrink-0 flex flex-col bg-zinc-950 border-b border-zinc-800 z-10">
    <div className="h-12 flex items-center justify-between px-3 gap-2">
      <div className="flex items-center gap-2 shrink-0">
        {/* Mobile: left bar toggle */}
        <Button
          onClick={onToggleLeftBar}
          variant="ghost"
          size="icon-sm"
          className="md:hidden text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
          aria-label="Toggle node panel"
        >
          <PanelLeft className="w-4 h-4" />
        </Button>
        <Link href="/dashboard" className="flex items-center gap-2 cursor-pointer">
          <Layers className="w-4 h-4 text-white hidden md:block" />
          <span className="text-sm font-semibold text-white tracking-tight hidden sm:block">NextFlow</span>
        </Link>
      </div>

      <Input
        value={workflowName}
        onChange={(e) => onWorkflowNameChange(e.target.value)}
        className="bg-transparent text-sm text-zinc-300 text-center border-transparent hover:border-zinc-700 focus-visible:border-zinc-600 focus-visible:ring-0 rounded-md px-2 py-0.5 h-auto w-32 sm:w-52 transition-colors placeholder:text-zinc-600 min-w-0"
        placeholder="Untitled workflow"
      />

      <div className="flex items-center gap-2 shrink-0">
        {/* Save button */}
        <Button
          onClick={onSave}
          disabled={saveStatus === "saving"}
          size="sm"
          className={`rounded-full border text-xs font-semibold cursor-pointer ${
            saveStatus === "saved"
              ? "bg-green-500/15 text-green-400 border-green-500/30 hover:bg-green-500/25"
              : saveStatus === "error"
              ? "bg-red-500/15 text-red-400 border-red-500/30 hover:bg-red-500/25"
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
        </Button>

        {/* Run button */}
        <Button
          onClick={onRunWorkflow}
          disabled={workflowStatus === "running"}
          size="sm"
          className={`rounded-full text-xs font-semibold cursor-pointer ${btnCls}`}
        >
          <Play className="w-3 h-3 fill-current" />
          <span className="hidden sm:inline">{btnLabel}</span>
        </Button>
        <UserButton />
        {/* Mobile: right bar toggle */}
        <Button
          onClick={onToggleRightBar}
          variant="ghost"
          size="icon-sm"
          className="md:hidden text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
          aria-label="Toggle properties panel"
        >
          <PanelRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
    {runError && (
      <div className="px-3 py-1.5 bg-red-950/60 border-t border-red-500/20 text-[11px] text-red-300 truncate">
        {runError}
      </div>
    )}
    </header>
  );
}
