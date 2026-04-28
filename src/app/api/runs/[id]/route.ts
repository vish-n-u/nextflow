import { NextResponse } from "next/server";
import { withAuth } from "@/lib/with-auth";
import { completeRunSchema } from "@/lib/zod/schemas/runs";
import { completeRun } from "@/lib/api/runs";

// PATCH /api/runs/[id]
// Marks a run as complete. Called after all nodes finish (or fail).
// Updates the Run status/duration and each NodeRun's status, output, and error
// in a single DB transaction. Ownership is verified before any writes.
export const PATCH = withAuth<{ id: string }>(async ({ req, params, headers, session }) => {
  const body = completeRunSchema.parse(await req.json());
  await completeRun(params.id, session.userId, body);
  return NextResponse.json({ ok: true }, { headers });
});
