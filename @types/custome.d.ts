import { Request } from "express";
import { IUser } from "../model/user";

declare global {
  namespace Epress {
    interface Request {
      user?: IUser;
    }
  }
}
