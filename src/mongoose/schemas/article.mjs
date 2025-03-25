import mongoose from "mongoose";

const commentSchema = new mongoose.Schema({
  text: { type: String, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { _id: true });

const articleSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: "" },
  content: { type: String, required: true },
  deleted: { type: Boolean, default: false },
  authorusername: { type: String, required: true },
  authordisplayname: { type: String, required: true },
  category: { type: String, required: true },
  publishedAt: { type: Date, default: Date.now },
  views: { type: Number, default: 0 },
  upvote: { type: Number, default: 0 },
  downvote: { type: Number, default: 0 },
  userUpvote: { type: Array, default: [] },
  userDownvote: { type: Array, default: [] },
  mediaType: { type: String, enum: ["","image", "video"], default: "" },
  mediaUrl: { type: String, default: "" },
  status: { type: String, enum: ["on-going", "approved", "rejected"], default: "on-going" },
  sources: [{
    key: { type: String, enum: ["url", "video", "article", "book", "other"], default: "url" },
    value: { type: String, default: "" }
  }],
  comments: [commentSchema]
}, { timestamps: true });

export const Article = mongoose.model("article", articleSchema);

