import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Playlist } from "../models/playlist.model.js";
import mongoose, { isValidObjectId } from "mongoose";

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

export const getUserPlaylists = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    if(!isValidObjectId(userId)){
        throw new ApiError(400, "Invalid user ID");
    }

    const playlists = await Playlist.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            },
        },
        {
            $lookup: {
                from: "videos",
                localField: "playlistVideos",
                foreignField: "_id",
                as: "playlistVideos",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        username: 1,
                                        fullname: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
    .status(200)
    .json(new ApiResponse(200, playlists[0].playlistVideos, "User playlistts fetched successfully"));
})