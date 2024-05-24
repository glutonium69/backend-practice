import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { createPlaylist, getUserPlaylists } from "../controllers/playlist.controller.js";

export const playlistRouter = Router();

playlistRouter.route("/createPlaylist").post(verifyJWT, createPlaylist);
playlistRouter.route("/:userId").get(verifyJWT, getUserPlaylists);