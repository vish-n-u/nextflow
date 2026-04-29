"use client";

import { useState, useMemo } from "react";
import { ChevronRight, ChevronLeft, Search, X } from "lucide-react";
import { NODE_REGISTRY, type NodeMeta } from "@/lib/nodeRegistry";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

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

  const visibleNodes = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return NODE_REGISTRY;
    return NODE_REGISTRY.filter(
      (n) => n.label.toLowerCase().includes(q) || n.description.toLowerCase().includes(q),
    );
  }, [query]);

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
        <ScrollArea className={`${collapsed ? "md:flex" : "md:hidden"} hidden flex-col items-center gap-2 py-2.5 flex-1`}>
          {/* Expand button */}
          <Button
            onClick={() => setCollapsed(false)}
            title="Expand panel"
            variant="ghost"
            size="icon"
            className="text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 shrink-0"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>

          <div className="w-6 h-px bg-zinc-800 shrink-0" />

          {/* Quick-access icons */}
          {NODE_REGISTRY.map((node) => (
            <CollapsedNodeBtn key={node.type} node={node} onAdd={onNodeAdd} />
          ))}
        </ScrollArea>

        {/* ── Full panel ── */}
        <div className={`${collapsed ? "md:hidden" : "md:flex"} flex flex-col flex-1 overflow-hidden`}>
          {/* Header */}
          <div className="px-4 py-3 border-b border-zinc-800 shrink-0 flex items-center justify-between">
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">Nodes</p>
            <div className="flex items-center gap-1">
              {/* Desktop collapse button */}
              <Button
                onClick={() => setCollapsed(true)}
                title="Collapse panel"
                variant="ghost"
                size="icon-xs"
                className="hidden md:flex text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              {/* Mobile close button */}
              <Button
                onClick={onClose}
                variant="ghost"
                size="icon-xs"
                className="md:hidden text-zinc-600 hover:text-zinc-400"
                aria-label="Close panel"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="px-3 pt-3 pb-2 shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-600 pointer-events-none" />
              <Input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search nodes…"
                className="bg-zinc-900 border-zinc-800 pl-7 pr-7 h-7 text-xs text-zinc-200 placeholder:text-zinc-600 focus-visible:border-zinc-600 focus-visible:ring-0"
              />
              {query && (
                <Button
                  onClick={() => setQuery("")}
                  variant="ghost"
                  size="icon-xs"
                  className="absolute right-1 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 hover:bg-transparent"
                  aria-label="Clear search"
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>

          {/* Node list */}
          <ScrollArea className="flex-1">
            <div className="flex flex-col gap-1.5 px-3 pb-3 pt-1">
              {visibleNodes.length > 0 ? (
                visibleNodes.map((node) => (
                  <NodeCard key={node.type} node={node} onAdd={handleAdd} />
                ))
              ) : (
                <p className="text-[11px] text-zinc-600 text-center pt-8">No nodes match &ldquo;{query}&rdquo;</p>
              )}
            </div>
          </ScrollArea>
        </div>
      </aside>
    </>
  );
}
