import { Router } from "express";
import { getUserInfo, loginUser, logoutUser, registerUser, requestAccessToken, updateAccDetails, updateAvatar, updateCoverImage, updatePassword } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

export const userRouter = Router();

userRouter.route("/register").post(
    upload.fields([ // upload() is a middleware given by multer. this lets us easily access files from req object which oterwise isnt possible 
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser
);

userRouter.route("/login").post(loginUser);

// secured route

// the verifyJWT is a custom middleware that uses access token from saved cookie to check if user is logged in
userRouter.route("/logout").post(verifyJWT, logoutUser);

userRouter.route("/refreshToken").post(requestAccessToken);

userRouter.route("/updatePassword").post(verifyJWT, updatePassword);

userRouter.route("/getUserInfo").get(verifyJWT, getUserInfo);

userRouter.route("/updateAccDetails").post(verifyJWT, updateAccDetails);


userRouter.route("/updateAvatar").post(
    verifyJWT,
    upload.fields(
        [{ 
            name: "avatar",
            maxCount: 1
        }]),
    updateAvatar
);

userRouter.route("/updateCoverImage").post(
    verifyJWT,
    upload.fields(
        [{ 
            name: "coverImage",
            maxCount: 1
        }]),
    updateCoverImage
);