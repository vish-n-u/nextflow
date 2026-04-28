import { prisma } from "@/lib/prisma";
import type { RunWithDetails } from "./transform-run";

export async function getRuns(userId: string): Promise<RunWithDetails[]> {
  return prisma.run.findMany({
    where:   { userId },
    orderBy: { startedAt: "desc" },
    take:    30,
    select: {
      id:          true,
      status:      true,
      scope:       true,
      startedAt:   true,
      completedAt: true,
      durationMs:  true,
      workflow: {
        select: { name: true },
      },
      nodeRuns: {
        orderBy: { startedAt: "asc" },
        select: {
          id:          true,
          nodeId:      true,
          nodeType:    true,
          status:      true,
          input:       true,
          output:      true,
          error:       true,
          durationMs:  true,
          startedAt:   true,
          completedAt: true,
        },
      },
    },
  });
}
