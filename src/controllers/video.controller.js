import mongoose, { isValidObjectId } from "mongoose"
import { Video } from "../models/video.model.js"
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { uploadFileOnCloudinary } from "../utils/cloudinary.js"


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

    const videoFile = req.files?.videoFile[0]?.path;
    const thumbnailFile = req.files?.thumbnail[0]?.path;

    if (!videoFile || !thumbnailFile) {
        throw new ApiError(400, "Video and thumbnail are required");
    }

    const uploadedVideo = await uploadFileOnCloudinary(videoFile);

    if (!updateVideo) {
        throw new ApiError(500, "Video upload failed");
    }

    if (uploadedVideo.resource_type !== "video") {
        await deleteFromCloudinary(uploadedVideo.public_id);
        throw new ApiError(400, "Video file is not a video");
    }

    const uploadedThumbnail = await uploadFileOnCloudinary(thumbnailFile);

    if (!uploadedThumbnail) {
        throw new ApiError(500, "Thumbnail upload failed");
    }

    if (uploadedThumbnail.resource_type !== "image") {
        await deleteFromCloudinary(uploadedThumbnail.public_id);
        throw new ApiError(400, "Thumbnail file is not an image");
    }

    const video = await new Video.create({
        videoFile: uploadedVideo.playback_url,
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