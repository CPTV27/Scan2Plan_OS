import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

const CSRF_TOKEN_HEADER = "x-csrf-token";
const CSRF_TOKEN_COOKIE = "csrf-token";
const TOKEN_LENGTH = 32;

const SAFE_METHODS = ["GET", "HEAD", "OPTIONS"];

const EXEMPT_PATHS = [
  "/api/webhooks/",
  "/api/public/",
  "/api/google-chat/webhook",
];

function generateToken(): string {
  return crypto.randomBytes(TOKEN_LENGTH).toString("hex");
}

function isExemptPath(path: string): boolean {
  return EXEMPT_PATHS.some((exempt) => path.startsWith(exempt));
}

export function csrfProtection() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Skip CSRF check for safe methods
    if (SAFE_METHODS.includes(req.method)) {
      // Ensure token exists for subsequent requests
      if (!req.cookies?.[CSRF_TOKEN_COOKIE]) {
        const token = generateToken();
        res.cookie(CSRF_TOKEN_COOKIE, token, {
          httpOnly: false, // Must be readable by JS
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          maxAge: 24 * 60 * 60 * 1000, // 24 hours
        });
      }
      return next();
    }

    // Skip CSRF for exempt paths (webhooks, public endpoints)
    if (isExemptPath(req.path)) {
      return next();
    }

    // For state-changing methods, validate CSRF token
    const cookieToken = req.cookies?.[CSRF_TOKEN_COOKIE];
    const headerToken = req.headers[CSRF_TOKEN_HEADER] as string;

    if (!cookieToken || !headerToken) {
      return res.status(403).json({
        error: "CSRF token missing",
        code: "CSRF_MISSING",
      });
    }

    // Constant-time comparison to prevent timing attacks
    if (!crypto.timingSafeEqual(
      Buffer.from(cookieToken),
      Buffer.from(headerToken)
    )) {
      return res.status(403).json({
        error: "CSRF token invalid",
        code: "CSRF_INVALID",
      });
    }

    // Rotate token after successful validation
    const newToken = generateToken();
    res.cookie(CSRF_TOKEN_COOKIE, newToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000,
    });

    next();
  };
}

export function getCsrfToken(req: Request): string | null {
  return req.cookies?.[CSRF_TOKEN_COOKIE] || null;
}
