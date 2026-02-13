import type { HelmetOptions } from "helmet";
import { env } from "@/config/env.js";

export const helmetOptions: HelmetOptions = {
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "same-site" },
  referrerPolicy: { policy: "no-referrer" },
  hsts:
    env.NODE_ENV === "production"
      ? {
          maxAge: 15_552_000,
          includeSubDomains: true,
          preload: false
        }
      : false
};
