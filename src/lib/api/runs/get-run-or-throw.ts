import { prisma } from "@/lib/prisma";
import { AppApiError } from "@/lib/errors";

interface RunOwnerRecord {
  userId:    string;
  startedAt: Date;
}

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
