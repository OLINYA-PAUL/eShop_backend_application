require("dotenv").config();

import express, { NextFunction, Request, Response } from "express";
import { catchAsyncErroMiddleWare } from "../middleware/catchAsyncErrors";
import errorHandler from "../utils/errorHandler";
import User from "../model/user";
import cloudinary from "cloudinary";
import jwt, { Secret } from "jsonwebtoken";
const router = express.Router();
import { IUser } from "../model/user";
import { sendMail } from "../utils/sendMail";
import EJS from "ejs";
import path from "path";
import { sendToken } from "../utils/jwtToken";
import { isAuthenticated } from "../middleware/auth";
import { PasswordReset } from "../DB/passwordReset";

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
  catchAsyncErroMiddleWare(
    async (req: Request, res: Response, next: NextFunction) => {
      const { email } = req.body;

      // Find user by email
      const user = await User.findOne({ email });
      if (!user) return next(new errorHandler("User not found", 400));

      // Generate a new activation code (simple random number for now)
      const activationCode = Math.floor(1000 + Math.random() * 9000).toString();

      // Set expiration time (e.g., 1 hour)
      const expiresAt = Date.now() + 3600000; // 1 hour expiration

      // Store the activation code and expiration time in PasswordReset model
      await PasswordReset.create({
        userId: user._id,
        activationCode,
        expiresAt,
      });

      // Send email with the activation code (could use a template)
      const data = { activationCode };
      await sendMail({
        email,
        subject: "Password Reset Request",
        template: "reset-password-mail.ejs", // Template you use to send the email
        data,
      });

      res.status(200).json({
        success: true,
        message: "OTP sent to your email.",
      });
    }
  )
);

// router.post(
//   "/request-password-reset",
//   isAuthenticated,
//   catchAsyncErroMiddleWare(
//     async (req: Request, res: Response, next: NextFunction) => {
//       const { email } = req.body;

//       // Find user by email
//       const user = await User.findOne({ email });
//       if (!user) return next(new errorHandler("User not found", 400));
//       // Generate reset token

//       const { token, activationCode: resetLink } = createActivationToken(user);

//       const data = { resetLink };

//       await EJS.renderFile(
//         path.join(__dirname, "../mails/reset-password-mail.ejs"),
//         data
//       );
//       try {
//         await sendMail({
//           email,
//           subject: "Password Reset Request",
//           template: "reset-password-mail.ejs",
//           data,
//         });
//       } catch (error: any) {
//         return next(new errorHandler(error.message, 400));
//       }

//       res.status(200).json({
//         success: true,
//         message: "OTP sent to your email.",
//         token,
//       });
//     }
//   )
// );

// interface activationToken {
//   token: string;
//   activationCode: string;
// }

// const createActivationToken = (user: any): activationToken => {
//   const activationCode = Math.floor(1000 + Math.random() * 9000).toString();

//   const token = jwt.sign(
//     { userId: user?._id, activationCode },
//     process.env.JWT_SECRET_KEY as Secret,
//     { expiresIn: "1h" }
//   );

//   return { token, activationCode };
// };

// router.post(
//   "/reset-password",
//   isAuthenticated,
//   catchAsyncErroMiddleWare(
//     async (req: Request, res: Response, next: NextFunction) => {
//       try {
//         const { tokenActivationCode, newPassword } = req.body as {
//           tokenActivationCode: string;
//           newPassword: string;
//         };

//         if (!tokenActivationCode || !newPassword) {
//           return next(
//             new errorHandler("Token and new password are required", 400)
//           );
//         }

//         console.log(" Token sent drom fronend:", tokenActivationCode);

//         // Verify the reset token using the correct secret key
//         const decoded: { userId: string; activationCode: string } = jwt.verify(
//           tokenActivationCode,
//           process.env.JWT_SECRET_KEY as string
//         ) as { userId: string; activationCode: string };

//         if (tokenActivationCode !== decoded.activationCode) {
//           return next(
//             new errorHandler("invalide activation code entered", 400)
//           ); // Catch and forward email sending error
//         }

//         console.log("Decoded Token:", decoded);
//         if (!decoded.userId) {
//           return next(new errorHandler("Invalid token", 400));
//         }

//         // Find the user by ID
//         const user = await User.findById(decoded.userId);
//         if (!user) {
//           return next(new errorHandler("User not found", 400));
//         }

//         if (newPassword === user.password) {
//           return next(
//             new errorHandler(
//               "New password cannot be the same as the old one",
//               400
//             )
//           );
//         }

//         // Update the password
//         user.password = newPassword;
//         await user.save();

//         res.status(200).json({
//           success: true,
//           message: "Password reset successfully",
//         });
//       } catch (err: any) {
//         console.log(err);
//         return next(new errorHandler(err.message, 400));
//       }
//     }
//   )
// );

router.post(
  "/reset-password",
  isAuthenticated,
  catchAsyncErroMiddleWare(
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { OTP, newPassword } = req.body as {
          OTP: string;
          newPassword: string;
        };

        if (!OTP || !newPassword) {
          return next(
            new errorHandler(
              "Activation code and new password are required",
              400
            )
          );
        }

        console.log("Token sent from frontend:", OTP);

        const resetRecord = await PasswordReset.findOne({
          activationCode: OTP,
        });

        if (!resetRecord) {
          return next(
            new errorHandler("Invalid or expired activation code", 400)
          );
        }

        if (Date.now() > resetRecord.expiresAt) {
          return next(new errorHandler("Activation code has expired", 400));
        }

        const user = await User.findById(resetRecord.userId);
        if (!user) {
          return next(new errorHandler("User not found", 400));
        }

        if (newPassword === user.password) {
          return next(
            new errorHandler(
              "New password cannot be the same as the old one",
              400
            )
          );
        }

        user.password = newPassword;
        await user.save();

        await PasswordReset.deleteOne({ _id: resetRecord._id });

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
