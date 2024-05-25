import mongoose, { isValidObjectId } from "mongoose"
import { Comment } from "../models/comment.model.js"
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

export const getVideoComments = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { page = 1, limit = 2 } = req.query;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Invalid video id");
    }

    const pipeLine = [
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId)
            }
        },
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
                            avatar: {
                                url: 1
                            },
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
        },
        {
            $sort: {
                createdAt: 1
            }
        }
    ];

    const commentsPaginated = await Comment.aggregatePaginate(Comment.aggregate(pipeLine), {
        page: parseInt(page),
        limit: parseInt(limit)
    })

    if (!commentsPaginated) {
        throw new ApiError("500", "Comments fetch failure");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, commentsPaginated, "Comments fetched"))
})

export const addComment = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Invalid video id");
    }

    const { content } = req.body;

    if (!content) {
        throw new ApiError(400, "Content is required");
    }

    const comment = await Comment.create({
        content,
        owner: req.user?._id,
        video: videoId
    })

    if (!comment) {
        throw new ApiError(500, "Comment creation failure");
    }

    return res.status(200).json(new ApiResponse(200, comment, "Comment created"))
})

export const updateComment = asyncHandler(async (req, res) => {

})

export const deleteComment = asyncHandler(async (req, res) => {

})