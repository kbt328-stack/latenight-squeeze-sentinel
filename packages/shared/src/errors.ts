export class SentinelError extends Error {
  readonly code: string;
  readonly context?: Record<string, unknown>;
  constructor(code: string, message: string, context?: Record<string, unknown>) {
    super(message);
    this.name = 'SentinelError';
    this.code = code;
    this.context = context;
    if (Error.captureStackTrace) Error.captureStackTrace(this, SentinelError);
  }
}
export const ErrorCodes = {
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  UPSTREAM_ERROR: 'UPSTREAM_ERROR',
  UPSTREAM_TIMEOUT: 'UPSTREAM_TIMEOUT',
  MISSING_API_KEY: 'MISSING_API_KEY',
  RESPONSE_PARSE_ERROR: 'RESPONSE_PARSE_ERROR',
  DB_QUERY_FAILED: 'DB_QUERY_FAILED',
  RECORD_NOT_FOUND: 'RECORD_NOT_FOUND',
  INVALID_SIGNAL_VALUE: 'INVALID_SIGNAL_VALUE',
  SCORING_FAILED: 'SCORING_FAILED',
  WORKER_STARTUP_FAILED: 'WORKER_STARTUP_FAILED',
  JOB_FAILED: 'JOB_FAILED',
  JOB_DEAD_LETTERED: 'JOB_DEAD_LETTERED',
} as const;
export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
