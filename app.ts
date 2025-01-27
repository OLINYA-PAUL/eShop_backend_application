// Environment Configuration
require("dotenv").config();

// Imports
import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { globalErrorMiddleWare } from "./middleware/error";
import user from "./controller/user";

// Initialize Express App
const app = express();

// Middlewares
app.use(cookieParser());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

const allowedOrigins = ["http://localhost:3000", "http://localhost:3001"];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
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
app.use("/api/v1/user", user); // Modularizing user routes

// Home Route
app.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: `You are on the home page`,
  });
});

// 404 Route Handler
app.get("*", (req: Request, res: Response) => {
  console.log(`404 error at: ${req.originalUrl}`);
  res.status(404).json({
    error: true,
    errorMessage: `The origin you searched (${req.originalUrl}) does not exist.`,
  });
});

// Error Handling Middleware
app.use(globalErrorMiddleWare);

// Export App
export default app;
