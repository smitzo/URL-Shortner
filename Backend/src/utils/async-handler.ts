import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { ParamsDictionary, Query } from "express-serve-static-core";

export const asyncHandler =
  <
    TParams extends ParamsDictionary = ParamsDictionary,
    TResponseBody = unknown,
    TRequestBody = unknown,
    TRequestQuery extends Query = Query
  >(
    handler: (
      req: Request<TParams, TResponseBody, TRequestBody, TRequestQuery>,
      res: Response<TResponseBody>,
      next: NextFunction
    ) => Promise<unknown>
  ): RequestHandler<TParams, TResponseBody, TRequestBody, TRequestQuery> =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(
      handler(
        req as Request<TParams, TResponseBody, TRequestBody, TRequestQuery>,
        res as Response<TResponseBody>,
        next
      )
    ).catch(next);
  };
