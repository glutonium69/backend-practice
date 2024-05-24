import express from "express";
export const app = express();

import cors from "cors";
import cookieParser from "cookie-parser";

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true // this is so we can transmit cookies between client and server
}));

// These are middlewares
// A middleware is basically a function that is executed in the middle of a certain operation
app.use(express.json({ limit: "16kb" })); // this will parse json strings that we recieve from the frontend
app.use(express.urlencoded({ extended: true, limit: "16kb" })); // this will parse urlencoded strings for us to easily use. now a url encoded string is basically the key value pair we see in url that are separated by a & 
app.use(express.static("public"));
app.use(cookieParser()); // this lets us work with cookies like sending and receving cookies

// router must be imported after the middlewares are set / (in use)
import { userRouter } from "./routes/user.routes.js";
import { playlistRouter } from "./routes/playlist.routes.js";

// /ai/v1/ will be our root url
app.use("/api/v1/user", userRouter);
app.use("/api/v1/playlist", playlistRouter);