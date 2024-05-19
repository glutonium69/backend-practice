import { Router } from "express";
import { registerUser } from "../controllers/user.controller.js";

export const userRouter = Router();

userRouter.route("/register").post(registerUser);