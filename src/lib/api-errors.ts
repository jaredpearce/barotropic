export type UpstreamName = 'NWS' | 'Open-Meteo';

export type UpstreamErrorCode =
  | 'UPSTREAM_TIMEOUT'
  | 'UPSTREAM_HTTP_ERROR'
  | 'UPSTREAM_MALFORMED_RESPONSE'
  | 'UPSTREAM_UNAVAILABLE';

export interface UpstreamErrorPayload {
  error: {
    code: UpstreamErrorCode;
    message: string;
    upstream: UpstreamName;
    retryable: boolean;
    upstreamStatus?: number;
  };
}

export class UpstreamApiError extends Error {
  constructor(
    readonly code: UpstreamErrorCode,
    message: string,
    readonly upstream: UpstreamName,
    readonly httpStatus: number,
    readonly retryable: boolean,
    readonly upstreamStatus?: number
  ) {
    super(message);
    this.name = 'UpstreamApiError';
  }

  toPayload(): UpstreamErrorPayload {
    return {
      error: {
        code: this.code,
        message: this.message,
        upstream: this.upstream,
        retryable: this.retryable,
        ...(this.upstreamStatus === undefined
          ? {}
          : { upstreamStatus: this.upstreamStatus }),
      },
    };
  }
}

export function isUpstreamTimeout(error: unknown): boolean {
  return error instanceof Error && error.name === 'TimeoutError';
}

export function upstreamErrorResponse(error: unknown): Response | null {
  if (!(error instanceof UpstreamApiError)) {
    return null;
  }

  return Response.json(error.toPayload(), { status: error.httpStatus });
}