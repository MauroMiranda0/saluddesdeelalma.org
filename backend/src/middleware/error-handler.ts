import type {
  ErrorRequestHandler,
  NextFunction,
  Request,
  RequestHandler,
  Response
} from "express";

import { logger } from "../lib/logger";

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

export const asyncHandler = (handler: RequestHandler): RequestHandler => {
  return (request: Request, response: Response, next: NextFunction) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
};

export const notFoundHandler: RequestHandler = (request, _response, next) => {
  next(
    new AppError(
      404,
      "not_found",
      `Route not found: ${request.method} ${request.path}`
    )
  );
};

export const errorHandler: ErrorRequestHandler = (
  error,
  request,
  response,
  _next
) => {
  void _next;

  const requestId = response.locals.requestId as string | undefined;

  if (error instanceof AppError) {
    response
      .status(error.statusCode)
      .json({ code: error.code, message: error.message, requestId });
    return;
  }

  logger.error(
    { error, requestId, path: request.path },
    "Unhandled request error"
  );
  response.status(500).json({
    code: "internal_server_error",
    message: "Unexpected server error",
    requestId
  });
};
