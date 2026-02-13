import compression from "compression";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { env } from "@/config/env.js";
import { corsOptions } from "@/config/http.js";
import { helmetOptions } from "@/config/security.js";
import { errorHandler } from "@/middleware/error-handler.js";
import { notFound } from "@/middleware/not-found.js";
import { apiRateLimit } from "@/middleware/rate-limit.js";
import { requestId } from "@/middleware/request-id.js";
import { logger } from "@/lib/logger.js";
import { router } from "@/routes/index.js";

export function createApp() {
  const app = express();

  app.set("trust proxy", env.TRUST_PROXY);
  app.disable("x-powered-by");

  app.use(requestId);
  app.use(
    pinoHttp({
      logger,
      autoLogging: env.NODE_ENV !== "test"
    })
  );
  app.use(helmet(helmetOptions));
  app.use(cors(corsOptions));
  app.use(compression());
  app.use(express.json({ limit: "64kb" }));
  app.use(express.urlencoded({ extended: false }));

  app.use("/api", apiRateLimit);
  app.use(router);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
