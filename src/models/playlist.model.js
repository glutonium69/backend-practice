import mongoose, { Schema } from "mongoose";

const playListSchema = new Schema(
	{
		name: {
			type: String,
			required: true
		},
		description: {
			type: String,
			required: true
		},
		owner: {
			type: mongoose.Types.ObjectId,
			ref: "User"
		},
		videos: [
			{
				type: mongoose.Types.ObjectId,
				ref: "Video"
			}
		]
	},
	{
		timestamps: true
	}
);

export const PlayList = mongoose.model("Playlist", playListSchema);