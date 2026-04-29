"use client";

import "@xyflow/react/dist/style.css";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Panel,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  useNodes,
  useViewport,
  type Node,
  type Edge,
  type Connection,
  type IsValidConnection,
  type FitViewOptions,
  type OnSelectionChangeParams,
  SelectionMode,
} from "@xyflow/react";

import { MousePointer2, Hand, ZoomIn, ZoomOut, Maximize2, Play, Keyboard, type LucideIcon } from "lucide-react";
import { getEdgeColor } from "@/lib/nodeColors";
import { runs, auth } from "@trigger.dev/sdk/v3";
import { COMPONENT_REGISTRY } from "./nodes/componentRegistry";
import { GlowEdge } from "./edges/GlowEdge";
import { getNodeMeta } from "@/lib/nodeRegistry";
import { isValidHandleConnection } from "@/lib/nodeContracts";
import { WorkflowRunContext } from "./nodes/WorkflowRunContext";

const nodeTypes = COMPONENT_REGISTRY;
const edgeTypes = { glowEdge: GlowEdge };

function getDefaultData(type: string): Record<string, unknown> {
  return getNodeMeta(type)?.defaultData ?? {};
}

/**
 * Returns true if adding the edge source→target would create a cycle.
 * Uses BFS: walks forward from `target` through existing edges; if it
 * can reach `source`, the new edge would close a loop.
 */
function wouldCreateCycle(source: string, target: string, edges: Edge[]): boolean {
  const adj = new Map<string, string[]>();
  for (const e of edges) {
    if (!adj.has(e.source)) adj.set(e.source, []);
    adj.get(e.source)!.push(e.target);
  }

  const visited = new Set<string>();
  const queue   = [target];
  while (queue.length > 0) {
    const node = queue.shift()!;
    if (node === source) return true;
    if (visited.has(node)) continue;
    visited.add(node);
    for (const neighbour of adj.get(node) ?? []) queue.push(neighbour);
  }
  return false;
}

// ─── History ──────────────────────────────────────────────────────────────────

type Snapshot = { nodes: Node[]; edges: Edge[] };

// ─── Selection overlay ────────────────────────────────────────────────────────

const PADDING = 24;

function SelectionOverlay({ onRun }: { onRun: () => void }) {
  const nodes                  = useNodes();
  const { x: vx, y: vy, zoom } = useViewport();

  const selected = nodes.filter((n) => n.selected);
  if (selected.length < 2) return null;

  const minX = Math.min(...selected.map((n) => n.position.x)) - PADDING;
  const minY = Math.min(...selected.map((n) => n.position.y)) - PADDING;
  const maxX = Math.max(...selected.map((n) => n.position.x + (n.measured?.width  ?? 220))) + PADDING;
  const maxY = Math.max(...selected.map((n) => n.position.y + (n.measured?.height ?? 150))) + PADDING;

  const left   = minX * zoom + vx;
  const top    = minY * zoom + vy;
  const width  = (maxX - minX) * zoom;
  const height = (maxY - minY) * zoom;

  return (
    <div className="pointer-events-none absolute inset-0" style={{ zIndex: 4 }}>
      <div className="absolute" style={{ left, top, width, height }}>
        {/* Dashed bounding box */}
        <div className="absolute inset-0 rounded-xl border-2 border-dashed border-blue-500/60 bg-blue-500/[0.03]" />

        {/* Floating action button */}
        <div className="pointer-events-auto absolute -top-9 left-0">
          <button
            onClick={onRun}
            className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-400 active:bg-blue-600 text-white text-[12px] font-book px-3 py-1.5 rounded-full shadow-lg transition-colors"
          >
            <Play className="w-3 h-3 fill-current" />
            Run ({selected.length})
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Bottom toolbar ───────────────────────────────────────────────────────────

type CanvasMode = "select" | "pan";

function ToolBtn({ icon: Icon, active, onClick, title }: { icon: LucideIcon; active?: boolean; onClick: () => void; title: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-2 rounded-xl transition-colors ${
        active
          ? "bg-white/10 text-white"
          : "text-[#666] hover:text-white hover:bg-white/[0.06]"
      }`}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}

const SHORTCUTS = [
  { key: "S",              label: "Select mode" },
  { key: "H",              label: "Pan mode" },
  { key: "Ctrl+S",         label: "Save" },
  { key: "Ctrl+Z",         label: "Undo" },
  { key: "Ctrl+Y",         label: "Redo" },
  { key: "Delete / ⌫",    label: "Delete nodes" },
];

function BottomToolbar({ mode, onModeChange }: { mode: CanvasMode; onModeChange: (m: CanvasMode) => void }) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const [showShortcuts, setShowShortcuts] = useState(false);
  return (
    <>
      {showShortcuts && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setShowShortcuts(false)}
        >
          <div
            className="bg-[#1c1c1c] border border-white/[0.08] rounded-2xl p-5 shadow-2xl w-72"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[13px] font-book font-medium text-white">Keyboard Shortcuts</h3>
              <button
                onClick={() => setShowShortcuts(false)}
                className="text-zinc-600 hover:text-zinc-300 transition-colors text-xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="flex flex-col gap-3">
              {SHORTCUTS.map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-[12px] text-[#888] font-book">{label}</span>
                  <kbd className="text-[10px] font-book bg-[#1c1c1c] border border-white/[0.1] rounded-lg px-2 py-0.5 text-[#ccc] shrink-0">
                    {key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      <Panel position="bottom-center" style={{ marginBottom: "1rem" }}>
        <div className="flex items-center gap-0.5 bg-[#1a1a1a]/95 backdrop-blur-sm border border-white/[0.08] rounded-2xl px-2 py-1.5 shadow-2xl">
          <ToolBtn icon={MousePointer2} active={mode === "select"} onClick={() => onModeChange("select")} title="Select  (S)" />
          <ToolBtn icon={Hand}          active={mode === "pan"}    onClick={() => onModeChange("pan")}    title="Pan  (H)" />
          <div className="w-px h-5 bg-white/[0.1] mx-1.5" />
          <ToolBtn icon={ZoomIn}    onClick={() => zoomIn()}                                   title="Zoom In" />
          <ToolBtn icon={ZoomOut}   onClick={() => zoomOut()}                                  title="Zoom Out" />
          <ToolBtn icon={Maximize2} onClick={() => fitView({ padding: 0.15 } as FitViewOptions)} title="Fit View" />
          <div className="w-px h-5 bg-white/[0.1] mx-1.5" />
          <ToolBtn icon={Keyboard} active={showShortcuts} onClick={() => setShowShortcuts((v) => !v)} title="Shortcuts  (?)" />
        </div>
      </Panel>
    </>
  );
}

// ─── Inner component (lives inside ReactFlowProvider) ────────────────────────

interface FlowCanvasInnerProps {
  nodeToAdd: { type: string; ts: number } | null;
  onNodeAdded: () => void;
  onNodeSelect: (node: Node | null) => void;
  onRegisterRunWorkflow: (fn: (subset?: { nodes: Node[]; edges: Edge[] }) => Promise<{ runId: string; publicToken: string; nodes: Node[]; edges: Edge[] }>) => void;
  onRegisterGetSnapshot: (fn: () => { nodes: Node[]; edges: Edge[] }) => void;
  onRegisterGetSelectedNodes: (fn: () => { nodes: Node[]; edges: Edge[] }) => void;
  onRegisterLoadWorkflow: (fn: (nodes: Node[], edges: Edge[]) => void) => void;
  onSelectedCountChange: (count: number) => void;
  onCanvasModeChange: (mode: CanvasMode) => void;
  onRunSelected: () => void;
  workflowRun: { runId: string; publicToken: string } | null;
  isWorkflowRunning: boolean;
}

function FlowCanvasInner({ nodeToAdd, onNodeAdded, onNodeSelect, onRegisterRunWorkflow, onRegisterGetSnapshot, onRegisterGetSelectedNodes, onRegisterLoadWorkflow, onSelectedCountChange, onCanvasModeChange, onRunSelected, workflowRun, isWorkflowRunning }: FlowCanvasInnerProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [canvasMode, setCanvasMode] = useState<CanvasMode>("pan");
  const handleCanvasModeChange = useCallback((mode: CanvasMode) => {
    setCanvasMode(mode);
    onCanvasModeChange(mode);
  }, [onCanvasModeChange]);
  const { screenToFlowPosition, getNode, updateNodeData, fitView } = useReactFlow();

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
  }, [nodes, edges]);

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
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement).isContentEditable) return;

      // Mode shortcuts (no modifier)
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.key === "s" || e.key === "S") { handleCanvasModeChange("select"); return; }
        if (e.key === "h" || e.key === "H") { handleCanvasModeChange("pan");    return; }
      }

      // Undo / redo
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
  }, [nodeToAdd, addNode, onNodeAdded, screenToFlowPosition]);

  // ── Connection validation ────────────────────────────────────────────────────
  const isValidConnection = useCallback<IsValidConnection>(
    (connection) => {
      const src = getNode(connection.source);
      const tgt = getNode(connection.target);
      if (!src || !tgt) return false;

      // Reject self-loops
      if (connection.source === connection.target) return false;

      // Reject edges that would create a cycle (enforce DAG invariant)
      if (wouldCreateCycle(connection.source, connection.target, edgesRef.current)) return false;

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
    (params: Connection) => {
      const srcNode = getNode(params.source);
      const color = getEdgeColor(srcNode?.type ?? "");
      setEdges((eds) => addEdge({
        ...params,
        type: "glowEdge",
        animated: false,
        style: { stroke: color, strokeWidth: 1.5 },
      }, eds));
    },
    [setEdges, getNode],
  );

  // ── Workflow run ─────────────────────────────────────────────────────────────
  const runWorkflow = useCallback(async (subset?: { nodes: Node[]; edges: Edge[] }): Promise<{ runId: string; publicToken: string; nodes: Node[]; edges: Edge[] }> => {
    const nodesToRun = subset?.nodes ?? nodesRef.current;
    const edgesToRun = subset?.edges ?? edgesRef.current;
    const res = await fetch("/api/nodes/run", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nodeType: "orchestrator",
        data: {
          nodes: nodesToRun.map((n) => ({ id: n.id, type: n.type ?? "", data: n.data })),
          edges: edgesToRun.map((e) => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle ?? null, targetHandle: e.targetHandle ?? "" })),
        },
      }),
    });
    if (!res.ok) throw new Error("Failed to start workflow");
    const result = await res.json() as { runId: string; publicToken: string };
    return { ...result, nodes: nodesToRun, edges: edgesToRun };
  }, []);

  useEffect(() => {
    onRegisterRunWorkflow(runWorkflow);
  }, [runWorkflow, onRegisterRunWorkflow]);

  const getSnapshot = useCallback(
    () => ({ nodes: nodesRef.current, edges: edgesRef.current }),
    [],
  );

  useEffect(() => {
    onRegisterGetSnapshot(getSnapshot);
  }, [getSnapshot, onRegisterGetSnapshot]);

  // ── Selected-nodes snapshot ───────────────────────────────────────────────
  const getSelectedNodes = useCallback(() => {
    const selected    = nodesRef.current.filter((n) => n.selected);
    const selectedIds = new Set(selected.map((n) => n.id));
    const filteredEdges = edgesRef.current.filter(
      (e) => selectedIds.has(e.source) && selectedIds.has(e.target),
    );
    return { nodes: selected, edges: filteredEdges };
  }, []);

  useEffect(() => {
    onRegisterGetSelectedNodes(getSelectedNodes);
  }, [getSelectedNodes, onRegisterGetSelectedNodes]);

  // Track selection count so TopBar label can update
  const lastCountRef = useRef(0);
  const handleSelectionChange = useCallback(
    ({ nodes: sel }: OnSelectionChangeParams) => {
      if (sel.length !== lastCountRef.current) {
        lastCountRef.current = sel.length;
        onSelectedCountChange(sel.length);
      }
    },
    [onSelectedCountChange],
  );

  // ── Load workflow ─────────────────────────────────────────────────────────────
  const loadWorkflow = useCallback(
    (incomingNodes: Node[], incomingEdges: Edge[]) => {
      // Guard: nodes saved before position was persisted may lack a position field.
      // Spread them in a grid so ReactFlow doesn't crash on undefined x/y.
      const safeNodes = incomingNodes.map((n, i) => ({
        ...n,
        position: n.position ?? { x: (i % 4) * 220, y: Math.floor(i / 4) * 160 },
      }));
      const nodeTypeMap = new Map(safeNodes.map((n) => [n.id, n.type ?? ""]));
      const safeEdges = incomingEdges.map((e, i) => ({
        ...e,
        id: e.id ?? `edge-restored-${i}`,
        type: "glowEdge",
        animated: false,
        style: { stroke: getEdgeColor(nodeTypeMap.get(e.source) ?? ""), strokeWidth: 1.5 },
      }));
      setNodes(safeNodes);
      setEdges(safeEdges);
      // Reset undo/redo history so the loaded state is the new baseline
      history.current   = [{ nodes: safeNodes, edges: safeEdges }];
      historyIdx.current = 0;
      // Fit view after React re-renders with the new nodes
      requestAnimationFrame(() => fitView({ padding: 0.15 } as FitViewOptions));
    },
    [setNodes, setEdges, fitView],
  );

  useEffect(() => {
    onRegisterLoadWorkflow(loadWorkflow);
  }, [loadWorkflow, onRegisterLoadWorkflow]);

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
        const nodeOutputs  = run.metadata?.nodeOutputs  as Record<string, unknown> | undefined;
        if (nodeStatuses) {
          for (const [nodeId, status] of Object.entries(nodeStatuses)) {
            if (applied[nodeId] === status) continue;
            applied[nodeId] = status;
            // Also push the output value when a node succeeds so the node card
            // can display its result inline (image preview, LLM text, etc.)
            const update: Record<string, unknown> = { status };
            if (status === "success" && nodeOutputs?.[nodeId] !== undefined) {
              update.output = nodeOutputs[nodeId];
            }
            updateNodeData(nodeId, update);

            // Light up incoming edges when node is running, restore when done
            setEdges((eds) => eds.map((e) => {
              if (e.target !== nodeId) return e;
              return { ...e, animated: false, data: { ...e.data, glow: status === "running" } };
            }));
          }
        }
        if (run.isCompleted || run.isFailed) break;
      }
    });

    return () => { mounted = false; };
  }, [workflowRun, updateNodeData, setEdges]);

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
    <WorkflowRunContext.Provider value={isWorkflowRunning}>
    <div className="flex-1 h-full bg-[#0a0a0a] relative" onDrop={onDrop} onDragOver={onDragOver}>
      <SelectionOverlay onRun={onRunSelected} />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        isValidConnection={isValidConnection}
        onNodeClick={(_event, node) => onNodeSelect(node)}
        onPaneClick={() => onNodeSelect(null)}
        onSelectionChange={handleSelectionChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={{ type: "glowEdge", animated: false }}
        deleteKeyCode={["Backspace", "Delete"]}
        colorMode="dark"
        fitView={false}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        proOptions={{ hideAttribution: true }}
        panOnDrag={canvasMode === "pan"}
        selectionOnDrag={canvasMode === "select"}
        selectionMode={SelectionMode.Partial}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1.5}
          color="#27272a"
          style={{ backgroundColor: "#0a0a0a" }}
        />
        <BottomToolbar mode={canvasMode} onModeChange={handleCanvasModeChange} />
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
    </WorkflowRunContext.Provider>
  );
}

// ─── Public export (wraps with provider) ─────────────────────────────────────

interface FlowCanvasProps {
  nodeToAdd: { type: string; ts: number } | null;
  onNodeAdded: () => void;
  onNodeSelect: (node: Node | null) => void;
  onRegisterRunWorkflow: (fn: (subset?: { nodes: Node[]; edges: Edge[] }) => Promise<{ runId: string; publicToken: string; nodes: Node[]; edges: Edge[] }>) => void;
  onRegisterGetSnapshot: (fn: () => { nodes: Node[]; edges: Edge[] }) => void;
  onRegisterGetSelectedNodes: (fn: () => { nodes: Node[]; edges: Edge[] }) => void;
  onRegisterLoadWorkflow: (fn: (nodes: Node[], edges: Edge[]) => void) => void;
  onSelectedCountChange: (count: number) => void;
  onCanvasModeChange: (mode: "select" | "pan") => void;
  onRunSelected: () => void;
  workflowRun: { runId: string; publicToken: string } | null;
  isWorkflowRunning: boolean;
}

export function FlowCanvas(props: FlowCanvasProps) {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner {...props} />
    </ReactFlowProvider>
  );
}

