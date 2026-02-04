import { describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import { requestId } from "@/middleware/request-id.js";

function createResponse() {
  return {
    setHeader: vi.fn()
  } as unknown as Response;
}

describe("request id middleware", () => {
  it("reuses an incoming request id", () => {
    const req = {
      header: vi.fn().mockReturnValue("client-request-id")
    } as unknown as Request;
    const res = createResponse();
    const next = vi.fn();

    requestId(req, res, next);

    expect(req.requestId).toBe("client-request-id");
    expect(res.setHeader).toHaveBeenCalledWith("x-request-id", "client-request-id");
    expect(next).toHaveBeenCalledOnce();
  });

  it("creates a request id when the client does not send one", () => {
    const req = {
      header: vi.fn().mockReturnValue(undefined)
    } as unknown as Request;
    const res = createResponse();
    const next = vi.fn();

    requestId(req, res, next);

    expect(req.requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
    expect(next).toHaveBeenCalledOnce();
  });
});
