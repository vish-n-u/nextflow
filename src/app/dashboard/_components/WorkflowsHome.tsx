"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, RefreshCw, Search, Layers } from "lucide-react";
import { useWorkflowsStore } from "@/lib/stores/workflowsStore";

// ── Helpers ──────────────────────────────────────────────────────────────────

const GRADIENTS = [
  "from-indigo-950 to-violet-900",
  "from-blue-950 to-cyan-900",
  "from-emerald-950 to-teal-900",
  "from-orange-950 to-amber-900",
  "from-rose-950 to-pink-900",
  "from-fuchsia-950 to-purple-900",
];

function gradientFor(id: string): string {
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffffffff;
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}

function formatTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000)     return "just now";
  if (diff < 3_600_000)  return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// ── WorkflowCard ─────────────────────────────────────────────────────────────

function WorkflowCard({ id, name, nodeCount, updatedAt }: {
  id: string; name: string; nodeCount: number; updatedAt: string;
}) {
  return (
    <Link
      href={`/dashboard/${id}`}
      className="group flex flex-col rounded-2xl border border-zinc-800 hover:border-zinc-600 overflow-hidden bg-zinc-900 hover:bg-zinc-800/60 transition-all text-left w-full"
    >
      {/* Thumbnail */}
      <div className={`bg-gradient-to-br ${gradientFor(id)} relative h-36 overflow-hidden`}>
        {/* Mini nodes mock */}
        <div className="absolute inset-0 flex items-center justify-center gap-3 opacity-20 group-hover:opacity-40 transition-opacity">
          {Array.from({ length: Math.min(nodeCount, 3) }).map((_, i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <div className="w-10 h-2 rounded bg-white/40" />
              <div className="w-7 h-2 rounded bg-white/20" />
              <div className="w-9 h-2 rounded bg-white/30" />
            </div>
          ))}
        </div>
        {/* Faint connecting lines */}
        <svg className="absolute inset-0 w-full h-full opacity-10 group-hover:opacity-20 transition-opacity" xmlns="http://www.w3.org/2000/svg">
          <line x1="30%" y1="50%" x2="70%" y2="50%" stroke="white" strokeWidth="1" strokeDasharray="4 4" />
        </svg>
      </div>
      {/* Info */}
      <div className="px-3 py-2.5">
        <p className="text-sm font-medium text-zinc-200 group-hover:text-white truncate transition-colors">
          {name}
        </p>
        <p className="text-[10px] text-zinc-600 mt-0.5">
          {nodeCount} {nodeCount === 1 ? "node" : "nodes"} · {formatTime(updatedAt)}
        </p>
      </div>
    </Link>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

export function WorkflowsHome() {
  const {
    workflows, hasMore, loading, loadingMore, error,
    fetch: loadWorkflows, fetchMore,
  } = useWorkflowsStore();
  const [search, setSearch] = useState("");

  useEffect(() => { void loadWorkflows(); }, [loadWorkflows]);

  const filtered = search.trim()
    ? workflows.filter((w) => w.name.toLowerCase().includes(search.toLowerCase()))
    : workflows;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-zinc-950 border-b border-zinc-800/60">
        {/* Dot grid bg */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: "radial-gradient(circle, #a1a1aa 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        {/* Gradient fade overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-zinc-950" />

        <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-10 py-16 md:py-20 flex flex-col md:flex-row items-start md:items-center gap-10">
          {/* Left: copy */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
                <Layers className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">Node Editor</h1>
            </div>
            <p className="text-zinc-400 text-sm leading-relaxed max-w-xs mb-8">
              Connect every tool and model into complex automated pipelines — visually, in real time.
            </p>
            <Link
              href="/dashboard/new"
              className="inline-flex items-center gap-2 bg-white text-black text-sm font-semibold px-6 py-2.5 rounded-full hover:bg-zinc-100 active:bg-zinc-200 transition-colors shadow-lg"
            >
              New Workflow
              <span className="text-base leading-none">→</span>
            </Link>
          </div>

          {/* Right: fake canvas preview */}
          <div className="hidden md:flex w-[480px] h-52 rounded-2xl border border-zinc-700/60 bg-zinc-900/60 backdrop-blur-sm overflow-hidden items-center justify-center gap-6 px-8 shrink-0">
            {[
              { label: "Upload Image", w: "w-28" },
              { label: "Run LLM",      w: "w-24" },
              { label: "Output",       w: "w-20" },
            ].map((node, i) => (
              <div key={i} className="flex items-center gap-6">
                <div className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-xs text-zinc-300 font-medium shadow-md">
                  {node.label}
                </div>
                {i < 2 && (
                  <div className="flex items-center gap-1 text-zinc-600">
                    <div className="w-6 h-px bg-zinc-600" />
                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                    <div className="w-6 h-px bg-zinc-600" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Workflows grid ────────────────────────────────────────────────── */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-6 md:px-10 py-8">

        {/* Toolbar */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <h2 className="text-sm font-semibold text-zinc-200 mr-2">My Workflows</h2>
          <div className="flex-1" />
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search workflows…"
              className="bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-sm text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors w-52"
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <p className="text-xs text-red-400 text-center py-8">{error}</p>
        )}

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">

          {/* New Workflow card */}
          <Link
            href="/dashboard/new"
            className="group flex flex-col items-center justify-center aspect-[4/3] rounded-2xl border-2 border-dashed border-zinc-800 hover:border-zinc-600 bg-zinc-900/40 hover:bg-zinc-900 transition-all gap-2"
          >
            <div className="w-10 h-10 rounded-full bg-zinc-800 group-hover:bg-zinc-700 flex items-center justify-center transition-colors">
              <Plus className="w-5 h-5 text-zinc-400 group-hover:text-zinc-200 transition-colors" />
            </div>
            <span className="text-xs text-zinc-500 group-hover:text-zinc-300 font-medium transition-colors">
              New Workflow
            </span>
          </Link>

          {/* Skeleton loaders */}
          {loading && workflows.length === 0 && Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden animate-pulse">
              <div className="h-36 bg-zinc-800" />
              <div className="px-3 py-2.5 flex flex-col gap-1.5">
                <div className="h-3 w-2/3 rounded bg-zinc-700" />
                <div className="h-2 w-1/2 rounded bg-zinc-800" />
              </div>
            </div>
          ))}

          {/* Workflow cards */}
          {filtered.map((wf) => (
            <WorkflowCard
              key={wf.id}
              id={wf.id}
              name={wf.name}
              nodeCount={wf.nodeCount}
              updatedAt={wf.updatedAt}
            />
          ))}
        </div>

        {/* Empty state (after load, no workflows) */}
        {!loading && !error && workflows.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <p className="text-sm text-zinc-500">No workflows yet.</p>
            <Link
              href="/dashboard/new"
              className="text-xs text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
            >
              Create your first workflow
            </Link>
          </div>
        )}

        {/* Load more */}
        {hasMore && !search && (
          <div className="mt-8 flex justify-center">
            <button
              onClick={() => void fetchMore()}
              disabled={loadingMore}
              className="text-xs text-zinc-500 hover:text-zinc-300 disabled:opacity-50 flex items-center gap-1.5 transition-colors"
            >
              {loadingMore
                ? <><RefreshCw className="w-3 h-3 animate-spin" />Loading…</>
                : "Load more"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
