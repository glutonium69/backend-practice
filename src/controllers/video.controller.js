import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadFileOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";


export const getAllVideos = asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 10,
        query = null,
        sortBy = "createdAt",
        sortType = "asc",
        userId
    } = req.query;

    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user id");
    }

    if (isNaN(parseInt(page)) || isNaN(parseInt(limit))) {
        throw new ApiError(400, "Invalid page or limit. Please provide valid number");
    }

    const sortByOptions = [
        "createdAt",
        "title",
        "views",
        "length"
    ];

    if (!sortByOptions.includes(sortBy)) {
        throw new ApiError(400, "Invalid sort by option. Available options: createdAt, title, views, length");
    }

    const sortTypeOptions = [
        "asc",
        "desc"
    ];

    if (!sortTypeOptions.includes(sortType)) {
        throw new ApiError(400, "Invalid sort type option. Available options: asc, desc");
    }

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
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id");
    }

    const video = await Video.findById(videoId).populate(
        "owner",
        "username fullname avatar.url"
    );

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    video.views += 1;
    await video.save({ validateBeforeSave: false });

    const isSubscribed = await Subscription.findOne({
        subscriber: req.user?._id,
        channel: video.owner._id
    });

    const subscriberCount = await Subscription.countDocuments({ cahnnel: video.owner._id });

    // Convert the owner to a plain object
    const owner = video.owner.toObject();
    owner.subscriberCount = subscriberCount;
    owner.isSubscribedTo = !!isSubscribed;

    // Return the video along with the modified owner
    const data = {
        ...video.toObject(),
        owner
    };


    return res
        .status(200)
        .json(new ApiResponse(200, data, "Video fetched successfully"));
})

export const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    if (video.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(400, "Invalid request. Request user must be owner of the video");
    }

    const {
        title = undefined,
        description = undefined,
        visibility = video.isPublic ? "public" : "private"
    } = req.body;

    const thumbnailPath = req.file?.path;

    if (!title && !description && visibility === "public" && !thumbnailPath) {
        throw new ApiError(400, "No changes made");
    }

    const thumbnailFileType = req.file?.mimetype;

    if (thumbnailFileType && !thumbnailFileType.startsWith("image")) {
        throw new ApiError(400, "Thumbnail file must be an image file");
    }

    if (!["public", "private"].includes(visibility)) {
        throw new ApiError(400, "Invalid visibility option. Available options: public, private");
    }

    let uploadedThumbnail = undefined;

    if (thumbnailPath) {

        uploadedThumbnail = await uploadFileOnCloudinary(thumbnailPath);

        if (!uploadedThumbnail) {
            throw new ApiError(500, "Thumbnail upload failed");
        }
    }

    const updatedVideo = await Video.findByIdAndUpdate(videoId,
        {
            $set: {
                title: (title && title.trim() !== "") ? title.trim() : video.title,
                description: description ? description.trim() : video.description,
                isPublic: visibility === "public",
                thumbnail: uploadedThumbnail ? uploadedThumbnail.url : video.thumbnail
            }
        },
        { new: true }
    );

    if (updatedVideo && uploadedThumbnail) {
        // delete previous thumbnail from cloudinary if new thumbnail uploaded and video updated
        const publicId = video.thumbnail.split("/").pop().split(".")[0];
        await deleteFromCloudinary(publicId, "image");
    }
    else if (!updatedVideo && uploadedThumbnail) {
        // delete new thumbnail from cloudinary if new thumbanail uploaded but video didnt update
        await deleteFromCloudinary(uploadedThumbnail.public_id, "image");
        throw new ApiError(500, "Video update failed");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, updatedVideo, "Video updated successfully"))
})

export const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    if (video.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(400, "Invalid request. Request user must be owner of the video");
    }

    const videoFilePublicId = video.videoFile.split("/").pop().split(".")[0];
    const thumbnailFilePublicId = video.thumbnail.split("/").pop().split(".")[0];

    await deleteFromCloudinary(videoFilePublicId, "video");
    await deleteFromCloudinary(thumbnailFilePublicId, "image");

    await Video.findByIdAndDelete(videoId);

    return res
        .status(200)
        .json(new ApiResponse(200, null, "Video deleted successfully"));
})

export const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    return res
        .status(200)
})