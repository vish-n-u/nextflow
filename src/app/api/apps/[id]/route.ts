import { NextResponse } from "next/server";
import { withAuth } from "@/lib/with-auth";
import { prisma } from "@/lib/prisma";
import { AppApiError } from "@/lib/errors";

// GET /api/apps/[id]
// Returns the full app (nodes + edges) so the canvas can fork it.
// No ownership check — apps are public to all authenticated users.
export const GET = withAuth<{ id: string }>(async ({ params, headers }) => {
  const app = await prisma.app.findUnique({
    where:  { id: params.id },
    select: { id: true, name: true, nodes: true, edges: true },
  });

  if (!app) {
    throw new AppApiError({ code: "not_found", message: "App not found." });
  }

  return NextResponse.json(app, { headers });
});
