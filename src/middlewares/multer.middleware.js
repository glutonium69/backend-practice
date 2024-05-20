import multer from "multer";

// when user uploads a file. before we upload it to cloudinary. we are keeping it in our server disk for short perioud of time cause we need to provide cloudinary the local path of the file
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "./public/temp");
    },
    filename: function (_, file, cb) {
        cb(null, file.originalname);
    }
})

export const upload = multer({ storage: storage })