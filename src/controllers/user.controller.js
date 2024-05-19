import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { uploadFileOnCloudinary } from "../utils/cloudinary.js";

export const registerUser = asyncHandler(async (req, res) => {
    const {username, fullname, email, password} = req.body;

    if([username, fullname, email, password].some(field => field?.trim() === "")){
        throw new ApiError(400, "Please fillup all the requied fills")
    }

    const registeredUser = User.findOne({
        $or: [{ username }, { email }]
    });

    if(registeredUser){
        throw new ApiError(409, "User with username or email already exists");
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

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