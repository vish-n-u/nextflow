import { prisma } from "@/lib/prisma";
import { getRunOrThrow } from "./get-run-or-throw";
import type { CompleteRunInput } from "@/lib/zod/schemas/runs";

export async function completeRun(
  runId: string,
  userId: string,
  input: CompleteRunInput,
): Promise<void> {
  const run         = await getRunOrThrow(runId, userId);
  const completedAt = new Date(input.completedAt);
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
