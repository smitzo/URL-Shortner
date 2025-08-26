import type { Response } from "express";

export type SuccessMeta = Record<string, unknown>;

export function sendSuccess<TData>(
  res: Response,
  data: TData,
  options: { status?: number; meta?: SuccessMeta } = {}
) {
  const body = options.meta ? { data, meta: options.meta } : { data };
  return res.status(options.status ?? 200).json(body);
}
