"use client";

import { useState, useMemo } from "react";
import { ChevronDown, ChevronRight, ChevronLeft, Search, X } from "lucide-react";
import { NODE_REGISTRY, type NodeMeta, type NodeCategory as NodeCategoryType } from "@/lib/nodeRegistry";

const CATEGORY_ORDER: NodeCategoryType[] = ["Input", "AI", "Transform"];

// ── Collapsed strip: icon-only quick-access buttons ───────────────────────────

function CollapsedNodeBtn({ node, onAdd }: { node: NodeMeta; onAdd: (type: string) => void }) {
  const { icon: Icon, label, type } = node;

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("application/reactflow", type);
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <button
      draggable
      onDragStart={handleDragStart}
      onClick={() => onAdd(type)}
      title={label}
      className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800 flex items-center justify-center active:scale-95 transition-all group select-none cursor-pointer shrink-0"
    >
      <Icon className="w-4 h-4 text-zinc-500 group-hover:text-zinc-200 transition-colors" />
    </button>
  );
}

// ── Node card (full row, used in categorized + search results) ─────────────────

function NodeCard({ node, onAdd }: { node: NodeMeta; onAdd: (type: string) => void }) {
  const { icon: Icon, label, description, type } = node;

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("application/reactflow", type);
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={() => onAdd(type)}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800/80 cursor-pointer active:scale-95 transition-all group select-none"
    >
      <div className="w-7 h-7 rounded-md bg-zinc-800 group-hover:bg-zinc-700 flex items-center justify-center shrink-0 transition-colors">
        <Icon className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-200 transition-colors" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-zinc-200 leading-none mb-0.5">{label}</p>
        <p className="text-[10px] text-zinc-500 truncate">{description}</p>
      </div>
    </div>
  );
}

// ── Collapsible category ───────────────────────────────────────────────────────

function Category({ category, onAdd }: { category: { label: string; nodes: NodeMeta[] }; onAdd: (type: string) => void }) {
  const [open, setOpen] = useState(true);

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 w-full px-1 py-2 text-[10px] font-semibold text-zinc-600 uppercase tracking-widest hover:text-zinc-400 transition-colors"
      >
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        {category.label}
      </button>
      {open && (
        <div className="flex flex-col gap-1.5 mb-4">
          {category.nodes.map((node) => (
            <NodeCard key={node.type} node={node} onAdd={onAdd} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface LeftBarProps {
  onNodeAdd: (type: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export function LeftBar({ onNodeAdd, isOpen = true, onClose }: LeftBarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [query, setQuery] = useState("");

  const handleAdd = (type: string) => { onNodeAdd(type); onClose?.(); };

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return NODE_REGISTRY.filter(
      (n) => n.label.toLowerCase().includes(q) || n.description.toLowerCase().includes(q),
    );
  }, [query]);

  const categories = CATEGORY_ORDER.map((cat) => ({
    label: cat,
    nodes: NODE_REGISTRY.filter((n) => n.category === cat),
  }));

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-30 bg-black/60" onClick={onClose} />
      )}

      <aside
        className={`
          fixed top-12 bottom-0 left-0 z-40
          flex flex-col bg-zinc-950 border-r border-zinc-800 overflow-hidden
          transform transition-all duration-200 ease-in-out
          md:static md:top-auto md:bottom-auto md:z-auto md:shrink-0
          md:translate-x-0
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          ${collapsed ? "md:w-12 w-64" : "md:w-56 w-64"}
        `}
      >
        {/* ── Collapsed strip (desktop only) ── */}
        <div className={`${collapsed ? "md:flex" : "md:hidden"} hidden flex-col items-center gap-2 py-2.5 flex-1 overflow-y-auto overscroll-contain`}>
          {/* Expand button */}
          <button
            onClick={() => setCollapsed(false)}
            title="Expand panel"
            className="w-9 h-9 rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 flex items-center justify-center transition-colors shrink-0"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <div className="w-6 h-px bg-zinc-800 shrink-0" />

          {/* Quick-access icons */}
          {NODE_REGISTRY.map((node) => (
            <CollapsedNodeBtn key={node.type} node={node} onAdd={onNodeAdd} />
          ))}
        </div>

        {/* ── Full panel ── */}
        <div className={`${collapsed ? "md:hidden" : "md:flex"} flex flex-col flex-1 overflow-hidden`}>
          {/* Header */}
          <div className="px-4 py-3 border-b border-zinc-800 shrink-0 flex items-center justify-between">
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">Nodes</p>
            <div className="flex items-center gap-1">
              {/* Desktop collapse button */}
              <button
                onClick={() => setCollapsed(true)}
                title="Collapse panel"
                className="hidden md:flex w-6 h-6 rounded-md text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 items-center justify-center transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              {/* Mobile close button */}
              <button
                onClick={onClose}
                className="md:hidden text-zinc-600 hover:text-zinc-400 text-lg leading-none"
                aria-label="Close panel"
              >
                ×
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="px-3 pt-3 pb-2 shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-600 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search nodes…"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-7 pr-7 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-zinc-600 transition-colors"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors"
                  aria-label="Clear search"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Node list */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-3 pb-3">
            {searchResults ? (
              searchResults.length > 0 ? (
                <div className="flex flex-col gap-1.5 pt-1">
                  {searchResults.map((node) => (
                    <NodeCard key={node.type} node={node} onAdd={handleAdd} />
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-zinc-600 text-center pt-8">No nodes match &ldquo;{query}&rdquo;</p>
              )
            ) : (
              categories.map((cat) => (
                <Category key={cat.label} category={cat} onAdd={handleAdd} />
              ))
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
