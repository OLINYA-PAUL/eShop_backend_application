import mongoose from "mongoose";

export const connectDbUrl = async (url: string) => {
  try {
    return await mongoose.connect(url, {
      serverSelectionTimeoutMS: 8000,
    });
  } catch (error) {
    // Check if error is an instance of Error
    if (error instanceof Error) {
      console.log(error.message);
    } else {
      setTimeout(() => {
        console.log("An unexpected error occurred:", error);
      }, 5000);
    }
  }
};
