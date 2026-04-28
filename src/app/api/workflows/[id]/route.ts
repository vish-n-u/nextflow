import { NextResponse } from "next/server";
import { withAuth } from "@/lib/with-auth";
import { getWorkflow } from "@/lib/api/workflows";

// GET /api/workflows/[id]
// Returns the full workflow (nodes + edges JSON) for the canvas to restore.
// Verifies ownership — returns 403 if the workflow belongs to another user.
export const GET = withAuth<{ id: string }>(async ({ params, headers, session }) => {
  const workflow = await getWorkflow(params.id, session.userId);
  return NextResponse.json(workflow, { headers });
});
