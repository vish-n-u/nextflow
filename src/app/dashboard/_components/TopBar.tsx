"use client";

import { UserButton } from "@clerk/nextjs";
import { Layers, Play } from "lucide-react";

interface TopBarProps {
  workflowName: string;
  onWorkflowNameChange: (name: string) => void;
}

export function TopBar({ workflowName, onWorkflowNameChange }: TopBarProps) {
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
        <button className="flex items-center gap-1.5 bg-white text-black text-xs font-semibold px-3 py-1.5 rounded-full hover:bg-zinc-200 transition-colors">
          <Play className="w-3 h-3 fill-black" />
          Run
        </button>
        <UserButton />
      </div>
    </header>
  );
}
