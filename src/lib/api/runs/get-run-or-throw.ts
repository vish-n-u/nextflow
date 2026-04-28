import { prisma } from "@/lib/prisma";
import { AppApiError } from "@/lib/errors";

interface RunOwnerRecord {
  userId:    string;
  startedAt: Date;
}

/**
 * Fetches a Run by id and asserts the requester owns it.
 * Throws AppApiError (not_found / forbidden) so withAuth surfaces
 * the right HTTP status automatically — callers never need to null-check.
 * Also returns startedAt so completeRun can compute durationMs without
 * a second DB round-trip.
 */
export async function getRunOrThrow(runId: string, requesterId: string): Promise<RunOwnerRecord> {
  const run = await prisma.run.findUnique({
    where:  { id: runId },
    select: { userId: true, startedAt: true },
  });

  if (!run) {
    throw new AppApiError({ code: "not_found", message: "Run not found." });
  }

  if (run.userId !== requesterId) {
    throw new AppApiError({ code: "forbidden", message: "Access denied." });
  }

  return run;
}
