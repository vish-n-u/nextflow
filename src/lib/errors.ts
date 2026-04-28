// Maps semantic error codes to HTTP status numbers.
// Used by withAuth to convert AppApiError into the correct response status.
export const ErrorCodes = {
  bad_request:           400,
  unauthorized:          401,
  forbidden:             403,
  not_found:             404,
  conflict:              409,
  unprocessable_entity:  422,
  rate_limit_exceeded:   429,
  internal_server_error: 500,
} as const;

export type ErrorCode = keyof typeof ErrorCodes;

/**
 * Typed error class for intentional API failures.
 * Throw this (never return it) from service functions — withAuth catches it
 * and sends the right HTTP status + JSON body automatically.
 *
 * Example:
 *   throw new AppApiError({ code: "not_found", message: "Run not found." });
 */
export class AppApiError extends Error {
  public readonly code: ErrorCode;

  constructor({ code, message }: { code: ErrorCode; message: string }) {
    super(message);
    this.code = code;
  }
}
