import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Playlist } from "../models/playlist.model.js";

export const createPlaylist = asyncHandler(async (req, res) => {
    const { name, description } = req.body;

    if(!name || !description){
        throw new ApiError(400, "Missing required fields: name and description");
    }

    const createdPlaylist = await Playlist.create({
        name,
        description,
        owner: req?.user?._id
    });

    const playlist = await Playlist.findById(createdPlaylist?._id);

    if(!playlist){
        throw new ApiError(500, "Failed to create playlist");
    }

    return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Playlist creation successfull"))
})