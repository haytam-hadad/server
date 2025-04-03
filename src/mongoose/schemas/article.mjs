import mongoose from "mongoose";

const commentSchema = new mongoose.Schema({
  text: { type: String, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { _id: true });

const savedArticleSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  articleId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'article' },
  savedAt: { type: Date, default: Date.now }
}, { timestamps: true });

const articleSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: "" },
  content: { type: String, required: true },
  deleted: { type: Boolean, default: false , index: true},
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User'},
  authorIdGoogle: { type: mongoose.Schema.Types.ObjectId, ref: 'Googleuser'},
  authorusername: { type: String, required: true },
  category: { type: String, required: true },
  publishedAt: { type: Date, default: Date.now },
  rating : { type: Number, default: 0 },
  lastRatingUpdate: { type: Date, default: Date.now },
  views: { type: Number, default: 0 },
  upvote: { type: Number, default: 0 },
  downvote: { type: Number, default: 0 },
  userUpvote: { type: Array, default: [] , index: true},
  userDownvote: { type: Array, default: [] , index: true},
  mediaType: { type: String, enum: ["","image", "video"], default: "" },
  mediaUrl: { type: String, default: "" },
  status: { type: String, enum: ["on-going", "approved", "rejected"], default: "on-going" },
  sources: [{
    key: { type: String, enum: ["url", "video", "article", "book", "other"], default: "url" },
    value: { type: String, default: "" }
  }],
  comments: [commentSchema],
  saved: [savedArticleSchema]
}, { timestamps: true });

export const Article = mongoose.model("article", articleSchema);

