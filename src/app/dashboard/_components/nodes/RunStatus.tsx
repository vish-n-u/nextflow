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

    void auth.withAuth({ accessToken: publicToken }, async () => {
      for await (const run of runs.subscribeToRun(runId)) {
        if (!mounted) break;

        const isCompleted = run.isCompleted;
        const isFailed    = run.isFailed;
        if (!isCompleted && !isFailed) continue;

        if (isCompleted) {
          updateNodeData(nodeId, {
            output:      run.output,
            status:      NodeStatus.Success,
            runId:       null,
            publicToken: null,
          });
        } else {
          updateNodeData(nodeId, {
            status:      NodeStatus.Error,
            runId:       null,
            publicToken: null,
          });
        }

        const currentDbRunId = dbRunIdRef.current;
        if (currentDbRunId) {
          void fetch(`/api/runs/${currentDbRunId}`, {
            method:  "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              status:      isCompleted ? "success" : "failed",
              completedAt: new Date().toISOString(),
              nodeResults: {
                [nodeId]: {
                  status: isCompleted ? "success" : "failed",
                  output: isCompleted ? (run.output as object | undefined) : undefined,
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

    return () => { mounted = false; };
  }, [runId, publicToken, nodeId, updateNodeData]);

  return null;
}
