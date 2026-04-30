import { create } from "zustand";
import type { AppSummary } from "@/lib/api/apps/list-apps";

const PAGE = 10;

interface AppsStore {
  apps:        AppSummary[];
  hasMore:     boolean;
  loading:     boolean;
  loadingMore: boolean;
  error:       string | null;
  initialized: boolean;

  fetch:      () => Promise<void>;
  fetchMore:  () => Promise<void>;
}

export const useAppsStore = create<AppsStore>((set, get) => ({
  apps:        [],
  hasMore:     false,
  loading:     false,
  loadingMore: false,
  error:       null,
  initialized: false,

  fetch: async () => {
    const { loading, initialized } = get();
    if (loading || initialized) return;

    set({ loading: true, error: null });
    try {
      const res = await fetch(`/api/apps?limit=${PAGE}&offset=0`);
      if (!res.ok) throw new Error("Failed to load apps");
      const data = await res.json() as AppSummary[];
      set({ apps: data, hasMore: data.length === PAGE, initialized: true });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to load apps" });
    } finally {
      set({ loading: false });
    }
  },

  fetchMore: async () => {
    const { loadingMore, hasMore, apps } = get();
    if (loadingMore || !hasMore) return;

    set({ loadingMore: true });
    try {
      const res = await fetch(`/api/apps?limit=${PAGE}&offset=${apps.length}`);
      if (!res.ok) throw new Error("Failed to load apps");
      const data = await res.json() as AppSummary[];
      set((s) => ({
        apps:    [...s.apps, ...data],
        hasMore: data.length === PAGE,
      }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to load apps" });
    } finally {
      set({ loadingMore: false });
    }
  },
}));
