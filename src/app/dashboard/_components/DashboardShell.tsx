"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { Node } from "@xyflow/react";
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
  const runWorkflowFnRef = useRef<(() => Promise<{ runId: string; publicToken: string }>) | null>(null);
  const handleRegisterRunWorkflow = useCallback(
    (fn: () => Promise<{ runId: string; publicToken: string }>) => { runWorkflowFnRef.current = fn; },
    [],
  );

  const [workflowStatus, setWorkflowStatus] = useState<"idle" | "running" | "success" | "error">("idle");
  const [workflowRun, setWorkflowRun] = useState<{ runId: string; publicToken: string } | null>(null);

  const handleRunWorkflow = useCallback(async () => {
    if (!runWorkflowFnRef.current || workflowStatus === "running") return;
    setWorkflowStatus("running");
    try {
      const result = await runWorkflowFnRef.current();
      setWorkflowRun(result);
    } catch {
      setWorkflowStatus("error");
    }
  }, [workflowStatus]);

  // Subscribe to the orchestrator run and update top-level status
  useEffect(() => {
    if (!workflowRun) return;
    const { runId, publicToken } = workflowRun;
    let mounted = true;

    void auth.withAuth({ accessToken: publicToken }, async () => {
      for await (const run of runs.subscribeToRun(runId)) {
        if (!mounted) break;
        if (run.isCompleted) {
          setWorkflowStatus("success");
          setWorkflowRun(null);
          break;
        }
        if (run.isFailed) {
          setWorkflowStatus("error");
          setWorkflowRun(null);
          break;
        }
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
          workflowRun={workflowRun}
        />
        <RightBar
          selectedNode={selectedNode}
          isOpen={rightBarOpen}
          onClose={() => setRightBarOpen(false)}
        />
      </div>
    </div>
  );
}
