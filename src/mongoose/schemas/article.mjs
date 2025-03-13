import mongoose from "mongoose";

const articleSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: "" },
  content: { type: String, required: true },
  authorusername: { type: String, required: true },
  authordisplayname: { type: String, required: true },
  category: { type: String, required: true },
  publishedAt: { type: Date, default: Date.now },
  views: { type: Number, default: 0 },
  likes: { type: Number, default: 0 },
  mediaType: { type: String, enum: ["","image", "video"], default: "" },
  mediaUrl: { type: String, default: "" },
  status: { type: String, enum: ["on-going", "approved", "rejected"], default: "on-going" },
  sources: [{
    key: { type: String, enum: ["url", "video", "article", "book", "other"], default: "url" },
    value: { type: String, default: "" }
  }]
}, { timestamps: true });

export const Article = mongoose.model("article", articleSchema);

