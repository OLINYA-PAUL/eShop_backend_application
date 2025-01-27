import { IUser } from "../model/user";
import { Response, NextFunction } from "express";
import errorHandler from "./errorHandler";

interface ITokenCookieOptions {
  expires: Date;
  httpOnly: boolean;
  maxAge?: number;
  sameSite: "lax" | "strict" | "none";
  secure?: boolean;
}

export const sendToken = async (
  user: IUser,
  statusCode: number,
  res: Response,
  next: NextFunction,
  rememberMe?: boolean
) => {
  try {
    const token = user.getJwtToken();
    const rememberMeToken = user.rememberMeJwtToken();

    if (!token) return next(new errorHandler("No token found!", 404));

    const { password, ...arg } = user.toObject();

    const normalTokenExpiresInMs = 1 * 24 * 60 * 60 * 1000; // 1 day
    const rememberMeTokenExpiresInMs = 7 * 24 * 60 * 60 * 1000; // 7 days

    const normalTokenOptions: ITokenCookieOptions = {
      expires: new Date(Date.now() + normalTokenExpiresInMs),
      maxAge: normalTokenExpiresInMs,
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "lax" : "strict",
      secure: process.env.NODE_ENV === "production" ? true : false,
    };

    const rememberMeTokenOptions: ITokenCookieOptions = {
      expires: new Date(Date.now() + rememberMeTokenExpiresInMs),
      maxAge: rememberMeTokenExpiresInMs,
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "lax" : "strict",
      secure: process.env.NODE_ENV === "production" ? true : false,
    };

    if (rememberMe) {
      return res
        .status(statusCode)
        .cookie("token", rememberMeToken, rememberMeTokenOptions)
        .json({
          success: true,
          arg,
          rememberMe: true,
          message: "Login successful",
        });
    } else {
      return res
        .status(statusCode)
        .cookie("token", token, normalTokenOptions)
        .json({
          success: true,
          arg,
          rememberMe: false,
          message: "Login successful",
        });
    }
  } catch (error: any) {
    // Handle unexpected errors
    next(new errorHandler(error.message, 500));
  }
};
