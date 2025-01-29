import mongoose, { Schema, Document } from "mongoose";

interface IPasswordReset extends Document {
  userId: string;
  activationCode: string;
  expiresAt: number; // timestamp
}

const passwordResetSchema = new Schema<IPasswordReset>({
  userId: { type: String, required: true, ref: "User" },
  activationCode: { type: String, required: true },
  expiresAt: { type: Number, required: true },
});

export const PasswordReset = mongoose.model<IPasswordReset>(
  "PasswordReset",
  passwordResetSchema
);
