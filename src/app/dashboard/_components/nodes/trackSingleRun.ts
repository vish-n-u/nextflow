interface TrackSingleRunOptions {
  triggerRunId: string;
  nodeId:       string;
  nodeType:     string;
  displayName:  string;
  data:         Record<string, unknown>;
  onDbRunId:    (dbRunId: string) => void;
}

/**
 * Creates a Run + NodeRun record in the DB for a single-node execution.
 * Called after the Trigger.dev run is started but before it completes.
 * Fires and sets dbRunId via callback when the DB write returns.
 */
export function trackSingleRun({
  triggerRunId,
  nodeId,
  nodeType,
  displayName,
  data,
  onDbRunId,
}: TrackSingleRunOptions): void {
  void (async () => {
    const res = await fetch("/api/runs", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        triggerRunId,
        workflowName: displayName,
        scope:        "single",
        nodes:        [{ id: nodeId, type: nodeType, data }],
        edges:        [],
      }),
    });
    if (!res.ok) return;
    const { id } = await res.json() as { id: string };
    onDbRunId(id);
  })();
}
