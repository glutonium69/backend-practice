import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { createPlaylist, getPlaylistById } from "../controllers/playlist.controller.js";

export const playlistRouter = Router();

playlistRouter.route("/create").post(verifyJWT, createPlaylist);
playlistRouter.route("/:playlistId").get(verifyJWT, getPlaylistById);