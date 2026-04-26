"use client";

import "@xyflow/react/dist/style.css";
import { useCallback, useEffect } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type Edge,
  type Connection,
} from "@xyflow/react";

import { TextNode }        from "./nodes/TextNode";
import { UploadImageNode } from "./nodes/UploadImageNode";
import { UploadVideoNode } from "./nodes/UploadVideoNode";
import { RunLLMNode }      from "./nodes/RunLLMNode";
import { CropImageNode }   from "./nodes/CropImageNode";
import { ExtractFrameNode } from "./nodes/ExtractFrameNode";

const nodeTypes = {
  textNode:        TextNode,
  uploadImageNode: UploadImageNode,
  uploadVideoNode: UploadVideoNode,
  runLLMNode:      RunLLMNode,
  cropImageNode:   CropImageNode,
  extractFrameNode: ExtractFrameNode,
} as const;

function getDefaultData(type: string): Record<string, unknown> {
  switch (type) {
    case "textNode":        return { text: "" };
    case "uploadImageNode": return {};
    case "uploadVideoNode": return {};
    case "runLLMNode":      return { model: "Gemini 1.5 Flash", system_prompt: "", user_message: "" };
    case "cropImageNode":   return { x_percent: 0, y_percent: 0, width_percent: 100, height_percent: 100 };
    case "extractFrameNode": return { timestamp: "" };
    default:                return {};
  }
}

// ─── Inner component (lives inside ReactFlowProvider, hooks work here) ────────

interface FlowCanvasInnerProps {
  nodeToAdd: { type: string; ts: number } | null;
  onNodeAdded: () => void;
  onNodeSelect: (node: Node | null) => void;
}

function FlowCanvasInner({ nodeToAdd, onNodeAdded, onNodeSelect }: FlowCanvasInnerProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const { screenToFlowPosition } = useReactFlow();

  const addNode = useCallback(
    (type: string, position: { x: number; y: number }) => {
      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: getDefaultData(type),
      };
      setNodes((nds) => [...nds, newNode]);
    },
    [setNodes],
  );

  // Click-to-add: place at viewport centre
  useEffect(() => {
    if (!nodeToAdd) return;
    const position = screenToFlowPosition({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });
    addNode(nodeToAdd.type, position);
    onNodeAdded();
  }, [nodeToAdd]); // eslint-disable-line react-hooks/exhaustive-deps

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
    [setEdges],
  );

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
    <div
      className="flex-1 h-full bg-[#0a0a0a]"
      onDrop={onDrop}
      onDragOver={onDragOver}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
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
      </ReactFlow>
    </div>
  );
}

// ─── Public export (wraps with provider) ─────────────────────────────────────

interface FlowCanvasProps {
  nodeToAdd: { type: string; ts: number } | null;
  onNodeAdded: () => void;
  onNodeSelect: (node: Node | null) => void;
}

export function FlowCanvas(props: FlowCanvasProps) {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
