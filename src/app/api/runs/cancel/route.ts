import { NextResponse } from "next/server";
import { runs } from "@trigger.dev/sdk/v3";
import { withAuth } from "@/lib/with-auth";
import { completeRun } from "@/lib/api/runs";

// POST /api/runs/cancel
// Cancels an in-flight Trigger.dev run. Called via sendBeacon on page unload
// or from the leave-confirmation dialog.
// Optionally accepts dbRunId to also mark the DB run record as cancelled.
export const POST = withAuth(async ({ req, headers, session }) => {
  const { triggerRunId, dbRunId } = await req.json() as { triggerRunId?: string; dbRunId?: string };
  if (!triggerRunId) {
    return NextResponse.json({ error: "Missing triggerRunId" }, { status: 400, headers });
  }
  await runs.cancel(triggerRunId);
  if (dbRunId) {
    await completeRun(dbRunId, session.userId, {
      status: "cancelled",
      completedAt: new Date().toISOString(),
      nodeResults: {},
    });
  }
  return NextResponse.json({ ok: true }, { headers });
});
