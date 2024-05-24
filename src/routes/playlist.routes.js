import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { managePlaylistVideo, createPlaylist, deletePlaylist, getPlaylistById, getUserPlaylists, updatePlaylist } from "../controllers/playlist.controller.js";

export const playlistRouter = Router();
playlistRouter.use(verifyJWT);

playlistRouter.route("/user/:userId").get(getUserPlaylists);

playlistRouter.route("/create").post(createPlaylist);

playlistRouter.route("/:playlistId")
    .get(getPlaylistById)
    .delete(deletePlaylist)
    .patch(updatePlaylist);

playlistRouter.route("/add/:videoId/:playlistId").patch(managePlaylistVideo);