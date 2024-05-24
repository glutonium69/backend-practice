import mongoose, { Schema } from "mongoose";

const playlistSchema = new Schema(
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
		playlistVideos: [
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

export const Playlist = mongoose.model("Playlist", playlistSchema);