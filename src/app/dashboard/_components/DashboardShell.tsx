"use client";

import { useState, useCallback } from "react";
import type { Node } from "@xyflow/react";
import { TopBar }      from "./TopBar";
import { LeftBar }     from "./LeftBar";
import { FlowCanvas }  from "./FlowCanvas";
import { RightBar }    from "./RightBar";

export function DashboardShell() {
  const [workflowName, setWorkflowName] = useState("");
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  // { type, ts } — ts changes on every click so the effect always fires
  const [nodeToAdd, setNodeToAdd] = useState<{ type: string; ts: number } | null>(null);

  const handleNodeAdd     = useCallback((type: string) => setNodeToAdd({ type, ts: Date.now() }), []);
  const handleNodeAdded   = useCallback(() => setNodeToAdd(null), []);

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0a] overflow-hidden">
      <TopBar workflowName={workflowName} onWorkflowNameChange={setWorkflowName} />
      <div className="flex flex-1 overflow-hidden">
        <LeftBar onNodeAdd={handleNodeAdd} />
        <FlowCanvas
          nodeToAdd={nodeToAdd}
          onNodeAdded={handleNodeAdded}
          onNodeSelect={setSelectedNode}
        />
        <RightBar selectedNode={selectedNode} />
      </div>
    </div>
  );
}
