import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { createPlaylist, getPlaylistById, getUserPlaylists } from "../controllers/playlist.controller.js";

export const playlistRouter = Router();

playlistRouter.route("/urser/:userId").get(verifyJWT, getUserPlaylists);
playlistRouter.route("/create").post(verifyJWT, createPlaylist);
playlistRouter.route("/:playlistId").get(verifyJWT, getPlaylistById);