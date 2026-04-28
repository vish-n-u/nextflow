// ── Raw DB shape (matches the Prisma select in get-runs.ts) ──────────────────

interface NodeRunRecord {
  id:          string;
  nodeId:      string;
  nodeType:    string;
  status:      string;
  input:       unknown;
  output:      unknown;
  error:       string | null;
  durationMs:  number | null;
  startedAt:   Date;
  completedAt: Date | null;
}

export interface RunWithDetails {
  id:          string;
  status:      string;
  scope:       string;
  startedAt:   Date;
  completedAt: Date | null;
  durationMs:  number | null;
  workflow:    { name: string } | null;
  nodeRuns:    NodeRunRecord[];
}

// ── Public API response shapes ────────────────────────────────────────────────

export interface NodeRunResponse {
  id:          string;
  nodeId:      string;
  nodeType:    string;
  status:      string;
  input:       unknown;
  output:      unknown;
  error:       string | null;
  durationMs:  number | null;
  startedAt:   string;
  completedAt: string | null;
}

export interface RunResponse {
  id:           string;
  status:       string;
  scope:        string;
  startedAt:    string;
  completedAt:  string | null;
  durationMs:   number | null;
  workflowName: string;
  nodeRuns:     NodeRunResponse[];
}

// ── Transformers ──────────────────────────────────────────────────────────────
// Prisma returns Date objects; JSON.stringify would silently coerce them to
// strings in unpredictable formats. These helpers convert explicitly to ISO
// strings and flatten the workflow relation so the client gets a flat shape.

function transformNodeRun(n: NodeRunRecord): NodeRunResponse {
  return {
    id:          n.id,
    nodeId:      n.nodeId,
    nodeType:    n.nodeType,
    status:      n.status,
    input:       n.input,
    output:      n.output,
    error:       n.error,
    durationMs:  n.durationMs,
    startedAt:   n.startedAt.toISOString(),
    completedAt: n.completedAt?.toISOString() ?? null,
  };
}

export function transformRun(run: RunWithDetails): RunResponse {
  return {
    id:           run.id,
    status:       run.status,
    scope:        run.scope,
    startedAt:    run.startedAt.toISOString(),
    completedAt:  run.completedAt?.toISOString() ?? null,
    durationMs:   run.durationMs ?? null,
    workflowName: run.workflow?.name ?? "Single Node Run",
    nodeRuns:     run.nodeRuns.map(transformNodeRun),
  };
}
