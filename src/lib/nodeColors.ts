/** Edge stroke colors and icon/handle Tailwind classes per node type. */

export const NODE_EDGE_COLORS: Record<string, string> = {
  textNode:         "#f59e0b",
  uploadImageNode:  "#3b82f6",
  uploadVideoNode:  "#8b5cf6",
  runLLMNode:       "#10b981",
  cropImageNode:    "#06b6d4",
  extractFrameNode: "#f97316",
};

export const DEFAULT_EDGE_COLOR = "#52525b";
export const RUNNING_EDGE_COLOR = "#fbbf24";

export function getEdgeColor(sourceNodeType: string): string {
  return NODE_EDGE_COLORS[sourceNodeType] ?? DEFAULT_EDGE_COLOR;
}
