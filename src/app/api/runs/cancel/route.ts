import { NextResponse } from "next/server";
import { runs } from "@trigger.dev/sdk/v3";
import { withAuth } from "@/lib/with-auth";

// POST /api/runs/cancel
// Cancels an in-flight Trigger.dev run. Called via sendBeacon on page unload
// or from the leave-confirmation dialog.
export const POST = withAuth(async ({ req, headers }) => {
  const { triggerRunId } = await req.json() as { triggerRunId?: string };
  if (!triggerRunId) {
    return NextResponse.json({ error: "Missing triggerRunId" }, { status: 400, headers });
  }
  await runs.cancel(triggerRunId);
  return NextResponse.json({ ok: true }, { headers });
});
