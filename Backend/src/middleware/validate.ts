import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";

type RequestPart = "body" | "params" | "query";

export function validateRequest<TSchema extends ZodSchema>(
  part: RequestPart,
  schema: TSchema
) {
  return (req: Request, _res: Response, next: NextFunction) => {
    req[part] = schema.parse(req[part]);
    next();
  };
}
