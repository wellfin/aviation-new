import { z } from "zod";

/**
 * All configuration comes from the environment and is validated once at boot.
 * The process refuses to start with missing or weak secrets in production.
 */
const bool = z
  .enum(["true", "false", "1", "0"])
  .transform((v) => v === "true" || v === "1");

const csv = z.string().transform((s) =>
  s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean),
);

const schema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(4000),
    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
    TRUST_PROXY: z.coerce.number().int().min(0).default(0),

    MONGODB_URI: z.string().min(1).default("mongodb://127.0.0.1:27018/global_aviation?replicaSet=rs0"),

    /** Browser origins allowed to call the API with credentials. */
    CORS_ORIGINS: csv.default(["http://localhost:3100"]),
    /** Public URL of the frontend (links in emails, OAuth redirects). */
    FRONTEND_URL: z.string().url().default("http://localhost:3100"),
    /** Public URL of this API (OAuth callback URLs, uploaded file URLs). */
    PUBLIC_API_URL: z.string().url().default("http://localhost:4000"),

    JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET must be at least 32 characters"),
    JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().positive().default(15 * 60),
    REFRESH_TTL_DAYS: z.coerce.number().int().positive().default(30),
    /** Refresh lifetime when "remember me" is not ticked (cookie is session-only). */
    REFRESH_SHORT_TTL_HOURS: z.coerce.number().int().positive().default(24),
    COOKIE_DOMAIN: z.string().optional(),
    COOKIE_SECURE: bool.optional(),

    OTP_TTL_MINUTES: z.coerce.number().int().positive().default(10),
    OTP_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
    LOGIN_MAX_FAILED_ATTEMPTS: z.coerce.number().int().positive().default(8),
    LOGIN_LOCK_MINUTES: z.coerce.number().int().positive().default(15),

    /** "log" writes emails to .mail-outbox/ (dev); "smtp" sends via SMTP_*. */
    MAIL_TRANSPORT: z.enum(["log", "smtp"]).default("log"),
    MAIL_FROM: z.string().default("Global Aviation <no-reply@globalaviation.local>"),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().int().positive().optional(),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    SMTP_SECURE: bool.optional(),

    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    LINKEDIN_CLIENT_ID: z.string().optional(),
    LINKEDIN_CLIENT_SECRET: z.string().optional(),

    RAZORPAY_KEY_ID: z.string().optional(),
    RAZORPAY_KEY_SECRET: z.string().optional(),
    RAZORPAY_WEBHOOK_SECRET: z.string().optional(),

    UPLOAD_DIR: z.string().default("uploads"),
    UPLOAD_MAX_IMAGE_MB: z.coerce.number().positive().default(5),
    UPLOAD_MAX_DOCUMENT_MB: z.coerce.number().positive().default(15),

    RATE_LIMIT_WINDOW_MINUTES: z.coerce.number().int().positive().default(15),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(600),
    AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(30),
    SESSION_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
    OTP_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(30),
    /** Shared secret the website's server sends so SSR traffic isn't limited as one visitor. */
    INTERNAL_API_KEY: z.string().min(32, "INTERNAL_API_KEY must be at least 32 characters").optional(),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === "production") {
      if (env.JWT_ACCESS_SECRET.length < 48 || /change[-_ ]?me|secret|example/i.test(env.JWT_ACCESS_SECRET)) {
        ctx.addIssue({ code: "custom", path: ["JWT_ACCESS_SECRET"], message: "Use a strong random secret (48+ chars) in production" });
      }
      if (env.MAIL_TRANSPORT !== "smtp") ctx.addIssue({ code: "custom", path: ["MAIL_TRANSPORT"], message: "Production must send real email (smtp)" });
    }
    if (env.MAIL_TRANSPORT === "smtp" && !env.SMTP_HOST) {
      ctx.addIssue({ code: "custom", path: ["SMTP_HOST"], message: "SMTP_HOST is required when MAIL_TRANSPORT=smtp" });
    }
  });

export type Env = z.infer<typeof schema>;

function load(): Env {
  const raw = Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== undefined && v !== ""));
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}

export const env = load();
export const isProduction = env.NODE_ENV === "production";
export const isTest = env.NODE_ENV === "test";
export const cookieSecure = env.COOKIE_SECURE ?? isProduction;
