process.env.NODE_ENV = "test";
process.env.PORT = "5000";
process.env.API_BASE_URL = "http://localhost:5000";
process.env.WEB_BASE_URL = "http://localhost:3000";
process.env.DATABASE_URL =
  process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/url_shortner_test";
process.env.CORS_ORIGINS = "http://localhost:3000";
process.env.TRUST_PROXY = "false";
process.env.RATE_LIMIT_WINDOW_MS = "60000";
process.env.RATE_LIMIT_MAX = "1000";
process.env.CREATE_LINK_LIMIT_MAX = "1000";
process.env.REDIRECT_CACHE_SECONDS = "0";
