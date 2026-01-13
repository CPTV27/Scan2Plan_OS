import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { seedMarketingData } from "./data/seedMarketing";
import { seedPersonas } from "./seed/personas";
import { correlationIdMiddleware } from "./middleware/correlationId";
import { apiLimiter, authLimiter, uploadLimiter, aiLimiter, passwordLimiter } from "./middleware/rateLimiter";
import { csrfProtection } from "./middleware/csrf";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { SERVER_CONSTANTS } from "./constants";
import { pool } from "./db";
import { log } from "./lib/logger";
import { applyStalenessPenalties } from "./staleness";
import { performanceLoggerMiddleware } from "./middleware/performanceLogger";
import { getEnv } from "./config/env";

// Validate environment configuration on startup
try {
  getEnv();
} catch (error) {
  console.error("Failed to start server: Invalid environment configuration");
  process.exit(1);
}

export { log };

const app = express();
const httpServer = createServer(app);
let isShuttingDown = false;

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(correlationIdMiddleware);
app.use(performanceLoggerMiddleware);

app.use(
  express.json({
    limit: "1mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// CSRF protection for API routes (excludes webhooks and public endpoints)
app.use("/api/", csrfProtection());

app.use("/api/", apiLimiter);
app.use("/api/auth/", authLimiter);
app.use("/api/leads/import", uploadLimiter);
app.use("/api/leads/:id/documents", uploadLimiter);
app.use("/api/google/drive/upload", uploadLimiter);
app.use("/api/ai/", aiLimiter);
app.use("/api/brand-generator/", aiLimiter);
app.use("/api/auth/verify-password", passwordLimiter);
app.use("/api/auth/set-password", passwordLimiter);


app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  const requestId = req.id || "unknown";
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `[${requestId}] ${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse).slice(0, 500)}`;
      }

      log(logLine);
    }
  });

  next();
});

async function gracefulShutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  log(`${signal} received, starting graceful shutdown...`, "shutdown");

  httpServer.close(() => {
    log("HTTP server closed", "shutdown");
  });

  setTimeout(() => {
    log("Forcing shutdown after timeout", "shutdown");
    process.exit(1);
  }, SERVER_CONSTANTS.GRACEFUL_SHUTDOWN_TIMEOUT_MS);

  try {
    await pool.end();
    log("Database connections closed", "shutdown");
    process.exit(0);
  } catch (error) {
    log("Error during shutdown", "shutdown");
    process.exit(1);
  }
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

(async () => {
  await registerRoutes(httpServer, app);

  app.use("/api/*", notFoundHandler);
  app.use(errorHandler);

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  await seedMarketingData();
  await seedPersonas();

  // Daily staleness check - runs every 24 hours
  const runDailyStaleness = async () => {
    try {
      const result = await applyStalenessPenalties();
      if (result.updated > 0) {
        log(`[Staleness] Daily check: Updated ${result.updated} leads with probability penalties`);
      }
    } catch (error: any) {
      log(`[Staleness] Daily check failed: ${error.message}`);
    }
  };

  // Run immediately on startup
  runDailyStaleness();

  // Then run every 24 hours (86400000 ms)
  setInterval(runDailyStaleness, 24 * 60 * 60 * 1000);

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
