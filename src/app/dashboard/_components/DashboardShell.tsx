"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { Node, Edge } from "@xyflow/react";
import { runs, auth } from "@trigger.dev/sdk/v3";
import { TopBar }           from "./TopBar";
import { LeftBar }          from "./LeftBar";
import { FlowCanvas }       from "./FlowCanvas";
import { RightBar }         from "./RightBar";
import { WorkflowsModal }   from "./WorkflowsModal";
import { getNodeMeta }      from "@/lib/nodeRegistry";

export function DashboardShell() {
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
    (() => Promise<{ runId: string; publicToken: string; nodes: Node[]; edges: Edge[] }>) | null
  >(null);
  const getSnapshotFnRef    = useRef<(() => { nodes: Node[]; edges: Edge[] }) | null>(null);
  const loadWorkflowFnRef   = useRef<((nodes: Node[], edges: Edge[]) => void) | null>(null);

  const handleRegisterRunWorkflow = useCallback(
    (fn: () => Promise<{ runId: string; publicToken: string; nodes: Node[]; edges: Edge[] }>) => {
      runWorkflowFnRef.current = fn;
    },
    [],
  );

  const handleRegisterGetSnapshot = useCallback(
    (fn: () => { nodes: Node[]; edges: Edge[] }) => { getSnapshotFnRef.current = fn; },
    [],
  );

  const handleRegisterLoadWorkflow = useCallback(
    (fn: (nodes: Node[], edges: Edge[]) => void) => { loadWorkflowFnRef.current = fn; },
    [],
  );

  const [workflowStatus,   setWorkflowStatus]   = useState<"idle" | "running" | "success" | "error">("idle");
  const [workflowRun,      setWorkflowRun]      = useState<{ runId: string; publicToken: string } | null>(null);
  const [historyKey,       setHistoryKey]       = useState(0);
  const [saveStatus,       setSaveStatus]       = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [openModalVisible, setOpenModalVisible] = useState(false);
  const [runError,         setRunError]         = useState<string | null>(null);
  const STORAGE_KEY = "nextflow:activeWorkflowId";
  const savedWorkflowIdRef = useRef<string | null>(
    typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null,
  );
  const dbRunIdRef = useRef<string | null>(null);

  // Keep localStorage in sync with the ref
  const setActiveWorkflowId = (id: string | null) => {
    savedWorkflowIdRef.current = id;
    if (id) localStorage.setItem(STORAGE_KEY, id);
    else     localStorage.removeItem(STORAGE_KEY);
  };

  const handleLoad = useCallback((workflow: { id: string; name: string; nodes: unknown; edges: unknown }) => {
    // Always record the active workflow ID first — even if the canvas fn isn't
    // registered yet, subsequent saves must target this workflow.
    setActiveWorkflowId(workflow.id);
    setWorkflowName(workflow.name);
    setWorkflowStatus("idle");
    setWorkflowRun(null);
    setOpenModalVisible(false);
    loadWorkflowFnRef.current?.(workflow.nodes as Node[], workflow.edges as Edge[]);
  }, []);

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
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  }, [saveStatus, workflowName]);

  const handleRunWorkflow = useCallback(async () => {
    if (!runWorkflowFnRef.current || workflowStatus === "running") return;

    // Validate all nodes before starting
    if (getSnapshotFnRef.current) {
      const { nodes, edges } = getSnapshotFnRef.current();
      const errors: string[] = [];
      for (const node of nodes) {
        const meta = getNodeMeta(node.type ?? "");
        if (!meta) continue;
        const connectedHandles = new Set(
          edges.filter((e) => e.target === node.id).map((e) => e.targetHandle ?? ""),
        );
        const err = meta.validate(node.data as Record<string, unknown>, connectedHandles);
        if (err) errors.push(`${meta.label}: ${err}`);
      }
      if (errors.length > 0) {
        setRunError(errors.join(" · "));
        setTimeout(() => setRunError(null), 5000);
        return;
      }
    }

    setRunError(null);
    setWorkflowStatus("running");
    try {
      const result = await runWorkflowFnRef.current();
      setWorkflowRun({ runId: result.runId, publicToken: result.publicToken });

      // Persist the run to the DB (fire and store the returned id)
      const dbRes = await fetch("/api/runs", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          triggerRunId: result.runId,
          workflowName: workflowName || "Untitled",
          scope:        "full",
          workflowId:   savedWorkflowIdRef.current ?? undefined,
          nodes: result.nodes.map((n) => {
            const data = n.data as Record<string, unknown>;
            // Strip video binary from DB — fileBase64 can be MBs; execution already
            // has it via the orchestrator payload so stripping here is safe.
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
        setHistoryKey((k) => k + 1);
      }
    } catch {
      setWorkflowStatus("error");
    }
  }, [workflowStatus, workflowName]);

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

        const hasFailures  = Object.values(nodeStatuses).some((s) => s === "error");
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
          setHistoryKey((k) => k + 1);
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
        onOpenWorkflows={() => setOpenModalVisible(true)}
        onToggleLeftBar={() => setLeftBarOpen((v) => !v)}
        onToggleRightBar={() => setRightBarOpen((v) => !v)}
        runError={runError}
      />
      <div className="flex flex-1 overflow-hidden relative">
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
          onRegisterLoadWorkflow={handleRegisterLoadWorkflow}
          workflowRun={workflowRun}
          isWorkflowRunning={workflowStatus === "running"}
        />
        <RightBar
          selectedNode={selectedNode}
          isOpen={rightBarOpen}
          onClose={() => setRightBarOpen(false)}
          historyKey={historyKey}
        />
      </div>
    </div>

    {openModalVisible && (
      <WorkflowsModal
        onLoad={handleLoad}
        onClose={() => setOpenModalVisible(false)}
      />
    )}
    </>
  );
}
