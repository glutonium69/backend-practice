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
    const { title, description } = req.body
    return res
    .status(200)
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