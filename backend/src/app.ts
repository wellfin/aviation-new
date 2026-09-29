import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Express, Router } from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { env, isTest } from "./config/env.js";
import { isDatabaseReady } from "./lib/db.js";
import { logger } from "./lib/logger.js";
import { authenticate } from "./middleware/auth.js";
import { errorHandler, notFoundHandler } from "./middleware/errors.js";
import { globalRateLimit, originCheck } from "./middleware/security.js";
import { apiRoutes } from "./routes.js";

export interface AppOptions {
  /** Extra routers mounted under /api/v1 (used by tests for modules not yet in routes.ts). */
  extraRoutes?: Array<[path: string, router: Router]>;
}

export function createApp(options: AppOptions = {}): Express {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", env.TRUST_PROXY);
  app.set("query parser", "simple");

  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(
    cors({
      origin: (origin, cb) => cb(null, !origin || env.CORS_ORIGINS.includes(origin)),
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      allowedHeaders: ["Content-Type", "Authorization"],
      maxAge: 600,
    }),
  );
  if (!isTest) {
    app.use(
      pinoHttp({
        logger,
        autoLogging: { ignore: (req) => req.url === "/health" },
        customLogLevel: (_req, res, err) => (err || res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info"),
      }),
    );
  }

  // Webhooks verify signatures over the exact bytes received, so keep the raw body.
  app.use(
    express.json({
      limit: "1mb",
      verify: (req, _res, buf) => {
        if ((req as express.Request).originalUrl?.startsWith("/api/v1/billing/webhooks")) (req as express.Request).rawBody = Buffer.from(buf);
      },
    }),
  );
  app.use(cookieParser());

  app.get("/health", (_req, res) => {
    const db = isDatabaseReady();
    res.status(db ? 200 : 503).json({ status: db ? "ok" : "degraded", db: db ? "up" : "down", uptime: Math.round(process.uptime()) });
  });

  const v1 = Router();
  v1.use(globalRateLimit, originCheck, authenticate);
  v1.use(apiRoutes());
  for (const [path, router] of options.extraRoutes ?? []) v1.use(path, router);
  app.use("/api/v1", v1);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
