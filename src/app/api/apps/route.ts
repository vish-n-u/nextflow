import { NextResponse } from "next/server";
import { withAuth } from "@/lib/with-auth";
import { saveAppSchema } from "@/lib/zod/schemas/apps";
import { saveApp } from "@/lib/api/apps/save-app";
import { listApps } from "@/lib/api/apps/list-apps";

// GET /api/apps
// Returns all published apps across all users, newest first.
// Public within the authenticated app — no ownership filter.
export const GET = withAuth(async ({ req, headers }) => {
  const { searchParams } = new URL(req.url);
  const limit  = Math.min(Math.max(parseInt(searchParams.get("limit")  ?? "10", 10) || 10, 1), 50);
  const offset = Math.max(parseInt(searchParams.get("offset") ?? "0",  10) || 0, 0);
  const apps = await listApps(limit, offset);
  return NextResponse.json(apps, { headers });
});

// POST /api/apps
// Saves the current canvas as a publicly accessible App.
// Always creates a new App row — apps are immutable snapshots.
export const POST = withAuth(async ({ req, headers, session }) => {
  const body   = saveAppSchema.parse(await req.json());
  const result = await saveApp(body, session.userId);
  return NextResponse.json(result, { status: 201, headers });
});
