import { NextResponse } from "next/server";
import { auth as clerkAuth } from "@clerk/nextjs/server";
import { AppApiError, ErrorCodes } from "./errors";

interface AuthSession {
  userId: string;
}

export interface AuthContext<TParams extends Record<string, string> = Record<string, string>> {
  req:          Request;
  params:       TParams;
  searchParams: Record<string, string>;
  headers:      Headers;
  session:      AuthSession;
}

type AuthHandler<TParams extends Record<string, string>> = (
  ctx: AuthContext<TParams>,
) => Promise<Response>;

export function withAuth<TParams extends Record<string, string> = Record<string, string>>(
  handler: AuthHandler<TParams>,
) {
  return async (
    req: Request,
    ctx?: { params?: Promise<TParams> },
  ): Promise<Response> => {
    try {
      const { userId } = await clerkAuth();
      if (!userId) {
        throw new AppApiError({ code: "unauthorized", message: "Authentication required." });
      }

      const params       = (await ctx?.params) ?? ({} as TParams);
      const url          = new URL(req.url);
      const searchParams = Object.fromEntries(url.searchParams) as Record<string, string>;
      const headers      = new Headers();

      return await handler({ req, params, searchParams, headers, session: { userId } });
    } catch (err) {
      if (err instanceof AppApiError) {
        return NextResponse.json(
          { error: err.message, code: err.code },
          { status: ErrorCodes[err.code] },
        );
      }
      console.error("Unhandled API error:", err);
      return NextResponse.json(
        { error: "An unexpected error occurred.", code: "internal_server_error" },
        { status: 500 },
      );
    }
  };
}
