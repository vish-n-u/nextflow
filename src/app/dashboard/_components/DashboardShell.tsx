"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { Node, Edge } from "@xyflow/react";
import { runs, auth } from "@trigger.dev/sdk/v3";
import { TopBar }           from "./TopBar";
import { LeftBar }          from "./LeftBar";
import { FlowCanvas }       from "./FlowCanvas";
import { RightBar }         from "./RightBar";
import { getNodeMeta }        from "@/lib/nodeRegistry";
import { useRunsStore }       from "@/lib/stores/runsStore";
import { useWorkflowsStore }  from "@/lib/stores/workflowsStore";

export function DashboardShell({ initialWorkflowId }: { initialWorkflowId?: string } = {}) {
  const [workflowName, setWorkflowName] = useState("");
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  // Mobile sidebar drawer state
  const [leftBarOpen, setLeftBarOpen] = useState(false);
  const [rightBarOpen, setRightBarOpen] = useState(false);

  // { type, ts } — ts changes on every click so the effect always fires
  const [nodeToAdd, setNodeToAdd] = useState<{ type: string; ts: number } | null>(null);

  const handleNodeAdd   = useCallback((type: string) => setNodeToAdd({ type, ts: Date.now() }), []);
  const handleNodeAdded = useCallback(() => setNodeToAdd(null), []);

  // ── Orchestrator / workflow-level run ──────────────────────────────────────
  const runWorkflowFnRef = useRef<
    ((subset?: { nodes: Node[]; edges: Edge[] }) => Promise<{ runId: string; publicToken: string; nodes: Node[]; edges: Edge[] }>) | null
  >(null);
  const getSnapshotFnRef         = useRef<(() => { nodes: Node[]; edges: Edge[] }) | null>(null);
  const getSelectedNodesFnRef    = useRef<(() => { nodes: Node[]; edges: Edge[] }) | null>(null);
  const loadWorkflowFnRef        = useRef<((nodes: Node[], edges: Edge[]) => void) | null>(null);
  const pendingWorkflowRef       = useRef<{ id: string; name: string; nodes: Node[]; edges: Edge[] } | null>(null);
  const [selectedCount, setSelectedCount] = useState(0);

  const handleRegisterRunWorkflow = useCallback(
    (fn: (subset?: { nodes: Node[]; edges: Edge[] }) => Promise<{ runId: string; publicToken: string; nodes: Node[]; edges: Edge[] }>) => {
      runWorkflowFnRef.current = fn;
    },
    [],
  );

  const handleRegisterGetSelectedNodes = useCallback(
    (fn: () => { nodes: Node[]; edges: Edge[] }) => { getSelectedNodesFnRef.current = fn; },
    [],
  );

  const handleRegisterGetSnapshot = useCallback(
    (fn: () => { nodes: Node[]; edges: Edge[] }) => { getSnapshotFnRef.current = fn; },
    [],
  );

  const handleRegisterLoadWorkflow = useCallback(
    (fn: (nodes: Node[], edges: Edge[]) => void) => {
      loadWorkflowFnRef.current = fn;
      // If a workflow was fetched before the canvas was ready, load it now
      if (pendingWorkflowRef.current) {
        const w = pendingWorkflowRef.current;
        pendingWorkflowRef.current = null;
        setActiveWorkflowId(w.id);
        setWorkflowName(w.name);
        fn(w.nodes, w.edges);
      }
    },
    [],
  );

  const [workflowStatus,   setWorkflowStatus]   = useState<"idle" | "running" | "success" | "error">("idle");
  const [workflowRun,      setWorkflowRun]      = useState<{ runId: string; publicToken: string } | null>(null);
  const [saveStatus,       setSaveStatus]       = useState<"idle" | "saving" | "saved" | "error">("idle");
  const invalidateRuns      = useRunsStore((s) => s.invalidate);
  const invalidateWorkflows = useWorkflowsStore((s) => s.invalidate);
  const [runError,         setRunError]         = useState<string | null>(null);
  const savedWorkflowIdRef = useRef<string | null>(null);
  const dbRunIdRef = useRef<string | null>(null);

  const setActiveWorkflowId = (id: string | null) => {
    savedWorkflowIdRef.current = id;
  };

  // Auto-load workflow when arriving via /dashboard/[id]
  useEffect(() => {
    if (!initialWorkflowId) return;
    fetch(`/api/workflows/${initialWorkflowId}`)
      .then((r) => r.json())
      .then((w: { id: string; name: string; nodes: Node[]; edges: Edge[] }) => {
        setWorkflowName(w.name);
        if (loadWorkflowFnRef.current) {
          setActiveWorkflowId(w.id);
          loadWorkflowFnRef.current(w.nodes, w.edges);
        } else {
          // Canvas not mounted yet — stash and load when it registers
          pendingWorkflowRef.current = w;
          setActiveWorkflowId(w.id);
        }
      })
      .catch(() => { /* ignore — canvas stays blank */ });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialWorkflowId]);

  const handleSave = useCallback(async () => {
    if (!getSnapshotFnRef.current || saveStatus === "saving") return;
    setSaveStatus("saving");
    const { nodes, edges } = getSnapshotFnRef.current();
    try {
      const res = await fetch("/api/workflows", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflowId: savedWorkflowIdRef.current ?? undefined,
          name:       workflowName || "Untitled",
          nodes: nodes.map((n) => {
            // Strip transient runtime fields — only persist config/input data
            const {
              status, output, errorMessage,
              runId, publicToken, dbRunId,
              fileBase64, previewUrl,
              ...configData
            } = n.data as Record<string, unknown>;
            void status; void output; void errorMessage;
            void runId; void publicToken; void dbRunId;
            void fileBase64; void previewUrl;
            return { id: n.id, type: n.type ?? "", data: configData, position: n.position };
          }),
          edges: edges.map((e) => ({
            id:           e.id,
            source:       e.source,
            target:       e.target,
            sourceHandle: e.sourceHandle ?? null,
            targetHandle: e.targetHandle ?? "",
          })),
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      const { id } = await res.json() as { id: string };
      setActiveWorkflowId(id);
      setSaveStatus("saved");
      invalidateWorkflows();
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  }, [saveStatus, workflowName]);

  const handleRunWorkflow = useCallback(async () => {
    if (!runWorkflowFnRef.current || workflowStatus === "running") return;

    // Decide subgraph: use selected nodes if any, else run all
    const isPartial = selectedCount > 0;
    const subgraph  = isPartial ? getSelectedNodesFnRef.current?.() : undefined;
    const { nodes: allNodes, edges: allEdges } = getSnapshotFnRef.current?.() ?? { nodes: [], edges: [] };

    // Validate the nodes that will actually run
    const nodesToValidate = isPartial ? (subgraph?.nodes ?? []) : allNodes;
    const errors: string[] = [];
    for (const node of nodesToValidate) {
      const meta = getNodeMeta(node.type ?? "");
      if (!meta) continue;
      const connectedHandles = new Set(
        allEdges.filter((e) => e.target === node.id).map((e) => e.targetHandle ?? ""),
      );
      const err = meta.validate(node.data as Record<string, unknown>, connectedHandles);
      if (err) errors.push(`${meta.label}: ${err}`);
    }
    if (errors.length > 0) {
      setRunError(errors.join(" · "));
      setTimeout(() => setRunError(null), 5000);
      return;
    }

    setRunError(null);
    setWorkflowStatus("running");
    try {
      const result = await runWorkflowFnRef.current(subgraph);
      setWorkflowRun({ runId: result.runId, publicToken: result.publicToken });

      const scope = isPartial ? "partial" : "full";
      const dbRes = await fetch("/api/runs", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          triggerRunId: result.runId,
          workflowName: workflowName || "Untitled",
          scope,
          workflowId:   savedWorkflowIdRef.current ?? undefined,
          nodes: result.nodes.map((n) => {
            const data = n.data as Record<string, unknown>;
            if (n.type === "uploadVideoNode") {
              const { fileBase64, previewUrl, ...rest } = data;
              void fileBase64; void previewUrl;
              return { id: n.id, type: n.type ?? "", data: rest };
            }
            return { id: n.id, type: n.type ?? "", data };
          }),
          edges: result.edges.map((e) => ({
            id:           e.id,
            source:       e.source,
            target:       e.target,
            sourceHandle: e.sourceHandle ?? null,
            targetHandle: e.targetHandle ?? "",
          })),
        }),
      });
      if (dbRes.ok) {
        const { id } = await dbRes.json() as { id: string };
        dbRunIdRef.current = id;
        invalidateRuns();
      }
    } catch {
      setWorkflowStatus("error");
    }
  }, [workflowStatus, workflowName, selectedCount]);

  // Reset button back to idle after success/error
  useEffect(() => {
    if (workflowStatus !== "success" && workflowStatus !== "error") return;
    const t = setTimeout(() => setWorkflowStatus("idle"), 6000);
    return () => clearTimeout(t);
  }, [workflowStatus]);

  // Subscribe to the orchestrator run, update top-level status, and persist completion
  useEffect(() => {
    if (!workflowRun) return;
    const { runId, publicToken } = workflowRun;
    let mounted = true;

    void auth.withAuth({ accessToken: publicToken }, async () => {
      for await (const run of runs.subscribeToRun(runId)) {
        if (!mounted) break;

        const isTerminal = run.isCompleted || run.isFailed;
        if (!isTerminal) continue;

        const nodeStatuses  = run.metadata?.nodeStatuses  as Record<string, string>  | undefined ?? {};
        const nodeOutputs   = run.metadata?.nodeOutputs   as Record<string, unknown> | undefined ?? {};
        const nodeErrors    = run.metadata?.nodeErrors    as Record<string, string>  | undefined ?? {};
        const nodeDurations = run.metadata?.nodeDurations as Record<string, number>  | undefined ?? {};

        const hasSuccesses = Object.values(nodeStatuses).some((s) => s === "success");
        const finalStatus  = run.isFailed
          ? (hasSuccesses ? "partial" : "failed")
          : "success";

        const nodeResults: Record<string, {
          status: "pending" | "running" | "success" | "failed";
          output?: unknown;
          error?:  string;
          durationMs?: number;
        }> = {};
        for (const nodeId of Object.keys(nodeStatuses)) {
          const raw = nodeStatuses[nodeId];
          nodeResults[nodeId] = {
            status:     raw === "error" ? "failed" : (raw as "pending" | "running" | "success" | "failed"),
            output:     nodeOutputs[nodeId],
            error:      nodeErrors[nodeId],
            durationMs: nodeDurations[nodeId],
          };
        }

        if (run.isCompleted) setWorkflowStatus("success");
        if (run.isFailed)    setWorkflowStatus("error");
        setWorkflowRun(null);

        if (dbRunIdRef.current) {
          await fetch(`/api/runs/${dbRunIdRef.current}`, {
            method:  "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              status:      finalStatus,
              completedAt: new Date().toISOString(),
              nodeResults,
            }),
          });
          dbRunIdRef.current = null;
          invalidateRuns();
        }

        break;
      }
    });

    return () => { mounted = false; };
  }, [workflowRun]);

  return (
    <>
    <div className="h-full flex flex-col bg-[#0a0a0a] overflow-hidden">
      <TopBar
        workflowName={workflowName}
        onWorkflowNameChange={setWorkflowName}
        workflowStatus={workflowStatus}
        onRunWorkflow={handleRunWorkflow}
        saveStatus={saveStatus}
        onSave={handleSave}
        onToggleLeftBar={() => setLeftBarOpen((v) => !v)}
        onToggleRightBar={() => setRightBarOpen((v) => !v)}
        runError={runError}
        selectedCount={selectedCount}
      />
      <div className="flex flex-1 overflow-hidden relative">
        {/* Starting toast */}
        {workflowStatus === "running" && !workflowRun && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-3 rounded-full bg-zinc-900 border border-yellow-500/30 shadow-2xl shadow-yellow-500/10 pointer-events-none">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-yellow-400" />
            </span>
            <span className="text-sm text-yellow-200 font-medium tracking-wide">Workflow starting…</span>
          </div>
        )}
        <LeftBar
          onNodeAdd={handleNodeAdd}
          isOpen={leftBarOpen}
          onClose={() => setLeftBarOpen(false)}
        />
        <FlowCanvas
          nodeToAdd={nodeToAdd}
          onNodeAdded={handleNodeAdded}
          onNodeSelect={setSelectedNode}
          onRegisterRunWorkflow={handleRegisterRunWorkflow}
          onRegisterGetSnapshot={handleRegisterGetSnapshot}
          onRegisterGetSelectedNodes={handleRegisterGetSelectedNodes}
          onRegisterLoadWorkflow={handleRegisterLoadWorkflow}
          onSelectedCountChange={setSelectedCount}
          onRunSelected={handleRunWorkflow}
          workflowRun={workflowRun}
          isWorkflowRunning={workflowStatus === "running"}
        />
        <RightBar
          selectedNode={selectedNode}
          isOpen={rightBarOpen}
          onClose={() => setRightBarOpen(false)}
        />
      </div>
    </div>

    </>
  );
}
