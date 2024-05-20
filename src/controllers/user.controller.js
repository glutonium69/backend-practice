import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { uploadFileOnCloudinary } from "../utils/cloudinary.js";


const generateAccessAndRefreshToken = async(userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken; 

        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };

    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating access and refresh token");
    }
}

export const registerUser = asyncHandler(async (req, res) => {
    const {username, fullname, email, password} = req.body;

    if([username, fullname, email, password].some(field => field?.trim() === "")){
        throw new ApiError(400, "Please fillup all the requied fills")
    }

    const registeredUser = await User.findOne({
        $or: [{ username }, { email }]
    });

    if(registeredUser){
        throw new ApiError(409, "User with username or email already exists");
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath = undefined;

    if(req.files && req.files.coverImage && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is required");
    }

    const uploadAvatar = await uploadFileOnCloudinary(avatarLocalPath);
    const uploadCoverImage = await uploadFileOnCloudinary(coverImageLocalPath);

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
    const { username, email, password } = req.body;

    if([username, email, password].some(field => field?.trim() === "")){
        throw new ApiError(400, "Please fillup all the requied fields");
    }

    const registeredUser = await User.findOne({
        $or: [{ username }, { email }]
    });

    if(!registeredUser){
        throw new ApiError(404, "User not found");
    }

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