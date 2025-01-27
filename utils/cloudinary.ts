require("dotenv").config();

import { v2 as cloudinary } from "cloudinary";

export const cloudinaryConfig = () =>
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "div69fetk",
    api_key: process.env.CLOUDINARY_CLOUD_API_KEY || "727262571821366",
    api_secret:
      process.env.CLOUDINARY_CLOUD_SECRET || "vCqhV19S0D5vpA74PrCuKVeZtSA",
  });
