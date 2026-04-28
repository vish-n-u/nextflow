"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { Node, Edge } from "@xyflow/react";
import { runs, auth } from "@trigger.dev/sdk/v3";
import { TopBar }      from "./TopBar";
import { LeftBar }     from "./LeftBar";
import { FlowCanvas }  from "./FlowCanvas";
import { RightBar }    from "./RightBar";

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

  console.log("DashboardShell rendered", { workflowName, selectedNode, nodeToAdd });

  // ── Orchestrator / workflow-level run ──────────────────────────────────────
  const runWorkflowFnRef = useRef<
    (() => Promise<{ runId: string; publicToken: string; nodes: Node[]; edges: Edge[] }>) | null
  >(null);
  const getSnapshotFnRef = useRef<(() => { nodes: Node[]; edges: Edge[] }) | null>(null);

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

  const [workflowStatus, setWorkflowStatus] = useState<"idle" | "running" | "success" | "error">("idle");
  const [workflowRun,    setWorkflowRun]    = useState<{ runId: string; publicToken: string } | null>(null);
  const [historyKey,     setHistoryKey]     = useState(0);
  const [saveStatus,     setSaveStatus]     = useState<"idle" | "saving" | "saved" | "error">("idle");
  const savedWorkflowIdRef = useRef<string | null>(null);
  const dbRunIdRef         = useRef<string | null>(null);

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
            return { id: n.id, type: n.type ?? "", data: configData };
          }),
          edges: edges.map((e) => ({
            source:       e.source,
            target:       e.target,
            targetHandle: e.targetHandle ?? "",
          })),
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      const { id } = await res.json() as { id: string };
      savedWorkflowIdRef.current = id;
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  }, [saveStatus, workflowName]);

  const handleRunWorkflow = useCallback(async () => {
    if (!runWorkflowFnRef.current || workflowStatus === "running") return;
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
          nodes: result.nodes.map((n) => ({ id: n.id, type: n.type ?? "", data: n.data })),
          edges: result.edges.map((e) => ({
            source:       e.source,
            target:       e.target,
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
    <div className="h-screen flex flex-col bg-[#0a0a0a] overflow-hidden">
      <TopBar
        workflowName={workflowName}
        onWorkflowNameChange={setWorkflowName}
        workflowStatus={workflowStatus}
        onRunWorkflow={handleRunWorkflow}
        saveStatus={saveStatus}
        onSave={handleSave}
        onToggleLeftBar={() => setLeftBarOpen((v) => !v)}
        onToggleRightBar={() => setRightBarOpen((v) => !v)}
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
  );
}
