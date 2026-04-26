"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { NODE_REGISTRY, type NodeMeta, type NodeCategory as NodeCategoryType } from "@/lib/nodeRegistry";

const CATEGORY_ORDER: NodeCategoryType[] = ["Input", "AI", "Transform"];

const NODE_CATEGORIES = CATEGORY_ORDER.map((cat) => ({
  label: cat,
  nodes: NODE_REGISTRY.filter((n) => n.category === cat),
}));


interface NodeCardProps {
  node: NodeMeta;
  onNodeAdd: (type: string) => void;
}

function NodeCard({ node, onNodeAdd }: NodeCardProps) {
  const { icon: Icon, label, description, type } = node;

  const handleDragStart = (event: React.DragEvent) => {
    event.dataTransfer.setData("application/reactflow", type);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={() => onNodeAdd(type)}
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

interface CategoryProps {
  category: { label: string; nodes: NodeMeta[] };
  onNodeAdd: (type: string) => void;
}

function Category({ category, onNodeAdd }: CategoryProps) {
  const [open, setOpen] = useState(true);

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 w-full px-1 py-2 text-[10px] font-semibold text-zinc-600 uppercase tracking-widest hover:text-zinc-400 transition-colors"
      >
        {open
          ? <ChevronDown className="w-3 h-3" />
          : <ChevronRight className="w-3 h-3" />
        }
        {category.label}
      </button>

      {open && (
        <div className="flex flex-col gap-1.5 mb-4">
          {category.nodes.map((node) => (
            <NodeCard key={node.type} node={node} onNodeAdd={onNodeAdd} />
          ))}
        </div>
      )}
    </div>
  );
}

interface LeftBarProps {
  onNodeAdd: (type: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export function LeftBar({ onNodeAdd, isOpen = true, onClose }: LeftBarProps) {
  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black/60"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed top-12 bottom-0 left-0 z-40 w-64
          flex flex-col bg-zinc-950 border-r border-zinc-800 overflow-hidden
          transform transition-transform duration-200 ease-in-out
          md:static md:top-auto md:bottom-auto md:z-auto md:w-56
          md:translate-x-0 md:shrink-0
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="px-4 py-3 border-b border-zinc-800 shrink-0 flex items-center justify-between">
          <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">Nodes</p>
          <button
            onClick={onClose}
            className="md:hidden text-zinc-600 hover:text-zinc-400 text-lg leading-none"
            aria-label="Close panel"
          >
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-2">
          {NODE_CATEGORIES.map((cat) => (
            <Category key={cat.label} category={cat} onNodeAdd={(type) => { onNodeAdd(type); onClose?.(); }} />
          ))}
        </div>
      </aside>
    </>
  );
}
