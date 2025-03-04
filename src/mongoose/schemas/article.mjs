import mongoose from "mongoose";

const articleSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  authorusername: { type: String, required: true },
  authordisplayname: { type: String, required: true },
  category: { type: String, required: true },
  publishedAt: { type: Date, default: Date.now },
  views: { type: Number, default: 0 },
  likes: { type: Number, default: 0 },
  imageUrl: { type: String, default: "" },
  status: { type: String, enum: ["on-going", "approved", "rejected"], default: "on-going" },
  source: {
    kind: { type: String, enum: ["video", "article", "book", "other"], default: "other" },
    url: { type: String, default: "" }
  }
}, { timestamps: true });

export const Article = mongoose.model("article",articleSchema);

