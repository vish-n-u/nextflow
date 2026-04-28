"use client";

import { useEffect, useRef } from "react";
import { useReactFlow } from "@xyflow/react";
import { runs, auth } from "@trigger.dev/sdk/v3";
import { NodeStatus } from "./nodeStatus";

interface RunStatusProps {
  nodeId:      string;
  runId:       string;
  publicToken: string;
  dbRunId?:    string | null;
}

/**
 * Render-nothing component. Subscribes to a Trigger.dev run, writes the
 * result back into node data, and persists the outcome to the DB via PATCH
 * when a dbRunId is provided (single-node runs).
 */
export function RunStatus({ nodeId, runId, publicToken, dbRunId }: RunStatusProps) {
  const { updateNodeData } = useReactFlow();

  // Keep a ref so the async loop always reads the latest dbRunId even if the
  // prop arrives after the subscription has already started.
  const dbRunIdRef = useRef(dbRunId);
  useEffect(() => { dbRunIdRef.current = dbRunId; }, [dbRunId]);

  useEffect(() => {
    let mounted = true;

    // Terminal error states beyond isFailed (CRASHED, TIMED_OUT, CANCELED, etc.)
    const ERROR_STATUSES = new Set([
      "FAILED", "CRASHED", "TIMED_OUT", "CANCELED",
      "INTERRUPTED", "SYSTEM_FAILURE", "EXPIRED",
    ]);

    const run = async () => {
      try {
        await auth.withAuth({ accessToken: publicToken }, async () => {
          for await (const r of runs.subscribeToRun(runId)) {
            if (!mounted) break;

            const isSuccess  = r.isCompleted;
            // Treat any known terminal error state as failed
            const isError    = r.isFailed || ERROR_STATUSES.has(r.status?.toUpperCase?.() ?? "");
            if (!isSuccess && !isError) continue;

            if (isSuccess) {
              updateNodeData(nodeId, {
                output:      r.output,
                status:      NodeStatus.Success,
                runId:       null,
                publicToken: null,
              });
            } else {
              updateNodeData(nodeId, {
                status:       NodeStatus.Error,
                errorMessage: `Task ${r.status ?? "failed"} — check Trigger.dev dashboard for details.`,
                runId:        null,
                publicToken:  null,
              });
            }

            const currentDbRunId = dbRunIdRef.current;
            if (currentDbRunId) {
              void fetch(`/api/runs/${currentDbRunId}`, {
                method:  "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  status:      isSuccess ? "success" : "failed",
                  completedAt: new Date().toISOString(),
                  nodeResults: {
                    [nodeId]: {
                      status: isSuccess ? "success" : "failed",
                      output: isSuccess ? (r.output as object | undefined) : undefined,
                    },
                  },
                }),
              }).then(() => {
                window.dispatchEvent(new CustomEvent("nextflow:run-complete"));
              });
            }

            break;
          }
        });
      } catch (err) {
        // Subscription itself threw (expired token, network failure, etc.)
        // Surface this as a node error so the UI never stays stuck in "Running"
        if (!mounted) return;
        updateNodeData(nodeId, {
          status:       NodeStatus.Error,
          errorMessage: err instanceof Error ? err.message : "Lost connection to task runner.",
          runId:        null,
          publicToken:  null,
        });
      }
    };

    void run();

    return () => { mounted = false; };
  }, [runId, publicToken, nodeId, updateNodeData]);

  return null;
}
