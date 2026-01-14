import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import { log } from "../../lib/logger";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { authStorage } from "./storage";

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week max age
  const idleTimeout = 30 * 60 * 1000; // 30 minutes idle timeout

  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });

  // Detect production environment - check multiple indicators
  const isDeployment = process.env.REPLIT_DEPLOYMENT === '1';
  const isProduction = process.env.NODE_ENV === 'production';
  const hasReplitAppDomain = (process.env.REPLIT_DOMAINS || '').includes('.replit.app');

  // Use secure cookies in any production-like environment
  const useSecureCookies = isDeployment || isProduction || hasReplitAppDomain;

  log(`Session config: isDeployment=${isDeployment}, isProduction=${isProduction}, hasReplitAppDomain=${hasReplitAppDomain}, useSecureCookies=${useSecureCookies}`);

  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    rolling: true, // Reset session expiry on each request (session rotation)
    cookie: {
      httpOnly: true,
      // Secure must be true for https in production
      // Use explicit boolean instead of 'auto' for reliability
      secure: useSecureCookies,
      // Must be 'lax' to allow OAuth redirects from Replit's auth server
      sameSite: 'lax',
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(claims: any) {
  await authStorage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  // Keep track of registered strategies
  const registeredStrategies = new Set<string>();

  // Helper function to ensure strategy exists for a domain
  const ensureStrategy = (domain: string) => {
    const strategyName = `replitauth:${domain}`;
    if (!registeredStrategies.has(strategyName)) {
      const strategy = new Strategy(
        {
          name: strategyName,
          config,
          scope: "openid email profile offline_access",
          callbackURL: `https://${domain}/api/callback`,
        },
        verify
      );
      passport.use(strategy);
      registeredStrategies.add(strategyName);
    }
  };

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    log(`Login initiated - hostname: ${req.hostname}, protocol: ${req.protocol}, secure: ${req.secure}`);
    ensureStrategy(req.hostname);
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    log(`Callback received - hostname: ${req.hostname}, sessionID: ${req.sessionID}, hasSession: ${!!req.session}`);
    ensureStrategy(req.hostname);
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, (err: any) => {
      if (err) {
        log(`ERROR: Callback authentication failed - ${err.message || err}`);
        return next(err);
      }
      log(`Callback successful - user: ${(req as any).user?.claims?.email || 'unknown'}, sessionID: ${req.sessionID}`);
      next();
    });
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });

  // Test-only authentication bypass (only in development/test environment)
  if (process.env.NODE_ENV !== 'production') {
    app.post("/api/test-login", async (req, res) => {
      const requestedRole = req.body.role;
      let dbRole = "ceo";
      let userId = "test-user-admin";
      let email = "playwright-admin@scan2plan.io";

      if (requestedRole === "field") {
        dbRole = "production";
        userId = "test-user-field";
        email = "playwright-field@scan2plan.io";
      }
      if (requestedRole === "admin") {
        dbRole = "ceo";
        userId = "test-user-admin";
        email = "playwright-admin@scan2plan.io";
      }

      const testUser = {
        claims: {
          sub: userId,
          email: email,
          first_name: "Playwright",
          last_name: requestedRole === "field" ? "Field" : "Admin",
        },
        access_token: `test-access-token-${requestedRole}`,
        refresh_token: `test-refresh-token-${requestedRole}`,
        expires_at: Math.floor(Date.now() / 1000) + 3600 * 24, // 24 hours
      };

      // Upsert test user in database
      await authStorage.upsertUser({
        id: testUser.claims.sub,
        email: testUser.claims.email,
        firstName: testUser.claims.first_name,
        lastName: testUser.claims.last_name,
        profileImageUrl: null,
        role: dbRole as any,
      });

      // Log in the test user
      req.login(testUser, (err) => {
        if (err) {
          return res.status(500).json({ message: "Login failed", error: err.message });
        }
        // Set password as verified for test user
        (req.session as any).passwordVerified = true;
        req.session.save((saveErr) => {
          if (saveErr) {
            return res.status(500).json({ message: "Session save failed", error: saveErr.message });
          }
          res.json({ success: true, user: testUser.claims });
        });
      });
    });
  }
}

// Allowed email domain for access
const ALLOWED_EMAIL_DOMAIN = "scan2plan.io";

function isEmailDomainAllowed(email: string | undefined | null): boolean {
  if (!email) return false;
  const domain = email.split("@")[1]?.toLowerCase();
  return domain === ALLOWED_EMAIL_DOMAIN;
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  // Debug logging for auth issues
  if (!req.isAuthenticated()) {
    log("DEBUG: [Auth Debug] req.isAuthenticated() returned false");
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (!user) {
    log("DEBUG: [Auth Debug] No user object on request");
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (!user.expires_at) {
    log(`DEBUG: [Auth Debug] User exists but no expires_at. User keys: ${Object.keys(user).join(", ")}`);
    return res.status(401).json({ message: "Unauthorized" });
  }

  // SECURITY: Enforce email domain restriction server-side
  const userEmail = user.claims?.email;
  if (!isEmailDomainAllowed(userEmail)) {
    log(`SECURITY: Access denied for non-allowed email domain: ${userEmail}`);
    return res.status(403).json({
      message: "Access denied. This application is restricted to @scan2plan.io email addresses only.",
      code: "DOMAIN_NOT_ALLOWED"
    });
  }

  // SECURITY: Check if password has been verified this session
  // Skip this check for password-related endpoints
  const passwordEndpoints = ['/api/auth/session-status', '/api/auth/password-status', '/api/auth/set-password', '/api/auth/verify-password'];
  const isPasswordEndpoint = passwordEndpoints.some(ep => req.path === ep);

  if (!isPasswordEndpoint) {
    const session = req.session as any;
    if (!session?.passwordVerified) {
      return res.status(403).json({
        message: "Password verification required",
        code: "PASSWORD_NOT_VERIFIED"
      });
    }
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};

// Role-based authorization middleware
// Usage: requireRole("ceo", "sales") - allows ceo OR sales roles
import type { UserRole } from "@shared/models/auth";

export function requireRole(...allowedRoles: UserRole[]): RequestHandler {
  return async (req, res, next) => {
    const sessionUser = req.user as any;

    if (!sessionUser?.claims?.sub) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      // Fetch user from database to get their role
      const dbUser = await authStorage.getUser(sessionUser.claims.sub);

      if (!dbUser) {
        return res.status(401).json({ message: "User not found" });
      }

      // Check if user's role is in the allowed roles
      if (!allowedRoles.includes(dbUser.role as UserRole)) {
        return res.status(403).json({
          message: "Access denied. Insufficient permissions.",
          requiredRoles: allowedRoles,
          userRole: dbUser.role
        });
      }

      // Attach user with role to request for downstream use
      (req as any).dbUser = dbUser;
      next();
    } catch (error) {
      log(`ERROR: Role check error - ${error instanceof Error ? error.message : String(error)}`);
      return res.status(500).json({ message: "Error checking permissions" });
    }
  };
}

// =============================================
// EMAIL-BASED ADMIN ACCESS CONTROL
// COO and dev team have full access to sensitive features
// CEO has reduced access (view-only on some features)
// =============================================

const ADMIN_EMAILS = [
  "chase@scan2plan.io",   // COO - full access
  "elijah@scan2plan.io",  // Dev - full access
];

const CEO_EMAIL = "v@scan2plan.io";  // CEO - reduced access

/**
 * Check if user has full admin access (COO/dev team)
 */
export function isAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

/**
 * Check if user is CEO (reduced access)
 */
export function isCeoEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  return email.toLowerCase() === CEO_EMAIL;
}

/**
 * Middleware: Require full admin access (COO/dev only)
 * Use this for features that could break things if misconfigured
 */
export const requireAdmin: RequestHandler = async (req, res, next) => {
  const user = req.user as any;
  const email = user?.claims?.email;

  if (!isAdminEmail(email)) {
    return res.status(403).json({
      message: "Access denied. Admin privileges required.",
      code: "ADMIN_REQUIRED"
    });
  }

  next();
};

/**
 * Middleware: Allow CEO with view-only indicator
 * Use this when CEO can view but should be warned about edits
 */
export const allowCeoViewOnly: RequestHandler = async (req, res, next) => {
  const user = req.user as any;
  const email = user?.claims?.email;

  // Attach access level to request
  (req as any).accessLevel = isAdminEmail(email) ? "admin" : (isCeoEmail(email) ? "view-only" : "none");

  if (!isAdminEmail(email) && !isCeoEmail(email)) {
    return res.status(403).json({
      message: "Access denied. Insufficient permissions.",
      code: "ACCESS_DENIED"
    });
  }

  next();
};

