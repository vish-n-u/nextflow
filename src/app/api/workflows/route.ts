import { NextResponse } from "next/server";
import { withAuth } from "@/lib/with-auth";
import { saveWorkflowSchema } from "@/lib/zod/schemas/workflows";
import { saveWorkflow } from "@/lib/api/workflows";

// POST /api/workflows
// Creates or updates a workflow canvas snapshot.
// If workflowId is provided in the body, updates that workflow (with ownership check).
// If omitted, creates a new workflow and returns its new id.
// The canvas nodes and edges are stored as JSON for later retrieval.
export const POST = withAuth(async ({ req, headers, session }) => {
  const body   = saveWorkflowSchema.parse(await req.json());
  const result = await saveWorkflow(body, session.userId);
  return NextResponse.json(result, { status: 201, headers });
});
