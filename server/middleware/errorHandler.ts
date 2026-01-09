import { Request, Response, NextFunction } from "express";
import { log } from "../lib/logger";

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  const requestId = (req as any).id || "unknown";
  const status = err.statusCode || err.status || 500;
  const message = err.message || "Internal Server Error";
  const isProduction = process.env.NODE_ENV === "production";

  log(`[${requestId}] Error ${status}: ${message}`, "error");
  
  if (!isProduction && err.stack) {
    console.error(`[${requestId}] Stack trace:`, err.stack);
  }

  res.status(status).json({
    error: message,
    requestId,
    ...((!isProduction && err.stack) ? { stack: err.stack } : {}),
  });
};

export const notFoundHandler = (req: Request, res: Response) => {
  const requestId = (req as any).id || "unknown";
  res.status(404).json({
    error: "Not Found",
    path: req.path,
    requestId,
  });
};

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
