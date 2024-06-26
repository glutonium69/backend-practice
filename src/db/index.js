import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

export const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        console.log("mongoDB connection successfull")
    } catch (error) {
        console.log("MONGODB connection failed", error);
        process.exit(1); // this basically forces node to terminate everything that's going on
    }
}