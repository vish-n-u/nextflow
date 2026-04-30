import { NextResponse } from "next/server";
import { withAuth } from "@/lib/with-auth";
import { getWorkflow } from "@/lib/api/workflows";
import { prisma } from "@/lib/prisma";
import { AppApiError } from "@/lib/errors";

// GET /api/workflows/[id]
// Returns the full workflow (nodes + edges + isPublic) for the canvas to restore.
// Verifies ownership — returns 403 if the workflow belongs to another user.
export const GET = withAuth<{ id: string }>(async ({ params, headers, session }) => {
  const workflow = await getWorkflow(params.id, session.userId);
  return NextResponse.json(workflow, { headers });
});

// PATCH /api/workflows/[id]
// Flips isPublic = true on the workflow. Ownership verified before write.
export const PATCH = withAuth<{ id: string }>(async ({ params, headers, session }) => {
  const existing = await prisma.workflow.findUnique({
    where:  { id: params.id },
    select: { userId: true },
  });

  if (!existing) {
    throw new AppApiError({ code: "not_found", message: "Workflow not found." });
  }
  if (existing.userId !== session.userId) {
    throw new AppApiError({ code: "forbidden", message: "Access denied." });
  }

  await prisma.workflow.update({
    where: { id: params.id },
    data:  { isPublic: true },
  });

  return NextResponse.json({ ok: true }, { headers });
});
