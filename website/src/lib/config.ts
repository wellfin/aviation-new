import "server-only";
import { z } from "zod";

/**
 * Server-side environment configuration.
 * Every third-party integration is selected here; the default for each is "mock"
 * so the frontend works without any keys. See .env.example for documentation.
 */
const schema = z.object({
  DATA_SOURCE: z.enum(["mock", "api"]).default("mock"),
  API_BASE_URL: z.string().url().default("http://localhost:4000"),

  WEATHER_PROVIDER: z.enum(["mock", "aviationweather", "checkwx"]).default("mock"),
  CHECKWX_API_KEY: z.string().optional(),

  NOTAM_PROVIDER: z.enum(["mock", "faa-search", "faa"]).default("mock"),
  FAA_NOTAM_CLIENT_ID: z.string().optional(),
  FAA_NOTAM_CLIENT_SECRET: z.string().optional(),

  AIRPORT_DATA_PROVIDER: z.enum(["mock", "airportdb", "openaip"]).default("mock"),
  AIRPORTDB_API_TOKEN: z.string().optional(),
  /** OpenAIP core API key (https://www.openaip.net → account → API clients). */
  OPENAIP_API_KEY: z.string().optional(),

  INTEGRATION_TIMEOUT_MS: z.coerce.number().int().positive().default(8000),

  /** Shared secret identifying this server to the API (SSR traffic isn't rate-limited as one visitor). */
  INTERNAL_API_KEY: z.string().min(32).optional(),
});

export type ServerConfig = z.infer<typeof schema>;

function load(): ServerConfig {
  // Treat empty strings in .env as "unset" so defaults apply.
  const raw = Object.fromEntries(
    Object.entries(process.env).filter(([, v]) => v !== undefined && v !== ""),
  );
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid environment configuration: ${issues}`);
  }
  return parsed.data;
}

export const config = load();
