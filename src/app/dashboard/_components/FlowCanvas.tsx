"use client";

import "@xyflow/react/dist/style.css";
import { useCallback, useEffect, useRef } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type Edge,
  type Connection,
  type IsValidConnection,
} from "@xyflow/react";

import { runs, auth } from "@trigger.dev/sdk/v3";
import { COMPONENT_REGISTRY } from "./nodes/componentRegistry";
import { getNodeMeta } from "@/lib/nodeRegistry";
import { isValidHandleConnection } from "@/lib/nodeContracts";

const nodeTypes = COMPONENT_REGISTRY;

function getDefaultData(type: string): Record<string, unknown> {
  return getNodeMeta(type)?.defaultData ?? {};
}

// ─── History ──────────────────────────────────────────────────────────────────

type Snapshot = { nodes: Node[]; edges: Edge[] };

// ─── Inner component (lives inside ReactFlowProvider) ────────────────────────

interface FlowCanvasInnerProps {
  nodeToAdd: { type: string; ts: number } | null;
  onNodeAdded: () => void;
  onNodeSelect: (node: Node | null) => void;
  onRegisterRunWorkflow: (fn: () => Promise<{ runId: string; publicToken: string }>) => void;
  workflowRun: { runId: string; publicToken: string } | null;
}

function FlowCanvasInner({ nodeToAdd, onNodeAdded, onNodeSelect, onRegisterRunWorkflow, workflowRun }: FlowCanvasInnerProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const { screenToFlowPosition, getNode, updateNodeData } = useReactFlow();

  // Keep refs to latest state for the workflow-run fn and history saves
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  useEffect(() => { edgesRef.current = edges; }, [edges]);

  // ── Undo / redo ─────────────────────────────────────────────────────────────
  const history    = useRef<Snapshot[]>([{ nodes: [], edges: [] }]);
  const historyIdx = useRef(0);
  const isRestoring = useRef(false);

  // Debounced auto-save: fires after every nodes/edges change except during restore
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (isRestoring.current) {
      isRestoring.current = false;
      return;
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      history.current = history.current.slice(0, historyIdx.current + 1);
      history.current.push({ nodes, edges });
      historyIdx.current = history.current.length - 1;
    }, 300);
  }, [nodes, edges]); // eslint-disable-line react-hooks/exhaustive-deps

  const undo = useCallback(() => {
    if (historyIdx.current <= 0) return;
    historyIdx.current--;
    const snap = history.current[historyIdx.current];
    isRestoring.current = true;
    setNodes(snap.nodes);
    setEdges(snap.edges);
  }, [setNodes, setEdges]);

  const redo = useCallback(() => {
    if (historyIdx.current >= history.current.length - 1) return;
    historyIdx.current++;
    const snap = history.current[historyIdx.current];
    isRestoring.current = true;
    setNodes(snap.nodes);
    setEdges(snap.edges);
  }, [setNodes, setEdges]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      if (e.key === "y" || (e.key === "z" && e.shiftKey)) { e.preventDefault(); redo(); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undo, redo]);

  // ── Node add ─────────────────────────────────────────────────────────────────
  const addNode = useCallback(
    (type: string, position: { x: number; y: number }) => {
      const newNode: Node = {
        id:   `${type}-${Date.now()}`,
        type,
        position,
        data: getDefaultData(type),
      };
      setNodes((nds) => [...nds, newNode]);
    },
    [setNodes],
  );

  useEffect(() => {
    if (!nodeToAdd) return;
    const position = screenToFlowPosition({
      x: window.innerWidth  / 2,
      y: window.innerHeight / 2,
    });
    addNode(nodeToAdd.type, position);
    onNodeAdded();
  }, [nodeToAdd]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Connection validation ────────────────────────────────────────────────────
  const isValidConnection = useCallback<IsValidConnection>(
    (connection) => {
      const src = getNode(connection.source);
      const tgt = getNode(connection.target);
      if (!src || !tgt) return false;
      return isValidHandleConnection(
        src.type ?? "",
        connection.sourceHandle ?? "output",
        tgt.type ?? "",
        connection.targetHandle ?? "",
      );
    },
    [getNode],
  );

  // ── Edge connect ─────────────────────────────────────────────────────────────
  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
    [setEdges],
  );

  // ── Workflow run ─────────────────────────────────────────────────────────────
  const runWorkflow = useCallback(async (): Promise<{ runId: string; publicToken: string }> => {
    const res = await fetch("/api/nodes/run", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nodeType: "orchestrator",
        data: {
          nodes: nodesRef.current.map((n) => ({ id: n.id, type: n.type ?? "", data: n.data })),
          edges: edgesRef.current.map((e) => ({ source: e.source, target: e.target, targetHandle: e.targetHandle ?? ""  })),
        },
      }),
    });
    if (!res.ok) throw new Error("Failed to start workflow");
    return res.json() as Promise<{ runId: string; publicToken: string }>;
  }, []);

  useEffect(() => {
    onRegisterRunWorkflow(runWorkflow);
  }, [runWorkflow, onRegisterRunWorkflow]);

  // ── Workflow node-status glows ───────────────────────────────────────────────
  useEffect(() => {
    if (!workflowRun) return;
    const { runId, publicToken } = workflowRun;
    let mounted = true;
    const applied: Record<string, string> = {};

    void auth.withAuth({ accessToken: publicToken }, async () => {
      for await (const run of runs.subscribeToRun(runId)) {
        if (!mounted) break;
        const nodeStatuses = run.metadata?.nodeStatuses as Record<string, string> | undefined;
        if (nodeStatuses) {
          for (const [nodeId, status] of Object.entries(nodeStatuses)) {
            if (applied[nodeId] === status) continue;
            applied[nodeId] = status;
            updateNodeData(nodeId, { status });
          }
        }
        if (run.isCompleted || run.isFailed) break;
      }
    });

    return () => { mounted = false; };
  }, [workflowRun, updateNodeData]);

  // ── Drag-and-drop from sidebar ───────────────────────────────────────────────
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData("application/reactflow");
      if (!type) return;
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      addNode(type, position);
    },
    [addNode, screenToFlowPosition],
  );

  return (
    <div className="flex-1 h-full bg-[#0a0a0a]" onDrop={onDrop} onDragOver={onDragOver}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        isValidConnection={isValidConnection}
        onNodeClick={(_event, node) => onNodeSelect(node)}
        onPaneClick={() => onNodeSelect(null)}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={{ animated: true }}
        deleteKeyCode={["Backspace", "Delete"]}
        colorMode="dark"
        fitView={false}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1.5}
          color="#27272a"
          style={{ backgroundColor: "#0a0a0a" }}
        />
        <Controls className="!border-zinc-800 !bg-zinc-900 [&>button]:!border-zinc-800 [&>button]:!bg-zinc-900 [&>button]:!text-zinc-400 [&>button:hover]:!bg-zinc-800 [&>button:hover]:!text-zinc-100" />
        <MiniMap
          position="bottom-right"
          nodeColor="#3f3f46"
          maskColor="rgba(0,0,0,0.6)"
          style={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "0.5rem" }}
          nodeStrokeWidth={0}
          zoomable
          pannable
        />
      </ReactFlow>
    </div>
  );
}

// ─── Public export (wraps with provider) ─────────────────────────────────────

interface FlowCanvasProps {
  nodeToAdd: { type: string; ts: number } | null;
  onNodeAdded: () => void;
  onNodeSelect: (node: Node | null) => void;
  onRegisterRunWorkflow: (fn: () => Promise<{ runId: string; publicToken: string }>) => void;
  workflowRun: { runId: string; publicToken: string } | null;
}

export function FlowCanvas(props: FlowCanvasProps) {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
