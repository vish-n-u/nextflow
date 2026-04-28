import { NextResponse } from "next/server";
import * as z from "zod/v4";
import { withAuth } from "@/lib/with-auth";
import { createRunSchema } from "@/lib/zod/schemas/runs";
import { createRun, getRuns, transformRun } from "@/lib/api/runs";

export const GET = withAuth(async ({ headers, session }) => {
  const runs = await getRuns(session.userId);
  return NextResponse.json(runs.map(transformRun), { headers });
});

export const POST = withAuth(async ({ req, headers, session }) => {
  const body  = createRunSchema.parse(await req.json());
  const result = await createRun(body, session.userId);
  return NextResponse.json(result, { status: 201, headers });
});
