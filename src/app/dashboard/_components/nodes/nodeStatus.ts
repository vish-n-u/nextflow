"use client";

import { useEffect } from "react";
import { useReactFlow } from "@xyflow/react";

export enum NodeStatus {
  Idle    = "idle",
  Running = "running",
  Success = "success",
  Error   = "error",
}

export const STATUS_BORDER: Record<string, string> = {
  [NodeStatus.Running]: "border-amber-400/60 glow-running",
  [NodeStatus.Success]: "border-emerald-400/60 glow-success",
  [NodeStatus.Error]:   "border-red-400/60 glow-error",
};

/**
 * Auto-resets status to Idle after 5 s when a run succeeds or fails.
 * Must be called inside a component that lives within ReactFlowProvider.
 */
export function useStatusGlow(nodeId: string, status: string): void {
  const { updateNodeData } = useReactFlow();

  useEffect(() => {
    if (status !== NodeStatus.Success && status !== NodeStatus.Error) return;
    const timer = setTimeout(() => {
      updateNodeData(nodeId, { status: NodeStatus.Idle });
    }, 2000);
    return () => clearTimeout(timer);
  }, [status, nodeId, updateNodeData]);
}
