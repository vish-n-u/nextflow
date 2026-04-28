import { NextResponse } from "next/server";
import * as z from "zod/v4";
import { withAuth } from "@/lib/with-auth";
import { createRunSchema } from "@/lib/zod/schemas/runs";
import { createRun, getRuns, transformRun } from "@/lib/api/runs";

// GET /api/runs
// Returns the last 30 runs for the authenticated user, newest first.
// Each run includes its node-level results for the history sidebar.
export const GET = withAuth(async ({ headers, session }) => {
  const runs = await getRuns(session.userId);
  return NextResponse.json(runs.map(transformRun), { headers });
});

// POST /api/runs
// Creates a new Run (+ NodeRun rows) in the DB at the moment execution starts.
// Called for both full-workflow runs (from DashboardShell) and single-node runs
// (from trackSingleRun). For single-node runs, scope="single" and no Workflow
// record is created. Returns { id } so the caller can PATCH later on completion.
export const POST = withAuth(async ({ req, headers, session }) => {
  const body  = createRunSchema.parse(await req.json());
  const result = await createRun(body, session.userId);
  return NextResponse.json(result, { status: 201, headers });
});
