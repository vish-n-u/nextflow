import { NextResponse } from "next/server";
import { auth as clerkAuth } from "@clerk/nextjs/server";
import { AppApiError, ErrorCodes } from "./errors";

interface AuthSession {
  userId: string;
}

export interface AuthContext<TParams extends Record<string, string> = Record<string, string>> {
  req:          Request;
  params:       TParams;         // Dynamic route segments, e.g. { id } for /api/runs/[id]
  searchParams: Record<string, string>; // Parsed query string
  headers:      Headers;         // Response headers to pass through (e.g. CORS, cache)
  session:      AuthSession;     // Authenticated user info
}

type AuthHandler<TParams extends Record<string, string>> = (
  ctx: AuthContext<TParams>,
) => Promise<Response>;

/**
 * Higher-order function that wraps a route handler with:
 * 1. Clerk authentication — throws 401 if no active session.
 * 2. Unified error handling — AppApiError maps to its HTTP status code;
 *    any other thrown error becomes a 500 with a generic message (no
 *    internal details leaked to the client).
 * 3. Context assembly — resolves async params (Next.js 15 dynamic segments
 *    are Promises), parses query string, and provides a Headers bag for the
 *    handler to attach response headers.
 *
 * Usage:
 *   export const GET = withAuth(async ({ session, headers }) => { ... });
 *   export const PATCH = withAuth<{ id: string }>(async ({ params }) => { ... });
 */
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
      // Known API errors map to their defined HTTP status
      if (err instanceof AppApiError) {
        return NextResponse.json(
          { error: err.message, code: err.code },
          { status: ErrorCodes[err.code] },
        );
      }
      // Unexpected errors: log server-side, return opaque 500 to client
      console.error("Unhandled API error:", err);
      return NextResponse.json(
        { error: "An unexpected error occurred.", code: "internal_server_error" },
        { status: 500 },
      );
    }
  };
}
