// Environment Configuration
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config({
    path: "config/.env",
  });
}

// Imports
import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { globalErrorMiddleWare } from "./middleware/error";
import fileUpload from "express-fileupload";

// Initialize Express App
const app = express();

// Middlewares
app.use(cookieParser());
app.use(express.json({ limit: "50mb" }));
app.use(fileUpload({ useTempFiles: true }));
app.use(express.urlencoded({ extended: true }));

let allowedOrigins = ["http://localhost:3000", "http://localhost:3001"];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins?.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Authorization", "Content-Type"],
    credentials: true,
    maxAge: 3600,
    optionsSuccessStatus: 204,
  })
);

// Routes
app.get("/test", (req: Request, res: Response) => {
  res.status(200).json({ success: true, message: "User created successfully" });
});

// app.use("/api/v1");

//Home

app.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    Success: true,
    Message: `$ You are on home page: Your IP address ${req.ips}`,
  });
});

// 404 Route Handler
app.get("*", (req: Request, res: Response) => {
  res.status(404).json({
    error: false,
    errorMessage: `The origin you searched (${req.originalUrl}) does not exsit.`,
  });
});

// Error Handling Middleware
app.use(globalErrorMiddleWare);

// Export App
export default app;
