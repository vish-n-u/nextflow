import { prisma } from "@/lib/prisma";
import { getRunOrThrow } from "./get-run-or-throw";
import type { CompleteRunInput } from "@/lib/zod/schemas/runs";

/**
 * Finalises a Run and all its NodeRuns in a single DB transaction.
 *
 * Flow:
 * 1. Fetches the Run to verify ownership and get startedAt for duration math.
 * 2. Derives durationMs from startedAt → completedAt (avoids trusting the client for timing).
 * 3. Runs a $transaction that:
 *    - Updates Run: status, completedAt, durationMs
 *    - Updates each NodeRun by (runId, nodeId): status, output, error, durationMs, completedAt
 *    updateMany is used for NodeRuns because nodeId is not the PK — runId+nodeId together
 *    identify the row uniquely within a run.
 */
export async function completeRun(
  runId: string,
  userId: string,
  input: CompleteRunInput,
): Promise<void> {
  // Verify the run exists and belongs to this user; also returns startedAt
  const run         = await getRunOrThrow(runId, userId);
  const completedAt = new Date(input.completedAt);
  // Compute wall-clock duration server-side so the client can't skew it
  const durationMs  = completedAt.getTime() - run.startedAt.getTime();

  await prisma.$transaction([
    prisma.run.update({
      where: { id: runId },
      data:  { status: input.status, completedAt, durationMs },
    }),
    ...Object.entries(input.nodeResults).map(([nodeId, result]) =>
      prisma.nodeRun.updateMany({
        where: { runId, nodeId },
        data: {
          status:      result.status,
          output:      result.output as object | undefined,
          error:       result.error,
          durationMs:  result.durationMs,
          completedAt,
        },
      }),
    ),
  ]);
}
