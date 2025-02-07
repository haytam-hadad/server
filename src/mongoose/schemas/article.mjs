import mongoose from "mongoose";

const articleSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  author: { type: String, required: true },
  category: { type: String, required: true },
  publishedAt: { type: Date, required: true }, // Ensure it's treated as a Date
  imageUrl: { type: String, default: null },  // Add imageUrl (optional, default null)
}, { timestamps: true });

export const Article = mongoose.model("article",articleSchema);