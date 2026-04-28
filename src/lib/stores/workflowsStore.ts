import { create } from "zustand";
import type { WorkflowSummary } from "@/lib/api/workflows";

const PAGE = 5;

interface WorkflowsStore {
  workflows:   WorkflowSummary[];
  hasMore:     boolean;
  loading:     boolean;
  loadingMore: boolean;
  error:       string | null;
  initialized: boolean;
  stale:       boolean;
  _offset:     number;

  /** Fetch page 0. No-ops if already initialized and not stale. */
  fetch:      () => Promise<void>;
  /** Append next page. */
  fetchMore:  () => Promise<void>;
  /** Mark data as stale so the next fetch() reloads from page 0. */
  invalidate: () => void;
}

export const useWorkflowsStore = create<WorkflowsStore>((set, get) => ({
  workflows:   [],
  hasMore:     false,
  loading:     false,
  loadingMore: false,
  error:       null,
  initialized: false,
  stale:       true,
  _offset:     0,

  fetch: async () => {
    const { loading, initialized, stale } = get();
    if (loading || (initialized && !stale)) return;

    set({ loading: true, error: null });
    try {
      const res = await fetch(`/api/workflows?limit=${PAGE}&offset=0`);
      if (!res.ok) throw new Error("Failed to load workflows");
      const data = await res.json() as WorkflowSummary[];
      set({ workflows: data, hasMore: data.length === PAGE, _offset: data.length, initialized: true, stale: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to load workflows" });
    } finally {
      set({ loading: false });
    }
  },

  fetchMore: async () => {
    const { loadingMore, hasMore, _offset } = get();
    if (loadingMore || !hasMore) return;

    set({ loadingMore: true });
    try {
      const res = await fetch(`/api/workflows?limit=${PAGE}&offset=${_offset}`);
      if (!res.ok) throw new Error("Failed to load workflows");
      const data = await res.json() as WorkflowSummary[];
      set((s) => ({
        workflows: [...s.workflows, ...data],
        hasMore:   data.length === PAGE,
        _offset:   s._offset + data.length,
      }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to load workflows" });
    } finally {
      set({ loadingMore: false });
    }
  },

  invalidate: () => set({ stale: true }),
}));
