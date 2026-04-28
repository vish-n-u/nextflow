"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorProps {
  error:  Error & { digest?: string };
  reset:  () => void;
}

/**
 * Dashboard error boundary — shown when an unhandled error bubbles up from
 * the dashboard subtree. Logs the error and gives the user a retry option.
 */
export default function DashboardError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log to an error reporting service in production (e.g. Sentry)
    console.error("[Dashboard error]", error);
  }, [error]);

  return (
    <div className="h-full flex items-center justify-center bg-[#0a0a0a]">
      <div className="flex flex-col items-center gap-4 text-center max-w-sm px-6">
        <div className="w-12 h-12 rounded-xl bg-red-950/40 border border-red-500/30 flex items-center justify-center">
          <AlertTriangle className="w-5 h-5 text-red-400" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-zinc-100 mb-1">Something went wrong</h2>
          <p className="text-xs text-zinc-500 leading-relaxed">
            An unexpected error occurred in the dashboard.
          </p>
        </div>
        <button
          onClick={reset}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-xs font-semibold text-zinc-200 transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          Try again
        </button>
      </div>
    </div>
  );
}
