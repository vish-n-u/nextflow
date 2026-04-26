import { NODE_REGISTRY, type HandleDataType } from "./nodeRegistry";

export type { HandleDataType };

/** Output handle types derived from the node registry */
export const OUTPUT_TYPES: Record<string, Record<string, HandleDataType>> =
  Object.fromEntries(NODE_REGISTRY.map((n) => [n.type, n.outputs]));

/** Input handle types derived from the node registry */
export const INPUT_TYPES: Record<string, Record<string, HandleDataType>> =
  Object.fromEntries(NODE_REGISTRY.map((n) => [n.type, n.inputs]));

export function isValidHandleConnection(
  sourceNodeType: string,
  sourceHandle:   string,
  targetNodeType: string,
  targetHandle:   string,
): boolean {
  const out = OUTPUT_TYPES[sourceNodeType]?.[sourceHandle];
  const inp = INPUT_TYPES[targetNodeType]?.[targetHandle];
  if (!out || !inp) return false;
  return out === inp;
}
