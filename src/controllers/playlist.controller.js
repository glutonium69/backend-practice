import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Playlist } from "../models/playlist.model.js";
import mongoose, { isValidObjectId } from "mongoose";

export const createPlaylist = asyncHandler(async (req, res) => {
    const { name, description } = req.body;

    if(!name || name.trim() === ""){
        throw new ApiError(400, "Missing required fields: name");
    }

    const createdPlaylist = await Playlist.create({
        name: name?.trim(),
        description: description ? description?.trim() : "",
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

export const getPlaylistById = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;

    if(!isValidObjectId(playlistId)){
        throw new ApiError(400, "Invalid playlist ID");
    }

    const playlist = await Playlist.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(playlistId)
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
    .json(new ApiResponse(200, playlist, "User playlist fetched successfully"));
})

export const getUserPlaylists = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    if(!isValidObjectId(userId)){
        throw new ApiError(400, "Invalid user ID");
    }

    const playlists = await Playlist.find({ owner: userId }).select("-playlistVideos");

    if(!playlists){
        throw new ApiError(400, "Playlists fetch failed");
    }

    return res
    .status(200)
    .json(new ApiResponse(200, playlists, "User playlists fetched successfully"));
})

export const deletePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;

    if(!isValidObjectId(playlistId)){
        throw new ApiError(400, "Invalid playlist ID");
    }

    const response = await Playlist.findByIdAndDelete(playlistId);

    if(!response){
        throw new ApiError(400, "Playlist deletion failed");
    }

    return res
    .status(200)
    .json(new ApiResponse(200, null, "Playlist deleted successfully"));
})

export const updatePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;

    if(!isValidObjectId(playlistId)){
        throw new ApiError(400, "Invalid playlist ID");
    }

    const { name, description } = req.body;

    if(!name || name.trim() === ""){
        throw new ApiError(400, "Missing required field: name")
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(playlistId, {
        $set: {
            name: name?.trim(),
            description: description ? description?.trim() : ""
        }
    }, { new: true })

    const playlist = await Playlist.findById(updatedPlaylist?._id).select("-playlistVideos");

    if(!playlist){
        throw new ApiError(500, "Playlist update failed");
    }

    return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Playlist updated successfully"));
})