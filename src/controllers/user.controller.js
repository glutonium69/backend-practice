import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { uploadFileOnCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";


const generateAccessAndRefreshToken = async(userId) => {
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
    const {username, fullname, email, password} = req.body;

    // check if all required data are given
    if([username, fullname, email, password].some(field => field?.trim() === "")){
        throw new ApiError(400, "Please fillup all the requied fills")
    }

    // check if a user already exists with the given username and email and throw error if yes
    const registeredUser = await User.findOne({
        $or: [{ username }, { email }]
    });

    if(registeredUser){
        throw new ApiError(409, "User with username or email already exists");
    }

    // extract the avatar and cover image path on which it is saved in disk
    const avatarLocalPath = req.files?.avatar[0]?.path;

    let coverImageLocalPath = undefined;

    if(req.files && req.files.coverImage && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is required");
    }

    // upload files in cloudinary
    const uploadAvatar = await uploadFileOnCloudinary(avatarLocalPath);
    const uploadCoverImage = await uploadFileOnCloudinary(coverImageLocalPath);

    // throw error if avatar upload fails
    if(!uploadAvatar){
        throw new ApiError(400, "Avatar upload failiure");
    }

    const user = await User.create({
        username: username.toLowerCase(),
        fullname,
        email,
        password,
        avatar: uploadAvatar.url,
        coverImage: uploadCoverImage?.url || ""
    });

    const createdUser = await User.findById(user._id)?.select(
        "-password -refreshToken"
    );

    if(!createdUser){
        throw new ApiError(500, "User registration failure");
    }

    return res.status(201).json(new ApiResponse(200, createdUser, "User registration successfull"))
})

export const loginUser = asyncHandler(async (req, res) => {
    // extract data from req body
    const { username, email, password } = req.body;

    // check if username+email or password is empty. if both empty then throw error
    if((!username && !email) || !password){
        throw new ApiError(400, "Please fillup all the requied fields");
    }

    // check is there is such user with the user or email. if not then send error
    const registeredUser = await User.findOne({
        $or: [{ username }, { email }]
    });

    if(!registeredUser){
        throw new ApiError(404, "User not found");
    }

    // check if password is correct or not
    const isPassCorrect = await registeredUser.comparePassword(password);

    if(!isPassCorrect){
        throw new ApiError(400, "Incorrect password");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(registeredUser._id);

    const loggedUser = await User.findById(registeredUser._id).select(
        "-password -refreshToken"
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
        $set: { refreshToken: undefined }
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

    if(!incomingRefreshToken){
        throw new ApiError(401, "Unauthorized request");
    }

    const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);

    const user = await User.findById(decodedToken?._id);

    if(!user){
        throw new ApiError(401, "Invalid refresh token");
    }

    if(incomingRefreshToken !== user?.refreshToken){
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

    if(!oldPassword || !newPassword){
        throw new ApiError(400, "Please provide both old and new password");
    }

    const user = await User.findById(req?.user?._id);

    if(!user){
        throw new ApiError(404, "Something went wrong. User not found");
    }

    const isPasswordCorrect = await user.comparePassword(oldPassword);

    if(!isPasswordCorrect){
        throw new ApiError(400, "Incorrect password");
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res
    .status(200)
    .json(new ApiResponse(200, null, "Password successfully updated"));
})

export const getUserInfo = asyncHandler(async (req, res) => {
    const userInfo = req?.user;

    if(!userInfo){
        throw new ApiError(404, "Something went wrong. User not found");
    }

    return res
    .status(200)
    .json(new ApiResponse(200, userInfo))
})

export const updateAccDetails = asyncHandler(async (req, res) => {
    const { fullname } = req.body;

    if(!fullname){
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
    ).select("-password -refreshToken");

    return res
    .status(200)
    .json(new ApiResponse(200, updatedUserInfo, "Account details successfully updated"));
})

export const updateAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.files?.avatar[0]?.path;

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar is required");
    }

    const uploadAvatar = await uploadFileOnCloudinary(avatarLocalPath);

    if(!uploadAvatar?.url){
        throw new ApiError(400, "Avatar upload failiure");
    }

    const updatedUserAvatar = await User.findByIdAndUpdate(
        req?.user?._id,
        {
            $set: { avatar: uploadAvatar.url }
        },
        {
            new: true
        }
    ).select("avatar");

    return res
    .status(200)
    .json(new ApiResponse(200, { avatar: updatedUserAvatar }, "Avatar successfully updated"));
})

export const updateCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    if(!coverImageLocalPath){
        throw new ApiError(400, "Cover image is required");
    }

    const uploadCoverImage = await uploadFileOnCloudinary(coverImageLocalPath);

    if(!uploadCoverImage?.url){
        throw new ApiError(400, "Cover image upload failiure");
    }

    const updatedUserCoverImage = await User.findByIdAndUpdate(
        req?.user?._id,
        {
            $set: { coverImage: uploadCoverImage.url }
        },
        {
            new: true
        }
    ).select("coverImage");

    return res
    .status(200)
    .json(new ApiResponse(200, { coverImage: updatedUserCoverImage }, "Cover image successfully updated"));
})