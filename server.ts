// Environment Configuration
require("dotenv").config();

import { connectDbUrl } from "./DB/DB";
import app from "./app";
import { cloudinaryConfig } from "./utils/cloudinary";

process.on("uncaughtException", (err: any) => {
  console.log(err.message);
  console.log("Shutting down the server to handle uncaught exception");
  process.exit(1);
});

console.log(cloudinaryConfig());
const server = app.listen(process.env.PORT, async () => {
  console.log(`Server is listening to ${process.env.PORT}`);
  try {
    if (process.env.MONGODB_URL)
      await connectDbUrl(process.env.MONGODB_URL).then((data: any) => {
        console.log(
          `Server is listening to ${process.env.PORT} - ${data?.connection.host}`
        );
      });
  } catch (error) {
    if (error instanceof Error) {
      console.log(error.message);
    } else {
      console.log("An unexpected error occurred:", error);
    }
  }
});

process.on("unhandledRejection", (err: any) => {
  console.log(`Shutting down the server for ${err.message}`);

  server.close(() => {
    process.exit(1);
  });
});
