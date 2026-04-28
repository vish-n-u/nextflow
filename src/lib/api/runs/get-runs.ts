import { prisma } from "@/lib/prisma";
import type { RunWithDetails } from "./transform-run";

/**
 * Fetches the 30 most recent runs for a user, newest first.
 * Uses an explicit select (no select * ) so we never accidentally
 * send large JSON blobs (e.g. workflow nodes/edges) back to the client.
 * NodeRuns are ordered by startedAt asc so they render in execution order
 * in the history sidebar.
 */
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
