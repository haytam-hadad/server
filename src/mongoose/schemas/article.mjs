import mongoose from "mongoose";

const articleSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Reference to User
  category: { type: String, required: true },
  publishedAt: { type: Date, default: Date.now },
  views: { type: Number, default: 0 },
  likes: { type: Number, default: 0 },
  imageUrl: { type: String, required: true },
  status: { type: String, enum: ["on-going", "approved", "rejected"], default: "on-going" },
  source: {
      type: { type: String, enum: ["video", "article", "book", "other"], required: true },
      url: { type: String, required: true }
  }
}, { timestamps: true });

export const Article = mongoose.model("article",articleSchema);
