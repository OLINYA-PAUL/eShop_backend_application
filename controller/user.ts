require("dotenv").config();

import express, { NextFunction, Request, Response } from "express";
import { catchAsyncErroMiddleWare } from "../middleware/catchAsyncErrors";
import errorHandler from "../utils/errorHandler";
import User from "../model/user";
import cloudinary from "cloudinary";
import jwt from "jsonwebtoken";
const router = express.Router();
import { IUser } from "../model/user";
import { sendMail } from "../utils/sendMail";
import EJS from "ejs";
import path from "path";
import { sendToken } from "../utils/jwtToken";
import { isAuthenticated } from "../middleware/auth";

interface CreateUserRequestBody {
  name: string;
  email: string;
  password: string;
  avatar: any;
}

// Create User Route
router.post(
  "/create-user",
  catchAsyncErroMiddleWare(
    async (
      req: Request<{}, {}, CreateUserRequestBody>,
      res: Response,
      next: NextFunction
    ) => {
      const { name, email, password, avatar } =
        req.body as CreateUserRequestBody;

      const userEmail = await User.findOne({ email });
      if (userEmail) return next(new errorHandler("User already exists", 400));

      const userAvatar = await cloudinary.v2.uploader.upload(avatar, {
        folder: "avatars",
      });

      const user = {
        name,
        email,
        password,
        avatar: {
          public_id: userAvatar.public_id,
          url: userAvatar.secure_url,
        },
      };

      const activationUrlToken = createUserActivationToken(user);
      const activationUrl = `http://localhost:8000/activation/${activationUrlToken}`;

      // const data = { user, activationUrl };

      const data = { user: { ...user, name, email, avatar }, activationUrl };

      console.log("USER NAME", data.user.name);

      await EJS.renderFile(
        path.join(__dirname, "../mails/activation-mail.ejs"),
        data
      );

      try {
        await sendMail({
          email,
          subject: "Activate your account",
          template: "activation-mail.ejs",
          data,
        });
      } catch (error: any) {
        return next(new errorHandler(error.message, 400));
      }

      res.status(201).json({
        success: true,
        message: "Check your email to activate your account.",
        activationUrl,
      });
    }
  )
);

// Create Activation Token
const createUserActivationToken = (user: any) => {
  return jwt.sign({ user }, process.env.ACTIVATION_SECRET as string, {
    expiresIn: "5m",
  });
};

// Activation Route
router.post(
  "/activation",
  catchAsyncErroMiddleWare(
    async (req: Request, res: Response, next: NextFunction) => {
      const { activation_token } = req.body as { activation_token: string };

      if (!activation_token)
        return next(new errorHandler("Token not found", 400));

      const newUser: { user: IUser } = jwt.verify(
        activation_token,
        process.env.ACTIVATION_SECRET as string
      ) as { user: IUser };

      if (!newUser) return next(new errorHandler("Invalid token", 400));

      const { name, email, password, avatar } = newUser.user;

      const userEmail = await User.findOne({ email });
      if (userEmail) return next(new errorHandler("User already exists", 400));

      const user = await User.create({ name, email, password, avatar });

      sendToken(user, 200, res, next);

      res.status(201).json({
        success: true,
        message: "Account activated successfully Pls login",
        user,
      });
    }
  )
);

//login user

router.post(
  "/login-user",
  catchAsyncErroMiddleWare(
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        let { email, password, rememberMe } = req.body as {
          email: string;
          password: string;
          rememberMe: true | false;
        };

        if (!email || !password)
          return next(
            new errorHandler("Please provide email and password", 400)
          );

        const user = await User.findOne({ email }).select("+password");

        if (!user) return next(new errorHandler("Invalid credentials", 400));

        const isPasswordMatched = await user.comparePassword(password);

        if (!isPasswordMatched)
          return next(new errorHandler("Invalid credentials", 400));

        await sendToken(user, 200, res, next, rememberMe);
      } catch (error: any) {
        return next(new errorHandler(error.message, 400));
      }
    }
  )
);

router.post(
  "/request-password-reset",
  isAuthenticated,
  catchAsyncErroMiddleWare(
    async (req: Request, res: Response, next: NextFunction) => {
      const { email } = req.body;

      // Find user by email
      const user = await User.findOne({ email });
      if (!user) return next(new errorHandler("User not found", 400));

      // Generate reset token
      const resetToken = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET_KEY as string,
        { expiresIn: "1h" }
      );

      // Send reset email with token link
      const resetLink = `http://localhost:8000/reset-password/${resetToken}`;
      const data = { resetLink };

      await EJS.renderFile(
        path.join(__dirname, "../mails/reset-password-mail.ejs"),
        data
      );
      try {
        await sendMail({
          email,
          subject: "Password Reset Request",
          template: "reset-password-mail.ejs",
          data,
        });
      } catch (error: any) {
        return next(new errorHandler(error.message, 400));
      }

      res.status(200).json({
        success: true,
        message: "Password reset link sent to your email.",
      });
    }
  )
);

router.post(
  "/reset-password",
  isAuthenticated,
  catchAsyncErroMiddleWare(
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { token, newPassword } = req.body;

        // Validate input
        if (!token || !newPassword) {
          return next(
            new errorHandler("Token and new password are required", 400)
          );
        }

        // Verify the reset token
        const decoded: any = jwt.verify(
          token,
          process.env.JWT_SECRET_KEY as string
        );

        // Ensure decoded contains the userId and use it to find the user

        if (!decoded.userId) {
          return next(new errorHandler("Invalid token", 400));
        }

        // Find the user by ID
        const user = await User.findById(decoded.userId);
        if (!user) {
          return next(new errorHandler("User not found", 400));
        }

        // Check if the new password is the same as the old one
        // const isSamePassword = await user.comparePassword(newPassword);
        if (newPassword === user.password) {
          return next(
            new errorHandler(
              "New password cannot be the same as the old one",
              400
            )
          );
        }

        // Update the password
        user.password = newPassword;
        await user.save();

        // Send token and success response
        sendToken(user, 200, res, next);

        res.status(200).json({
          success: true,
          message: "Password reset successfully",
        });
      } catch (err: any) {
        console.log(err);
        return next(new errorHandler(err.message, 400));
      }
    }
  )
);

export default router;
