import type { NodeTypes } from "@xyflow/react";
import { TextNode }         from "./TextNode";
import { UploadImageNode }  from "./UploadImageNode";
import { UploadVideoNode }  from "./UploadVideoNode";
import { RunLLMNode }       from "./RunLLMNode";
import { CropImageNode }    from "./CropImageNode";
import { ExtractFrameNode } from "./ExtractFrameNode";

// Maps nodeType string → React Flow node component.
// To register a new node: add one line here.
export const COMPONENT_REGISTRY: NodeTypes = {
  textNode:         TextNode,
  uploadImageNode:  UploadImageNode,
  uploadVideoNode:  UploadVideoNode,
  runLLMNode:       RunLLMNode,
  cropImageNode:    CropImageNode,
  extractFrameNode: ExtractFrameNode,
};
