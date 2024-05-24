import dotenv from "dotenv";
dotenv.config();

import { connectDB } from "./db/index.js";
import { app } from "./app.js";


connectDB()
    .then(() => {

        app.on("error", err => {
            console.log("Express app error: ", err);
            throw err;
        })


        app.listen(process.env.PORT || 8000, () => {
            console.log("Server running on port: " + process.env.PORT || 8000);
        })
    })
    .catch(err => console.log("MongoDB connection error:", err))