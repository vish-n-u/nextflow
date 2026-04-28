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

export class AppApiError extends Error {
  public readonly code: ErrorCode;

  constructor({ code, message }: { code: ErrorCode; message: string }) {
    super(message);
    this.code = code;
  }
}
