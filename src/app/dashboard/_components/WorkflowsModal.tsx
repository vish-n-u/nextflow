"use client";

import { useState, useEffect } from "react";
import { FolderOpen, RefreshCw, X, Clock, Box } from "lucide-react";
import { useWorkflowsStore } from "@/lib/stores/workflowsStore";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface WorkflowDetail {
  id:    string;
  name:  string;
  nodes: unknown;
  edges: unknown;
}

interface WorkflowsModalProps {
  open:    boolean;
  onLoad:  (workflow: WorkflowDetail) => void;
  onClose: () => void;
}

function formatUpdatedAt(iso: string): string {
  const d    = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 60_000)    return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function WorkflowsModal({ open, onLoad, onClose }: WorkflowsModalProps) {
  const { workflows, hasMore, loading, loadingMore, error, fetch: loadWorkflows, fetchMore } = useWorkflowsStore();
  const [loadingId,   setLoadingId]   = useState<string | null>(null);
  const [selectError, setSelectError] = useState<string | null>(null);

  // Fetch on open — no-ops if already loaded and not stale
  useEffect(() => { void loadWorkflows(); }, [loadWorkflows]);

  const handleSelect = async (id: string) => {
    setLoadingId(id);
    try {
      const res = await fetch(`/api/workflows/${id}`);
      if (!res.ok) throw new Error("Failed to load workflow");
      const workflow = await res.json() as WorkflowDetail;
      onLoad(workflow);
    } catch (err) {
      setSelectError(err instanceof Error ? err.message : "Failed to load workflow");
      setLoadingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent
        className="bg-zinc-950 border-zinc-800 p-0 sm:max-w-md overflow-hidden gap-0"
        showCloseButton={false}
      >
        {/* Header */}
        <DialogHeader className="flex flex-row items-center justify-between px-5 py-4 border-b border-zinc-800 space-y-0">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-zinc-400" />
            <DialogTitle className="text-sm font-semibold text-zinc-100">Open Workflow</DialogTitle>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon-sm"
            className="text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </Button>
        </DialogHeader>

        {/* Body */}
        <ScrollArea className="max-h-[50dvh] sm:max-h-[60dvh]">
          <div className="p-3">
            {loading && (
              <div className="flex items-center justify-center h-32">
                <RefreshCw className="w-4 h-4 text-zinc-600 animate-spin" />
              </div>
            )}

            {(error ?? selectError) && (
              <p className="text-xs text-red-400 text-center py-8 px-4">{error ?? selectError}</p>
            )}

            {!loading && !error && workflows.length === 0 && (
              <div className="flex flex-col items-center justify-center h-32 gap-3">
                <FolderOpen className="w-8 h-8 text-zinc-700" />
                <p className="text-xs text-zinc-600 text-center">
                  No saved workflows yet. Save your canvas first.
                </p>
              </div>
            )}

            {!loading && !error && workflows.length > 0 && (
              <div className="flex flex-col gap-1.5">
                {workflows.map((wf) => (
                  <Button
                    key={wf.id}
                    onClick={() => handleSelect(wf.id)}
                    disabled={loadingId !== null}
                    variant="ghost"
                    className="w-full flex items-center gap-3 px-3 py-3 h-auto rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800/80 justify-start text-left group"
                  >
                    {loadingId === wf.id ? (
                      <RefreshCw className="w-4 h-4 text-zinc-400 animate-spin shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-zinc-800 group-hover:bg-zinc-700 flex items-center justify-center shrink-0 transition-colors">
                        <Box className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-200 truncate">{wf.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-zinc-600 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {formatUpdatedAt(wf.updatedAt)}
                        </span>
                        <span className="text-[10px] text-zinc-700">·</span>
                        <span className="text-[10px] text-zinc-600">
                          {wf.nodeCount} {wf.nodeCount === 1 ? "node" : "nodes"}
                        </span>
                      </div>
                    </div>
                  </Button>
                ))}

                {hasMore && (
                  <Button
                    onClick={() => void fetchMore()}
                    disabled={loadingMore}
                    variant="ghost"
                    className="w-full py-2 h-auto text-xs text-zinc-500 hover:text-zinc-300"
                  >
                    {loadingMore
                      ? <><RefreshCw className="w-3 h-3 animate-spin" />Loading…</>
                      : "Load more"}
                  </Button>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
