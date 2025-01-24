import express, { NextFunction, Request, Response } from "express";
import { catchAsyncErroMiddleWare } from "../middleware/catchAsyncErrors";
import errorHandler from "../utils/errorHandler";
import User from "../model/user";
import cloudinary from "cloudinary";
import jwt from "jsonwebtoken";
const router = express.Router();
import { IUser } from "../model/user";
import { sendMail } from "../utils/sendMail";

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
      const { name, email, password, avatar } = req.body;

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

      console.log({ dtaaaa: data });

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
        message: "Please check your email to activate your account",
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

      const { name, email, password, avatar } = newUser.user;

      const userEmail = await User.findOne({ email });
      if (userEmail) return next(new errorHandler("User already exists", 400));

      const user = await User.create({ name, email, password, avatar });

      res.status(201).json({
        success: true,
        message: "Account activated successfully",
        user,
      });
    }
  )
);

export default router;
