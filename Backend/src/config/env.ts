import "dotenv/config";
import { z } from "zod";

const booleanString = z
  .enum(["true", "false"])
  .transform((value) => value === "true");

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  APP_VERSION: z.string().min(1).default("1.0.0"),
  GIT_SHA: z.string().min(1).default("local"),
  PORT: z.coerce.number().int().positive().default(5000),
  API_BASE_URL: z.string().url().default("http://localhost:5000"),
  WEB_BASE_URL: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1),
  CORS_ORIGINS: z.string().default("http://localhost:3000"),
  TRUST_PROXY: booleanString.default("false"),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
  CREATE_LINK_LIMIT_MAX: z.coerce.number().int().positive().default(20),
  REDIRECT_CACHE_SECONDS: z.coerce.number().int().nonnegative().default(300),
  IP_HASH_SALT: z.string().min(16).default("development-ip-hash-salt"),
  SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000)
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = {
  ...parsed.data,
  CORS_ORIGINS: parsed.data.CORS_ORIGINS.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
};

export type Env = typeof env;
