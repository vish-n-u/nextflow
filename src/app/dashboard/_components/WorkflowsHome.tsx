"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, RefreshCw, Search, Grid2X2, ChevronDown } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { useWorkflowsStore } from "@/lib/stores/workflowsStore";
import type { NodePreview, EdgePreview } from "@/lib/api/workflows/list-workflows";
import { NODE_EDGE_COLORS, DEFAULT_EDGE_COLOR } from "@/lib/nodeColors";

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000)     return "just now";
  if (diff < 3_600_000)  return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// ── Workflow SVG preview ──────────────────────────────────────────────────────

const NODE_W  = 54;
const NODE_H  = 28;
const VW      = 400;
const VH      = 280;
const PAD     = 48;

function WorkflowPreviewSvg({ nodes, edges }: { nodes: NodePreview[]; edges: EdgePreview[] }) {
  if (nodes.length === 0) {
    return (
      <svg viewBox={`0 0 ${VW} ${VH}`} className="w-full h-full">
        <text x={VW / 2} y={VH / 2} textAnchor="middle" dominantBaseline="middle"
          fill="#333" fontSize="13" fontFamily="sans-serif">
          Empty workflow
        </text>
      </svg>
    );
  }

  const xs   = nodes.map((n) => n.position.x);
  const ys   = nodes.map((n) => n.position.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const rangeX = (Math.max(...xs) - minX) || 1;
  const rangeY = (Math.max(...ys) - minY) || 1;

  const scaleX = (VW - PAD * 2 - NODE_W) / rangeX;
  const scaleY = (VH - PAD * 2 - NODE_H) / rangeY;
  const scale  = Math.min(scaleX, scaleY);

  const scaledW = rangeX * scale + NODE_W;
  const scaledH = rangeY * scale + NODE_H;
  const offX    = (VW - scaledW) / 2;
  const offY    = (VH - scaledH) / 2;

  const tx = (x: number) => (x - minX) * scale + offX;
  const ty = (y: number) => (y - minY) * scale + offY;

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} className="w-full h-full">
      {/* Edges */}
      {edges.map((e, i) => {
        const src = nodeMap.get(e.source);
        const tgt = nodeMap.get(e.target);
        if (!src || !tgt) return null;

        const x1   = tx(src.position.x) + NODE_W;
        const y1   = ty(src.position.y) + NODE_H / 2;
        const x2   = tx(tgt.position.x);
        const y2   = ty(tgt.position.y) + NODE_H / 2;
        const cp   = Math.abs(x2 - x1) * 0.45 + 10;
        const color = NODE_EDGE_COLORS[src.type] ?? DEFAULT_EDGE_COLOR;

        return (
          <path
            key={i}
            d={`M ${x1},${y1} C ${x1 + cp},${y1} ${x2 - cp},${y2} ${x2},${y2}`}
            stroke={color}
            strokeWidth="1.5"
            strokeOpacity="0.45"
            fill="none"
          />
        );
      })}

      {/* Nodes */}
      {nodes.map((n) => {
        const x     = tx(n.position.x);
        const y     = ty(n.position.y);
        const color = NODE_EDGE_COLORS[n.type] ?? DEFAULT_EDGE_COLOR;
        return (
          <rect
            key={n.id}
            x={x} y={y}
            width={NODE_W} height={NODE_H}
            rx={6}
            fill={color}        fillOpacity={0.1}
            stroke={color}      strokeOpacity={0.35}
            strokeWidth={1}
          />
        );
      })}
    </svg>
  );
}

// ── WorkflowCard ─────────────────────────────────────────────────────────────

function WorkflowCard({ id, name, updatedAt, previewNodes, previewEdges }: {
  id: string; name: string; updatedAt: string;
  previewNodes: NodePreview[]; previewEdges: EdgePreview[];
}) {
  return (
    <Link href={`/dashboard/${id}`} className="group flex flex-col gap-2">
      {/* Thumbnail */}
      <div className="aspect-[4/3] rounded-xl bg-[#1c1c1c] border border-white/5 overflow-hidden group-hover:border-white/15 transition-colors">
        <WorkflowPreviewSvg nodes={previewNodes} edges={previewEdges} />
      </div>

      {/* Info */}
      <div>
        <p className="text-[13px] text-white font-book truncate">{name}</p>
        <p className="text-[11px] text-[#666] font-book mt-0.5">
          {formatTime(updatedAt)}
        </p>
      </div>
    </Link>
  );
}

// ── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = ["Projects", "Apps", "Examples", "Templates"] as const;
type Tab = typeof TABS[number];

// ── Main ─────────────────────────────────────────────────────────────────────

export function WorkflowsHome() {
  const {
    workflows, hasMore, loading, loadingMore, error,
    fetch: loadWorkflows, fetchMore,
  } = useWorkflowsStore();

  const [search, setSearch]   = useState("");
  const [activeTab, setTab]   = useState<Tab>("Projects");

  useEffect(() => { void loadWorkflows(); }, [loadWorkflows]);

  const filtered = search.trim()
    ? workflows.filter((w) => w.name.toLowerCase().includes(search.toLowerCase()))
    : workflows;

  return (
    <div className="min-h-screen bg-[#111111] text-white flex flex-col font-book">

      {/* ── Top nav ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 flex items-center justify-between px-6 h-12 bg-[#111111]/90 backdrop-blur-sm border-b border-white/[0.06]">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-[13px] font-medium text-white tracking-tight font-book">NextFlow</span>
        </Link>
        <UserButton />
      </header>

      {/* ── Hero banner ──────────────────────────────────────────────────── */}
      <div className="relative w-full overflow-hidden min-h-[320px] sm:min-h-[400px]">
        {/* BG image — covers right half */}
        <div
          className="absolute inset-0 bg-cover bg-right"
          style={{ backgroundImage: `url(https://s.krea.ai/nodesHeaderBannerBlurGradient.webp)` }}
        />
        {/* Dark gradient overlay fading left to right */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#111111] from-30% via-[#111111]/80 via-55% to-transparent" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center h-full px-6 sm:px-12 md:px-16 max-w-[520px]">
          {/* Icon + title */}
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "linear-gradient(135deg, #3b8bfc 0%, #1a6ef5 100%)" }}
            >
              {/* Two-arrow icon approximation */}
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M3 9h12M10 5l4 4-4 4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M8 5L4 9l4 4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h1 className="text-[28px] font-semibold text-white leading-none tracking-[-0.02em] font-book">
              Node Editor
            </h1>
          </div>

          {/* Description */}
          <p className="text-[13.5px] text-[#b0b0b0] leading-[1.6] mb-8 font-book">
            Nodes is the most powerful way to operate NextFlow. Connect<br />
            every tool and model into complex automated pipelines.
          </p>

          {/* CTA button */}
          <Link
            href="/dashboard/new"
            className="inline-flex items-center gap-2 bg-white text-[#111] text-[13px] font-medium font-book px-6 py-2.5 rounded-full hover:bg-white/90 active:bg-white/80 transition-colors w-fit"
          >
            New Workflow
            <span className="text-base leading-none">→</span>
          </Link>
        </div>
      </div>

      {/* ── Tabs + toolbar ───────────────────────────────────────────────── */}
      <div className="px-6 md:px-12 pt-7 pb-0">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {/* Tabs — scrollable on mobile */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none flex-1 shrink-0">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setTab(tab)}
                className={[
                  "px-4 py-1.5 rounded-full text-[13px] font-book transition-colors whitespace-nowrap shrink-0",
                  activeTab === tab
                    ? "bg-white text-[#111] font-medium"
                    : "text-[#777] hover:text-white",
                ].join(" ")}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Search */}
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#555] pointer-events-none" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search projects..."
                className="bg-[#1a1a1a] border border-white/[0.08] rounded-full pl-9 pr-4 py-2 text-[12.5px] text-white placeholder:text-[#555] focus:outline-none focus:border-white/20 transition-colors w-full sm:w-44 font-book"
              />
            </div>

            {/* Last viewed dropdown — hidden on mobile */}
            <button className="hidden sm:flex items-center gap-1.5 bg-[#1a1a1a] border border-white/[0.08] rounded-full px-4 py-2 text-[12.5px] text-white hover:border-white/20 transition-colors font-book">
              Last viewed
              <ChevronDown className="w-3.5 h-3.5 text-[#666]" />
            </button>

            {/* Grid icon */}
            <button className="flex items-center justify-center w-9 h-9 bg-[#1a1a1a] border border-white/[0.08] rounded-full hover:border-white/20 transition-colors shrink-0">
              <Grid2X2 className="w-4 h-4 text-[#666]" />
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="mt-5 border-b border-white/[0.06]" />
      </div>

      {/* ── Grid ─────────────────────────────────────────────────────────── */}
      <div className="px-6 md:px-12 py-7 flex-1">

        {error && (
          <p className="text-xs text-red-400 text-center py-8">{error}</p>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-6">

          {/* New Workflow card */}
          <Link href="/dashboard/new" className="group flex flex-col gap-2">
            <div className="aspect-[4/3] rounded-xl bg-[#1c1c1c] border border-white/[0.06] group-hover:border-white/15 flex items-center justify-center transition-colors">
              <div className="w-9 h-9 rounded-full bg-[#2a2a2a] group-hover:bg-[#333] flex items-center justify-center transition-colors">
                <Plus className="w-4 h-4 text-white" />
              </div>
            </div>
            <p className="text-[13px] text-white font-book">New Workflow</p>
          </Link>

          {/* Skeleton loaders */}
          {loading && workflows.length === 0 && Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2 animate-pulse">
              <div className="aspect-[4/3] rounded-xl bg-[#1c1c1c]" />
              <div className="h-3 w-2/3 rounded bg-[#222]" />
              <div className="h-2.5 w-1/2 rounded bg-[#1c1c1c]" />
            </div>
          ))}

          {/* Workflow cards */}
          {filtered.map((wf) => (
            <WorkflowCard
              key={wf.id}
              id={wf.id}
              name={wf.name}
              updatedAt={wf.updatedAt}
              previewNodes={wf.previewNodes}
              previewEdges={wf.previewEdges}
            />
          ))}
        </div>

        {/* Empty state */}
        {!loading && !error && workflows.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <p className="text-[13px] text-[#555] font-book">No workflows yet.</p>
            <Link href="/dashboard/new" className="text-[12px] text-white/40 hover:text-white/70 underline underline-offset-2 font-book transition-colors">
              Create your first workflow
            </Link>
          </div>
        )}

        {/* Load more */}
        {hasMore && !search && (
          <div className="mt-10 flex justify-center">
            <button
              onClick={() => void fetchMore()}
              disabled={loadingMore}
              className="text-[12px] text-[#555] hover:text-[#999] disabled:opacity-40 flex items-center gap-1.5 transition-colors font-book"
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
