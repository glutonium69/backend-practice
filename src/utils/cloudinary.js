import dotenv from "dotenv";
dotenv.config();

import {v2 as cloudinary} from 'cloudinary';
import fs from 'fs';
          
// import {v2 as cloudinary} from 'cloudinary';

cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET 
});

export const uploadFileOnCloudinary = async (localFilePath) => {
    try {
        if(!localFilePath) return null;

        const response = await cloudinary.uploader.upload(localFilePath, { resource_type: "auto" });
        fs.unlinkSync(localFilePath);
        return response;
    } catch (error) {
        fs.unlinkSync(localFilePath);
        console.log(error);
        return null;
    }
}

export const deleteFromCloudinary = async (publicId, resourceType) => {
    try {
        await cloudinary.api.delete_resources(publicId, { resource_type: resourceType });
        return true;
    } catch (error) {
        console.log(error);
        return false
    }
}