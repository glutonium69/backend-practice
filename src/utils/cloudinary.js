import {v2 as cloudinary} from 'cloudinary';
import fs from 'fs';
          
// import {v2 as cloudinary} from 'cloudinary';
          
cloudinary.config({ 
  cloud_name: 'dbybseb5j', 
  api_key: '674546684588157', 
  api_secret: '_gqKzAfRn0L4PSux0fJXfWvyvm4' 
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