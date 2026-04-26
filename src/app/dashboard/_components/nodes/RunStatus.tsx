"use client";

import { useEffect } from "react";
import { useReactFlow } from "@xyflow/react";
import { runs, auth } from "@trigger.dev/sdk/v3";
import { NodeStatus } from "./nodeStatus";

interface RunStatusProps {
  nodeId: string;
  runId: string;
  publicToken: string;
}

/**
 * Render-nothing component. Subscribes to a Trigger.dev run and writes
 * the result back into the node's data when the run completes.
 */
export function RunStatus({ nodeId, runId, publicToken }: RunStatusProps) {
  const { updateNodeData } = useReactFlow();

  useEffect(() => {
    let mounted = true;

    void auth.withAuth({ accessToken: publicToken }, async () => {
      for await (const run of runs.subscribeToRun(runId)) {
        if (!mounted) break;

        if (run.isCompleted) {
          updateNodeData(nodeId, {
            output:      run.output,
            status:      NodeStatus.Success,
            runId:       null,
            publicToken: null,
          });
          break;
        }

        if (run.isFailed) {
          updateNodeData(nodeId, {
            status:      NodeStatus.Error,
            runId:       null,
            publicToken: null,
          });
          break;
        }
      }
    });

    return () => { mounted = false; };
  }, [runId, publicToken, nodeId, updateNodeData]);

  return null;
}
