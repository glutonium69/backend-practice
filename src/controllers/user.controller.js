import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { deleteFromCloudinary, uploadFileOnCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";


const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;

        // Skip schema validation before saving the document to the database
        // Useful when the data has already been validated or for handling partial updates
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };

    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating access and refresh token");
    }
}

export const registerUser = asyncHandler(async (req, res) => {
    // extract data from req body
    const { username, fullname, email, password } = req.body;

    // check if all required data are given
    if ([username, fullname, email, password].some(field => field?.trim() === "")) {
        throw new ApiError(400, "Please fillup all the requied fills")
    }

    // check if a user already exists with the given username and email and throw error if yes
    const registeredUser = await User.findOne({
        $or: [{ username }, { email }]
    });

    if (registeredUser) {
        throw new ApiError(409, "User with username or email already exists");
    }

    // extract the avatar and cover image path on which it is saved in disk
    const avatarLocalPath = req.files?.avatar[0]?.path;

    let coverImageLocalPath = undefined;

    if (req.files && req.files.coverImage && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required");
    }

    // upload files in cloudinary
    const uploadAvatar = await uploadFileOnCloudinary(avatarLocalPath);
    const uploadCoverImage = await uploadFileOnCloudinary(coverImageLocalPath);

    // throw error if avatar upload fails
    if (!uploadAvatar) {
        throw new ApiError(400, "Avatar upload failiure");
    }

    // const user = await User.create({
    //     username: username.toLowerCase(),
    //     fullname,
    //     email,
    //     password,
    //     avatar: {
    //         publicId: uploadAvatar?.public_id,
    //         url: uploadAvatar?.url
    //     },
    //     coverImage: uploadCoverImage ? {
    //         publicId: uploadCoverImage?.public_id,
    //         url: uploadCoverImage?.url
    //     } : {
    //         publicId: "",
    //         url: ""
    //     }
    // });

    const userData = {
        username: username.toLowerCase(),
        fullname,
        email,
        password,
        avatar: {
            publicId: uploadAvatar?.public_id,
            url: uploadAvatar?.url
        }
    };

    if (uploadCoverImage) {
        userData.coverImage = {
            publicId: uploadCoverImage.public_id,
            url: uploadCoverImage.url
        };
    }

    const user = await User.create(userData);


    const createdUser = await User.findById(user._id)?.select(
        "-password -refreshToken -avatar.publicId -coverImage.publicId"
    );

    if (!createdUser) {
        throw new ApiError(500, "User registration failure");
    }

    return res.status(201).json(new ApiResponse(200, createdUser, "User registration successfull"))
})

export const loginUser = asyncHandler(async (req, res) => {
    // extract data from req body
    const { username, email, password } = req.body;

    // check if username+email or password is empty. if both empty then throw error
    if ((!username && !email) || !password) {
        throw new ApiError(400, "Please fillup all the requied fields");
    }

    // check is there is such user with the user or email. if not then send error
    const registeredUser = await User.findOne({
        $or: [{ username }, { email }]
    });

    if (!registeredUser) {
        throw new ApiError(404, "User not found");
    }

    // check if password is correct or not
    const isPassCorrect = await registeredUser.comparePassword(password);

    if (!isPassCorrect) {
        throw new ApiError(400, "Incorrect password");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(registeredUser._id);

    const loggedUser = await User.findById(registeredUser._id).select(
        "-password -refreshToken -avatar.publicId -coverImage.publicId"
    );

    const cookieOptions = {
        httpOnly: true,
        secure: true
    };

    return res
        .status(200)
        .cookie("accessToken", accessToken, cookieOptions)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedUser,
                    accessToken,
                    refreshToken
                },
                "User login successfull"
            )
        )
})

export const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(req.user._id, {
        $unset: { refreshToken: 1 }
    });

    const cookieOptions = {
        httpOnly: true,
        secure: true
    };

    return res
        .status(200)
        .clearCookie("accessToken", cookieOptions)
        .clearCookie("refreshToken", cookieOptions)
        .json(new ApiResponse(200, null, "User logout successfull"))
})

export const requestAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized request");
    }

    const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);

    const user = await User.findById(decodedToken?._id);

    if (!user) {
        throw new ApiError(401, "Invalid refresh token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
        throw new ApiError(401, "Refresh token expired or used");
    }

    const cookieOptions = {
        httpOnly: true,
        secure: true
    };

    const { accessToken: newAccessToken, refreshToken: newRefreshToken } = await generateAccessAndRefreshToken(user._id);

    return res
        .status(200)
        .cookie("accessToken", newAccessToken, cookieOptions)
        .cookie("refreshToken", newRefreshToken, cookieOptions)
        .json(new ApiResponse(200, { newAccessToken, newRefreshToken }, "Refresh token generation successfull"));
})

export const updatePassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
        throw new ApiError(400, "Please provide both old and new password");
    }

    const user = await User.findById(req?.user?._id);

    if (!user) {
        throw new ApiError(404, "Something went wrong. User not found");
    }

    const isPasswordCorrect = await user.comparePassword(oldPassword);

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Incorrect password");
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res
        .status(200)
        .json(new ApiResponse(200, null, "Password successfully updated"));
})

// this is when the owner will open their profile
export const getUserInfo = asyncHandler(async (req, res) => {
    const userInfo = req?.user;

    if (!userInfo) {
        throw new ApiError(404, "Something went wrong. User not found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, userInfo))
})

export const updateAccDetails = asyncHandler(async (req, res) => {
    const { fullname } = req.body;

    if (!fullname) {
        throw new ApiError(400, "Please provide fullname");
    }

    const updatedUserInfo = await User.findByIdAndUpdate(
        req?.user?._id,
        {
            $set: { fullname }
        },
        {
            new: true
        }
    ).select("-password -refreshToken -avatar.publicId -coverImage.publicId");

    return res
        .status(200)
        .json(new ApiResponse(200, updatedUserInfo, "Account details successfully updated"));
})

export const updateAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar is required");
    }

    const user = await User.findById(req?.user?._id).select("avatar.publicId");

    const deleteAvatar = await deleteFromCloudinary(user.avatar.publicId, "image");

    if (!deleteAvatar) {
        throw new ApiError(400, "Previous avatar deletion failiure. Please try again");
    }
    const uploadAvatar = await uploadFileOnCloudinary(avatarLocalPath);

    if (!uploadAvatar?.url) {
        throw new ApiError(400, "Avatar upload failiure");
    }

    const updatedUserAvatar = await User.findByIdAndUpdate(
        req?.user?._id,
        {
            $set: {
                avatar: {
                    publicId: uploadAvatar?.public_id,
                    url: uploadAvatar?.url
                }
            }
        },
        {
            new: true
        }
    ).select("avatar.url");

    return res
        .status(200)
        .json(new ApiResponse(200, { avatar: updatedUserAvatar }, "Avatar successfully updated"));
})

export const updateCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path;

    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover image is required");
    }

    const user = await User.findById(req?.user?._id).select("coverImage.publicId");

    const deleteCoverImage = await deleteFromCloudinary(user.coverImage.publicId, "image");

    if (!deleteCoverImage) {
        throw new ApiError(400, "Previous cover image deletion failiure. Please try again");
    }

    const uploadCoverImage = await uploadFileOnCloudinary(coverImageLocalPath);

    if (!uploadCoverImage?.url) {
        throw new ApiError(400, "Cover image upload failiure");
    }

    const updatedUserCoverImage = await User.findByIdAndUpdate(
        req?.user?._id,
        {
            $set: {
                coverImage: {
                    publicId: uploadCoverImage?.public_id,
                    url: uploadCoverImage?.url
                }
            }
        },
        {
            new: true
        }
    ).select("coverImage.url");

    return res
        .status(200)
        .json(new ApiResponse(200, { coverImage: updatedUserCoverImage }, "Cover image successfully updated"));
})

// this is when a user will visit a channels profile
export const getChannelInfo = asyncHandler(async (req, res) => {
    const { username } = req.params;

    if (!username?.trim()) {
        throw new ApiError(400, "Username is required");
    }

    const channelInfo = await User.aggregate([
        {
            $match: {
                username: username.toLowerCase().trim()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscriberCount: {
                    $size: "$subscribers"
                },
                subscribedCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: { $in: ["req?.user?._id", "$subscribers.subscriber"] },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                username: 1,
                fullname: 1,
                email: 1,
                avatar: {
                    url: 1
                },
                coverImage: {
                    url: 1
                },
                subscriberCount: 1,
                subscribedCount: 1,
                isSubscribed: 1
            }
        }
    ])

    if (!channelInfo?.length) {
        throw new ApiError(404, "Channel info not found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, channelInfo[0], "Channel profile data fetched succesfully"));
})

export const getWatchHistory = asyncHandler(async (req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req?.user?.id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
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
        .json(new ApiResponse(200, user[0].watchHistory, "Watch history fetched successfully"))
})