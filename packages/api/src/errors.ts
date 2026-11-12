import { AppError } from 'nano-fw/AppError.ts';
import { AppErrorSchema, openapiRegistry } from 'nano-fw/docs/index.ts';

export const ERRORS = {
  INVALID_CREDENTIALS: { status: 401, message: 'Invalid credentials' },
  INVALID_TOKEN: { status: 401, message: 'Invalid token' },
  EMAIL_EXISTS: { status: 409, message: 'Email already registered' },
} as const;

type ErrorCode = keyof typeof ERRORS;

export const createError = (code: ErrorCode) => {
  const { status, message } = ERRORS[code];
  const error = new AppError(status, code, message);

  return error;
};

const errorDescriptions = [
  'All API errors use this response schema. The HTTP status indicates the error category.',
  '',
  '| Code | HTTP status | Meaning |',
  '| --- | --- | --- |',
  ...Object.entries(ERRORS).map(([code, error]) => `| ${code} | ${error.status} | ${error.message} |`),
  '| VALIDATION_ERROR | 400 | Request validation failed. payload.issues contains field paths and messages. |',
  '| RESPONSE_VALIDATION_ERROR | 500 | Response validation failed. payload.issues contains field paths and messages. |',
  '| INTERNAL_SERVER_ERROR | 500 | An unexpected server error occurred. |',
].join('\n');

openapiRegistry.register('ApiError', AppErrorSchema.describe(errorDescriptions));
