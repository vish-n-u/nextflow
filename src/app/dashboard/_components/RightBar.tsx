"use client";

import { useState, useEffect } from "react";
import { MousePointerClick, History, ChevronDown, ChevronRight, ChevronLeft, RefreshCw } from "lucide-react";
import type { Node } from "@xyflow/react";
import type { NodeRunResponse } from "@/lib/api/runs";
import { useRunsStore } from "@/lib/stores/runsStore";

// ── Display helpers ───────────────────────────────────────────────────────────

const NODE_LABELS: Record<string, string> = {
  uploadImageNode:  "Upload Image",
  uploadVideoNode:  "Upload Video",
  cropImageNode:    "Crop Image",
  extractFrameNode: "Extract Frame",
  runLLMNode:       "Run LLM",
  textNode:         "Text",
};

function nodeLabel(type: string): string {
  return NODE_LABELS[type] ?? type;
}

function formatDuration(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < 1000)   return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatTime(iso: string): string {
  const d    = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 60_000)    return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// ── Status badge ─────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  running: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  success: "bg-green-500/15  text-green-400  border-green-500/30",
  failed:  "bg-red-500/15    text-red-400    border-red-500/30",
  partial: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  pending: "bg-zinc-700/40   text-zinc-400   border-zinc-600/30",
};

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_STYLES[status] ?? STATUS_STYLES.pending;
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${cls}`}>
      {status}
    </span>
  );
}

function ScopeBadge({ scope }: { scope: string }) {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-800 text-zinc-400 border border-zinc-700">
      {scope}
    </span>
  );
}

// ── Node run row (inside an expanded run) ────────────────────────────────────

function NodeRunRow({ node }: { node: NodeRunResponse }) {
  const [open, setOpen] = useState(false);
  const dotColor = { success: "bg-green-400", failed: "bg-red-400", running: "bg-yellow-400", pending: "bg-zinc-500" }[node.status] ?? "bg-zinc-500";

  return (
    <div className="border border-zinc-800 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="nodrag w-full flex items-center gap-2 px-2.5 py-2 bg-zinc-900 hover:bg-zinc-800/60 transition-colors text-left"
      >
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
        <span className="flex-1 text-[11px] text-zinc-300 truncate">{nodeLabel(node.nodeType)}</span>
        <span className="text-[10px] text-zinc-600">{formatDuration(node.durationMs)}</span>
        {open
          ? <ChevronDown  className="w-3 h-3 text-zinc-600 shrink-0" />
          : <ChevronRight className="w-3 h-3 text-zinc-600 shrink-0" />}
      </button>

      {open && (
        <div className="px-2.5 pb-2.5 pt-1.5 bg-zinc-950 flex flex-col gap-2">
          {node.error && (
            <p className="text-[10px] text-red-400 bg-red-950/30 border border-red-500/20 rounded px-2 py-1.5 leading-relaxed">
              {node.error}
            </p>
          )}
          {node.input != null && (
            <div>
              <p className="text-[9px] text-zinc-600 uppercase tracking-widest mb-1">Input</p>
              <pre className="text-[10px] text-zinc-400 bg-zinc-900 border border-zinc-800 rounded p-2 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
                {JSON.stringify(node.input, null, 2)}
              </pre>
            </div>
          )}
          {node.output != null && (
            <div>
              <p className="text-[9px] text-zinc-600 uppercase tracking-widest mb-1">Output</p>
              <pre className="text-[10px] text-zinc-400 bg-zinc-900 border border-zinc-800 rounded p-2 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
                {JSON.stringify(node.output, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Run row ──────────────────────────────────────────────────────────────────

function RunRow({ run }: { run: RunResponse }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`border rounded-xl overflow-hidden transition-colors ${
      run.status === "running" ? "border-yellow-500/25" : "border-zinc-800"
    }`}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="nodrag w-full text-left px-3 py-2.5 bg-zinc-900 hover:bg-zinc-800/60 transition-colors"
      >
        <div className="flex items-center gap-1.5 mb-1">
          <StatusBadge status={run.status} />
          <ScopeBadge  scope={run.scope} />
          <span className="ml-auto text-[10px] text-zinc-600">{formatDuration(run.durationMs)}</span>
          {open
            ? <ChevronDown  className="w-3 h-3 text-zinc-600 shrink-0" />
            : <ChevronRight className="w-3 h-3 text-zinc-600 shrink-0" />}
        </div>
        <div className="text-[10px] text-zinc-500 truncate">
          {run.workflowName} · {formatTime(run.startedAt)}
        </div>
      </button>

      {open && run.nodeRuns.length > 0 && (
        <div className="px-2.5 pb-2.5 pt-1 bg-zinc-950 flex flex-col gap-1.5">
          {run.nodeRuns.map((n) => (
            <NodeRunRow key={n.id} node={n} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── History tab ───────────────────────────────────────────────────────────────

function HistoryTab() {
  const { runs, hasMore, loading, loadingMore, error, stale, fetch: loadRuns, fetchMore, invalidate } = useRunsStore();

  // Fetch on mount (no-ops if already loaded and not stale)
  useEffect(() => { void loadRuns(); }, [loadRuns]);

  // Re-fetch if invalidated while this tab is mounted
  useEffect(() => { if (stale) void loadRuns(); }, [stale, fetch]);

  // Single-node runs dispatch this event — invalidate so the list refreshes
  useEffect(() => {
    const handler = () => invalidate();
    window.addEventListener("nextflow:run-complete", handler);
    return () => window.removeEventListener("nextflow:run-complete", handler);
  }, [invalidate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <RefreshCw className="w-4 h-4 text-zinc-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-xs text-red-400 text-center py-8 px-4">{error}</p>
    );
  }

  if (runs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center pt-8">
        <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
          <History className="w-4 h-4 text-zinc-600" />
        </div>
        <p className="text-xs text-zinc-600 leading-relaxed max-w-[160px]">
          No runs yet. Hit Run to execute your workflow.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {runs.map((run) => (
        <RunRow key={run.id} run={run} />
      ))}
      {hasMore && (
        <button
          onClick={() => void fetchMore()}
          disabled={loadingMore}
          className="w-full py-2 text-xs text-zinc-500 hover:text-zinc-300 disabled:opacity-50 flex items-center justify-center gap-1.5 transition-colors"
        >
          {loadingMore
            ? <><RefreshCw className="w-3 h-3 animate-spin" />Loading…</>
            : "Load more"}
        </button>
      )}
    </div>
  );
}

// ── Properties tab ────────────────────────────────────────────────────────────

function PropertiesTab({ selectedNode }: { selectedNode: Node | null }) {
  if (selectedNode === null) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center pt-8">
        <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
          <MousePointerClick className="w-4 h-4 text-zinc-600" />
        </div>
        <p className="text-xs text-zinc-600 leading-relaxed max-w-[160px]">
          Select a node to inspect its properties
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1.5">Type</p>
        <p className="text-sm text-zinc-200 font-medium capitalize">
          {selectedNode.type ?? "default"}
        </p>
      </div>

      <div>
        <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1.5">Node ID</p>
        <p className="text-xs text-zinc-500 font-mono bg-zinc-900 rounded-md px-2 py-1.5 border border-zinc-800 break-all">
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
            <p className="text-xs text-zinc-300 font-mono">{Math.round(selectedNode.position.x)}</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2">
            <p className="text-[10px] text-zinc-600 mb-0.5">Y</p>
            <p className="text-xs text-zinc-300 font-mono">{Math.round(selectedNode.position.y)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

type Tab = "history" | "properties";

interface RightBarProps {
  selectedNode: Node | null;
  isOpen?:      boolean;
  onClose?:     () => void;
}

export function RightBar({ selectedNode, isOpen = true, onClose }: RightBarProps) {
  const [tab, setTab]           = useState<Tab>("history");
  const [collapsed, setCollapsed] = useState(false);

  // Auto-switch to Properties when a node is selected
  useEffect(() => {
    if (selectedNode) setTab("properties");
  }, [selectedNode]);

  const expandTo = (t: Tab) => { setCollapsed(false); setTab(t); };

  return (
    <>
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-30 bg-black/60" onClick={onClose} />
      )}

      <aside
        className={`
          fixed top-12 bottom-0 right-0 z-40
          flex flex-col bg-zinc-950 border-l border-zinc-800 overflow-hidden
          transform transition-all duration-200 ease-in-out
          md:static md:top-auto md:bottom-auto md:z-auto md:shrink-0
          md:translate-x-0
          ${isOpen ? "translate-x-0" : "translate-x-full"}
          ${collapsed ? "md:w-12 w-72" : "md:w-64 w-72"}
        `}
      >
        {/* ── Collapsed strip (desktop only) ── */}
        <div className={`${collapsed ? "md:flex" : "md:hidden"} hidden flex-col items-center gap-2 py-2.5 flex-1`}>
          {/* Expand button */}
          <button
            onClick={() => setCollapsed(false)}
            title="Expand panel"
            className="w-9 h-9 rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 flex items-center justify-center transition-colors shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="w-6 h-px bg-zinc-800 shrink-0" />

          {/* History icon */}
          <button
            onClick={() => expandTo("history")}
            title="History"
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors shrink-0 ${
              tab === "history"
                ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30"
                : "text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 border border-transparent"
            }`}
          >
            <History className="w-4 h-4" />
          </button>

          {/* Properties icon */}
          <button
            onClick={() => expandTo("properties")}
            title="Properties"
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors shrink-0 ${
              tab === "properties"
                ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30"
                : "text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 border border-transparent"
            }`}
          >
            <MousePointerClick className="w-4 h-4" />
          </button>
        </div>

        {/* ── Full panel ── */}
        <div className={`${collapsed ? "md:hidden" : "md:flex"} flex flex-col flex-1 overflow-hidden`}>
          {/* Tab row */}
          <div className="flex border-b border-zinc-800 shrink-0">
            <button
              onClick={() => setTab("history")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-semibold transition-colors border-b-2 ${
                tab === "history"
                  ? "text-white border-indigo-500"
                  : "text-zinc-500 border-transparent hover:text-zinc-300"
              }`}
            >
              <History className="w-3 h-3" />
              History
            </button>
            <button
              onClick={() => setTab("properties")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-semibold transition-colors border-b-2 ${
                tab === "properties"
                  ? "text-white border-indigo-500"
                  : "text-zinc-500 border-transparent hover:text-zinc-300"
              }`}
            >
              <MousePointerClick className="w-3 h-3" />
              Properties
            </button>
            {/* Desktop collapse button */}
            <button
              onClick={() => setCollapsed(true)}
              title="Collapse panel"
              className="hidden md:flex px-2.5 text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 items-center justify-center border-b-2 border-transparent transition-colors"
              aria-label="Collapse panel"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            {/* Mobile close button */}
            <button
              onClick={onClose}
              className="md:hidden px-3 text-zinc-600 hover:text-zinc-400 text-lg leading-none border-b-2 border-transparent"
              aria-label="Close panel"
            >
              ×
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto overscroll-contain p-3">
            {tab === "history"
              ? <HistoryTab />
              : <PropertiesTab selectedNode={selectedNode} />}
          </div>
        </div>
      </aside>
    </>
  );
}
