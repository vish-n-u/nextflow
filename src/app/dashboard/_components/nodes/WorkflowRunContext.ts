import { createContext, useContext } from "react";

/**
 * Provides a boolean indicating whether a workflow-level run is in progress.
 * Consumed by node components to lock all inputs while execution is underway.
 * Provided by FlowCanvas (above <ReactFlow>) so it's available to every node.
 */
export const WorkflowRunContext = createContext(false);

export const useIsWorkflowRunning = () => useContext(WorkflowRunContext);
