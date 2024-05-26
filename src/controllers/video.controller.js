import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadFileOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";


export const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query

    return res
    .status(200)
})

export const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description = "" } = req.body;
    const { visibility = "public" } = req.query;

    if (!title || title.trim() === "") {
        throw new ApiError(400, "Title is required");
    }

    if (visibility !== "public" && visibility !== "private") {
        throw new ApiError(400, "Invalid visibility option. Available options: public, private");
    }

    const videoFilePath = req.files?.videoFile[0]?.path;
    const thumbnailFilePath = req.files?.thumbnail[0]?.path;

    if (!videoFilePath || !thumbnailFilePath) {
        throw new ApiError(400, "Video and thumbnail are required");
    }

    const videoFileType = req.files?.videoFile[0]?.mimetype;
    const thumbnailFileType = req.files?.thumbnail[0]?.mimetype;

    if (!videoFileType.startsWith("video")) {
        throw new ApiError(400, "Provided video file is not type video");
    }

    if (!thumbnailFileType.startsWith("image")) {
        throw new ApiError(400, "Provided image file is not type image");
    }

    const uploadedVideo = await uploadFileOnCloudinary(videoFilePath);
    const uploadedThumbnail = await uploadFileOnCloudinary(thumbnailFilePath);

    if (!uploadedVideo || !uploadedThumbnail) {
        await deleteFromCloudinary(uploadedThumbnail.public_id, "image");
        await deleteFromCloudinary(uploadedVideo.public_id, "video");
        throw new ApiError(500, "Video upload failed");
    }

    const video = await Video.create({
        videoFile: uploadedVideo.url,
        thumbnail: uploadedThumbnail.url,
        title: title.trim(),
        description: description.trim(),
        duration: uploadedVideo.duration.toFixed(2),
        isPublic: visibility === "public",
        owner: req.user?._id
    });

    if (!video) {
        throw new ApiError(500, "Video creation failed");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, video, "Video created successfully"))
})

export const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    return res
    .status(200)
})

export const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    return res
    .status(200)
})

export const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    return res
    .status(200)
})

export const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    return res
    .status(200)
})