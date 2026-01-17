import passport from "passport";
import { log } from "../../lib/logger";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { authStorage } from "./storage";

/**
 * Local Auth System (Replit-independent)
 * 
 * Supports two modes:
 * 1. DEV MODE (AUTH_DEV_MODE=true): Auto-login bypass for local development
 * 2. PRODUCTION: Session-based auth with password verification
 */

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week max age

  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });

  const isProduction = process.env.NODE_ENV === 'production';

  return session({
    secret: process.env.SESSION_SECRET || 'dev-session-secret-change-in-production',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: sessionTtl,
    },
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  const isDevMode = process.env.AUTH_DEV_MODE === 'true';

  // Login route
  app.get("/api/login", async (req, res) => {
    if (isDevMode) {
      // Dev mode: auto-login with dev user
      const devEmail = process.env.DEV_USER_EMAIL || 'admin@scan2plan.io';
      const devUser = await authStorage.getUserByEmail(devEmail);

      if (!devUser) {
        // Create dev user if doesn't exist
        const newUser = await authStorage.upsertUser({
          id: 'dev-user-local',
          email: devEmail,
          firstName: 'Dev',
          lastName: 'Admin',
          profileImageUrl: null,
          role: 'ceo',
        });

        const sessionUser = {
          claims: {
            sub: newUser.id,
            email: newUser.email,
            first_name: newUser.firstName,
            last_name: newUser.lastName,
          },
          expires_at: Math.floor(Date.now() / 1000) + 86400 * 7, // 7 days
        };

        req.login(sessionUser, (err) => {
          if (err) {
            log(`ERROR: Dev login failed - ${err.message}`);
            return res.redirect('/?error=login_failed');
          }
          (req.session as any).passwordVerified = true;
          res.redirect('/');
        });
      } else {
        const sessionUser = {
          claims: {
            sub: devUser.id,
            email: devUser.email,
            first_name: devUser.firstName,
            last_name: devUser.lastName,
          },
          expires_at: Math.floor(Date.now() / 1000) + 86400 * 7,
        };

        req.login(sessionUser, (err) => {
          if (err) {
            log(`ERROR: Dev login failed - ${err.message}`);
            return res.redirect('/?error=login_failed');
          }
          (req.session as any).passwordVerified = true;
          res.redirect('/');
        });
      }
    } else {
      // Production: redirect to login page (handled by frontend)
      res.redirect('/login');
    }
  });

  // Callback route (not needed for local auth, but keep for compatibility)
  app.get("/api/callback", (req, res) => {
    res.redirect('/');
  });

  // Logout route
  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      req.session.destroy(() => {
        res.redirect('/');
      });
    });
  });

  // Email/password login (for production use)
  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    const user = await authStorage.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Check lockout
    if (await authStorage.isUserLockedOut(user.id)) {
      return res.status(429).json({ message: "Account temporarily locked. Try again later." });
    }

    const isValid = await authStorage.verifyPassword(user.id, password);
    await authStorage.recordLoginAttempt(user.id, isValid, req.ip || undefined);

    if (!isValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const sessionUser = {
      claims: {
        sub: user.id,
        email: user.email,
        first_name: user.firstName,
        last_name: user.lastName,
      },
      expires_at: Math.floor(Date.now() / 1000) + 86400 * 7,
    };

    req.login(sessionUser, (err) => {
      if (err) {
        return res.status(500).json({ message: "Login failed" });
      }
      (req.session as any).passwordVerified = true;
      res.json({ success: true, user: { email: user.email, firstName: user.firstName } });
    });
  });

  // Dev mode: test login endpoint (kept for playwright tests)
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
        expires_at: Math.floor(Date.now() / 1000) + 3600 * 24,
      };

      await authStorage.upsertUser({
        id: testUser.claims.sub,
        email: testUser.claims.email,
        firstName: testUser.claims.first_name,
        lastName: testUser.claims.last_name,
        profileImageUrl: null,
        role: dbRole as any,
      });

      req.login(testUser, (err) => {
        if (err) {
          return res.status(500).json({ message: "Login failed", error: err.message });
        }
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

// Email domain allowed check (configurable)
const ALLOWED_EMAIL_DOMAIN = process.env.ALLOWED_EMAIL_DOMAIN || "scan2plan.io";
const DISABLE_EMAIL_RESTRICTION = process.env.DISABLE_EMAIL_RESTRICTION === 'true';

function isEmailDomainAllowed(email: string | undefined | null): boolean {
  if (DISABLE_EMAIL_RESTRICTION) return true;
  if (!email) return false;
  const domain = email.split("@")[1]?.toLowerCase();
  return domain === ALLOWED_EMAIL_DOMAIN.toLowerCase();
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;
  const isDevMode = process.env.AUTH_DEV_MODE === 'true';

  if (!req.isAuthenticated()) {
    if (isDevMode) {
      log("DEBUG: [Auth] Not authenticated in dev mode, auto-login required");
    }
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (!user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Email domain restriction (can be disabled for local dev)
  const userEmail = user.claims?.email;
  if (!isEmailDomainAllowed(userEmail)) {
    log(`SECURITY: Access denied for non-allowed email domain: ${userEmail}`);
    return res.status(403).json({
      message: `Access denied. This application is restricted to @${ALLOWED_EMAIL_DOMAIN} email addresses only.`,
      code: "DOMAIN_NOT_ALLOWED"
    });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now > user.expires_at) {
    return res.status(401).json({ message: "Session expired" });
  }

  return next();
};

// Role-based authorization middleware
import type { UserRole } from "@shared/models/auth";

export function requireRole(...allowedRoles: UserRole[]): RequestHandler {
  return async (req, res, next) => {
    const sessionUser = req.user as any;

    if (!sessionUser?.claims?.sub) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const dbUser = await authStorage.getUser(sessionUser.claims.sub);

      if (!dbUser) {
        return res.status(401).json({ message: "User not found" });
      }

      if (!allowedRoles.includes(dbUser.role as UserRole)) {
        return res.status(403).json({
          message: "Access denied. Insufficient permissions.",
          requiredRoles: allowedRoles,
          userRole: dbUser.role
        });
      }

      (req as any).dbUser = dbUser;
      next();
    } catch (error) {
      log(`ERROR: Role check error - ${error instanceof Error ? error.message : String(error)}`);
      return res.status(500).json({ message: "Error checking permissions" });
    }
  };
}

// Admin email access control
const ADMIN_EMAILS = [
  "chase@scan2plan.io",
  "elijah@scan2plan.io",
];

const CEO_EMAIL = "v@scan2plan.io";

export function isAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

export function isCeoEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  return email.toLowerCase() === CEO_EMAIL;
}

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

export const allowCeoViewOnly: RequestHandler = async (req, res, next) => {
  const user = req.user as any;
  const email = user?.claims?.email;

  (req as any).accessLevel = isAdminEmail(email) ? "admin" : (isCeoEmail(email) ? "view-only" : "none");

  if (!isAdminEmail(email) && !isCeoEmail(email)) {
    return res.status(403).json({
      message: "Access denied. Insufficient permissions.",
      code: "ACCESS_DENIED"
    });
  }

  next();
};
