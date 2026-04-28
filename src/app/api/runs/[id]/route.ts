import { NextResponse } from "next/server";
import { withAuth } from "@/lib/with-auth";
import { completeRunSchema } from "@/lib/zod/schemas/runs";
import { completeRun } from "@/lib/api/runs";

export const PATCH = withAuth<{ id: string }>(async ({ req, params, headers, session }) => {
  const body = completeRunSchema.parse(await req.json());
  await completeRun(params.id, session.userId, body);
  return NextResponse.json({ ok: true }, { headers });
});
