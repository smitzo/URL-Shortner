import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

export function requestId(req: Request, res: Response, next: NextFunction) {
  const existingId = req.header("x-request-id");
  const id = existingId?.trim() || randomUUID();

  req.requestId = id;
  res.setHeader("x-request-id", id);
  next();
}
