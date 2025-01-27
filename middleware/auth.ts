// @ts-nocheck

import { NextFunction, Request, Response } from "express";
import { catchAsyncErroMiddleWare } from "./catchAsyncErrors";
import errorHandler from "../utils/errorHandler";
import JWT from "jsonwebtoken";
import User from "../model/user";

export const isAuthenticated = catchAsyncErroMiddleWare(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const accessToken = req.cookies.token;

      console.log("USER TOKEN", accessToken);
      console.log("Request Headers:", req.headers);
      console.log("Cookies:", req.cookies);

      if (!accessToken) {
        return next(new errorHandler("Please login to continue", 401));
      }

      const decoded: any = JWT.verify(
        accessToken,
        process.env.JWT_SECRET_KEY as string
      );

      const user = await User.findById(decoded.id || decoded._id);
      if (!user) {
        return next(new errorHandler("User not found", 404));
      }

      req.user = user;

      next();
    } catch (error: any) {
      return next(new errorHandler(error.message, 400));
    }
  }
);
