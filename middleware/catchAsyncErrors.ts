import { Request, Response, NextFunction } from "express";
export const catchAsyncErroMiddleWare =
  (errorFunction: any) => (req: Request, res: Response, next: NextFunction) => {
    return Promise.resolve(errorFunction(req, res, next)).catch((err) =>
      next(err)
    );
  };
