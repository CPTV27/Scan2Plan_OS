import rateLimit from "express-rate-limit";
import { SERVER_CONSTANTS, HTTP_STATUS } from "../constants";

export const apiLimiter = rateLimit({
  windowMs: SERVER_CONSTANTS.RATE_LIMIT_WINDOW_MS,
  max: SERVER_CONSTANTS.RATE_LIMIT_MAX_REQUESTS,
  message: {
    error: "Too many requests, please try again later.",
    retryAfter: Math.ceil(SERVER_CONSTANTS.RATE_LIMIT_WINDOW_MS / 1000),
  },
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
});

export const authLimiter = rateLimit({
  windowMs: SERVER_CONSTANTS.RATE_LIMIT_WINDOW_MS,
  max: SERVER_CONSTANTS.AUTH_RATE_LIMIT_MAX_REQUESTS,
  message: {
    error: "Too many login attempts, please try again later.",
    retryAfter: Math.ceil(SERVER_CONSTANTS.RATE_LIMIT_WINDOW_MS / 1000),
  },
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
});
