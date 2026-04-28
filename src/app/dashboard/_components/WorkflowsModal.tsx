"use client";

import { useState, useEffect, useRef } from "react";
import { FolderOpen, RefreshCw, X, Clock, Box } from "lucide-react";
import type { WorkflowSummary } from "@/lib/api/workflows";

const PAGE = 5;

interface WorkflowDetail {
  id:    string;
  name:  string;
  nodes: unknown;
  edges: unknown;
}

interface WorkflowsModalProps {
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

export function WorkflowsModal({ onLoad, onClose }: WorkflowsModalProps) {
  const [workflows,   setWorkflows]   = useState<WorkflowSummary[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore,     setHasMore]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [loadingId,   setLoadingId]   = useState<string | null>(null);
  const offsetRef = useRef(0);

  const fetchPage = async (offset: number, append: boolean) => {
    const res = await fetch(`/api/workflows?limit=${PAGE}&offset=${offset}`);
    if (!res.ok) throw new Error("Failed to load workflows");
    const data = await res.json() as WorkflowSummary[];
    setWorkflows((prev) => append ? [...prev, ...data] : data);
    setHasMore(data.length === PAGE);
    offsetRef.current = offset + data.length;
  };

  useEffect(() => {
    void fetchPage(0, false)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Failed to load workflows"))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLoadMore = async () => {
    setLoadingMore(true);
    try { await fetchPage(offsetRef.current, true); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed to load workflows"); }
    finally { setLoadingMore(false); }
  };

  const handleSelect = async (id: string) => {
    setLoadingId(id);
    try {
      const res = await fetch(`/api/workflows/${id}`);
      if (!res.ok) throw new Error("Failed to load workflow");
      const workflow = await res.json() as WorkflowDetail;
      onLoad(workflow);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load workflow");
      setLoadingId(null);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-none">
        <div className="pointer-events-auto w-full sm:max-w-md bg-zinc-950 border-t sm:border border-zinc-800 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-zinc-400" />
              <span className="text-sm font-semibold text-zinc-100">Open Workflow</span>
            </div>
            <button
              onClick={onClose}
              className="text-zinc-600 hover:text-zinc-300 transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto max-h-[50dvh] sm:max-h-[60dvh] p-3">
            {loading && (
              <div className="flex items-center justify-center h-32">
                <RefreshCw className="w-4 h-4 text-zinc-600 animate-spin" />
              </div>
            )}

            {error && (
              <p className="text-xs text-red-400 text-center py-8 px-4">{error}</p>
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
                  <button
                    key={wf.id}
                    onClick={() => handleSelect(wf.id)}
                    disabled={loadingId !== null}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-left group"
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
                  </button>
                ))}

                {hasMore && (
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="w-full py-2 text-xs text-zinc-500 hover:text-zinc-300 disabled:opacity-50 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    {loadingMore
                      ? <><RefreshCw className="w-3 h-3 animate-spin" />Loading…</>
                      : "Load more"}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
