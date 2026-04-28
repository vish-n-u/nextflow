import { NextResponse } from "next/server";
import { withAuth } from "@/lib/with-auth";
import { saveWorkflowSchema } from "@/lib/zod/schemas/workflows";
import { saveWorkflow } from "@/lib/api/workflows";

export const POST = withAuth(async ({ req, headers, session }) => {
  const body   = saveWorkflowSchema.parse(await req.json());
  const result = await saveWorkflow(body, session.userId);
  return NextResponse.json(result, { status: 201, headers });
});
