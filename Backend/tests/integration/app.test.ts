import { describe, expect, it } from "vitest";
import { createApp } from "@/app.js";

describe("express app wiring", () => {
  it("hardens express defaults for production", () => {
    const app = createApp();

    expect(app.enabled("x-powered-by")).toBe(false);
    expect(app.get("trust proxy")).toBe(false);
  });
});
